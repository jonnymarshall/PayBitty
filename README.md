# Paybitty

Bitcoin-enabled invoicing for freelancers and small businesses.

---

## Payment detection architecture

Paybitty watches the Bitcoin mempool from **four independent paths** so that a payment is caught regardless of who has which tab open. Each path reads mempool.space, updates the same `invoices` row in Supabase, and emits the same transactional emails.

### Summary table

| Scenario                                                           | Active mechanism                         | Frequency                                     | Time-to-detect (typical)     |
|--------------------------------------------------------------------|------------------------------------------|-----------------------------------------------|------------------------------|
| (A) Payer on `/invoice/[id]`, has **not** clicked "Payment Sent"   | Mempool WebSocket (+ polling fallback)   | Real-time push; fallback 10s → doubles → ~10m | < 1 second (push)            |
| (B) Payer on `/invoice/[id]`, **clicks** "Mark as Payment Sent"    | Tiered active polling for 60 seconds     | 5×2s + 5×3s + 3×5s + 2×10s = 15 polls in 60s  | 2–10 seconds                 |
| (C) Payer closed the tab; nobody logged in on the owner side       | Vercel Cron (background poll)            | Every minute, per-invoice back-off schedule   | 1–30 minutes pre-mempool; 10 min – 8 h post-mempool |
| (D) Owner on `/invoices` or `/invoices/[id]`                       | Supabase Realtime subscription           | Pushed as soon as any other path updates DB   | < 1 second after DB update   |

> The payer's public `/invoice/[id]` page does **not** currently subscribe to Supabase Realtime. If the cron (path C) flips status while the payer is on that page, the payer's badge won't move until a refresh. This is scheduled to be fixed in **v1.4.2**.

---

### (A) Payer on the page, passive

File: `src/app/invoice/[id]/payment-watcher.tsx`

1. Opens a **WebSocket to mempool.space** and subscribes to the invoice's BTC address.
2. On a **0-conf** event (tx broadcast) → POST `/api/invoices/[id]/payment-status` with `status=payment_detected`.
3. On a **1-conf** event (first confirmation) → POST with `status=paid`.
4. Fallback: if the WebSocket disconnects, **exponential-backoff polling** starts at 10 s, doubles each failed check, and caps near 10 min.
5. The WebSocket is closed once the invoice reaches `paid`.

**Latency:** effectively instant (push). Fallback polling only kicks in if the socket dies.

---

### (B) Payer on the page, clicked "Mark as Payment Sent"

Files: `src/app/invoice/[id]/mark-sent-button.tsx` + dialog component.

Opens a dialog that **actively polls mempool.space for exactly 60 seconds** on a front-loaded schedule:

| Phase | Interval | Count  | Running total |
|-------|----------|--------|---------------|
| 1     | 2 s      | 5      | 10 s          |
| 2     | 3 s      | 5      | 25 s          |
| 3     | 5 s      | 3      | 40 s          |
| 4     | 10 s     | 2      | 60 s          |
| **Total** | —    | **15 polls** | **60 s**  |

States:
- **Polling:** progress bar + Cancel button with helper text.
- **Detected:** progress bar animates to 100 % for ~400 ms, then flips to *"Your payment has been detected"* + OK.
- **Timed out:** informational state with a link to mempool.space so the payer can self-verify.

The detected dialog also **auto-pops** on any `pending/overdue → payment_detected/paid` transition, even if the payer never clicked the button — so if the cron (path C) or the passive watcher (path A) fires while the dialog is open, the dialog still resolves with confirmation.

---

### (C) Nobody has a relevant page open

Files: `src/app/api/cron/payment-sweep/route.ts` + `src/lib/invoices/payment-schedule.ts` + `vercel.json`.

A Vercel Cron hits `/api/cron/payment-sweep` **every minute** (`* * * * *`). The endpoint:

1. Bearer-auths the incoming request against `CRON_SECRET`.
2. Fetches up to **50 invoices** where `next_check_at <= now()` AND `status IN ('pending', 'payment_detected')`.
3. For each, calls mempool.space's `GET /api/address/<addr>/txs`, then runs the pure decision function `decidePaymentSchedule(…)` which produces the next state and the next `next_check_at`.
4. Writes the decision with optimistic concurrency (`.eq('status', prior)`).
5. If the status changed, dispatches a "Payment detected" or "Payment confirmed" email via Resend.

The per-invoice schedule is **two-stage**:

**Pre-mempool** (`mempool_seen_at IS NULL` — nothing broadcast yet). After publish, checks at +1 min, +5 min, +10 min, +30 min. If still nothing by ~46 minutes total, polling stops for that invoice (the passive watcher and the fast-path API still work if the payer returns to the page).

| Attempt | Delay from previous | Elapsed since publish |
|---------|---------------------|-----------------------|
| 1       | + 1 min             | 1 min                 |
| 2       | + 5 min             | 6 min                 |
| 3       | + 10 min            | 16 min                |
| 4       | + 30 min            | 46 min                |
| —       | stop (`next_check_at = null`) | —           |

**Post-mempool** (`mempool_seen_at IS NOT NULL` — tx broadcast but not confirmed). Cadence spreads the checks over ~11 days:

| Stage | Interval | Count | Stage duration | Cumulative polls |
|-------|----------|-------|----------------|------------------|
| 1     | 10 min   | 3     | 30 min         | 3                |
| 2     | 1 h      | 6     | 6 h            | 9                |
| 3     | 4 h      | 12    | 48 h           | 21               |
| 4     | 8 h      | 24    | ~8 days        | 45               |
| —     | stop     | —     | —              | —                |

Total post-mempool window before giving up: ~11 days. Any confirmed tx seen at any point promotes the invoice straight to `paid` and `next_check_at = null`.

The fast-path route `/api/invoices/[id]/payment-status` (triggered by path A) **delegates to the same `decidePaymentSchedule` helper**, so whichever path fires first writes the same row shape — the two systems stay in lock-step.

---

### (D) Owner live updates

File: `src/app/(dashboard)/invoices/use-invoice-realtime.ts`

- Subscribes to Supabase Realtime UPDATE events on the `invoices` table for rows owned by the current user.
- Migration `0006_invoices_replica_identity_full.sql` sets `REPLICA IDENTITY FULL` so UPDATEs carry every column — essential for reliable Realtime delivery behind RLS.
- The hook explicitly calls `supabase.realtime.setAuth(access_token)` before subscribing; without this RLS silently drops events.
- `visibilitychange` → `router.refresh()` is the safety net for silent socket drops.

Works on both `/invoices` (list) and `/invoices/[id]` (detail). Any DB update from any other path (watcher, fast-path route, cron) appears on the owner's UI within ~1 second.

---

## Email notifications

All transactional email goes through **Resend** via `src/lib/email/send.ts`. There are three email types, three triggers, and two recipient types.

> **Supabase auth emails (magic-link, signup confirmation, password reset) also route through Resend** via Supabase's custom SMTP setting (dashboard → Project Settings → Auth → SMTP Settings, pointing at `smtp.resend.com:465`). This bypasses Supabase's default ~4/hour rate limit and uses the same verified `mail.satsend.me` sender domain as transactional mail. Both auth email *and* transactional email depend on the Resend account / domain being healthy.

### Triggers, senders, recipients

| # | Email                 | Fires when…                                     | Callsite (server)                                        | Recipient           |
|---|-----------------------|-------------------------------------------------|----------------------------------------------------------|---------------------|
| 1 | **Invoice published** | `publishInvoice` flips a draft → `pending`      | `src/app/(dashboard)/invoices/actions.ts` → `publishInvoice` | Payer (`client_email`) |
| 2 | **Payment detected**  | Status transitions → `payment_detected`         | `src/app/api/invoices/[id]/payment-status/route.ts` **or** `src/app/api/cron/payment-sweep/route.ts` | Invoice owner       |
| 3 | **Payment confirmed** | Status transitions → `paid`                     | Same two callsites as above                              | Invoice owner       |

Notes:
- The **invoice-published** email is the only one sent to the payer. It contains the invoice link and access code (if set). No email is sent to the payer when their payment is detected or confirmed — that information is already on the page they just paid through.
- The **payment-detected** and **payment-confirmed** emails are sent to the invoice owner (resolved via `supabase.auth.admin.getUserById(invoice.user_id)`). Each one contains the invoice reference, a link to the owner's dashboard view, and a mempool.space link to the tx.
- If `client_email` is blank on an invoice (payer email optional), the invoice-published email is silently skipped.

### How duplicates are prevented

The fast-path API (triggered by the payer's mempool WebSocket) and the background cron can both observe the same state change. Without care, both would send the same email.

Deduplication works **at the DB level, not the email level**:

```sql
UPDATE invoices
  SET status = 'payment_detected', …
  WHERE id = :id
    AND status = :priorStatus   ← optimistic concurrency guard
```

Whichever path commits the status change first wins. The loser gets `PGRST116` (0 rows affected), short-circuits, and **never reaches the email dispatch**. So a given `pending → payment_detected` transition fires exactly one "Payment detected" email regardless of how many watchers saw the tx.

The same applies to `payment_detected → paid`.

Edge case: if the pre-mempool cron finds a **confirmed** tx directly (rare — the tx hit a block before any cron tick saw it unconfirmed), it transitions `pending → paid` in a single step and sends only the **confirmed** email. No "detected" email fires because no row ever held `payment_detected`.

### How email failure is handled

Every send goes through a `safeSend` wrapper (`src/lib/email/send.ts`) that:

1. Skips silently (with a `console.warn`) if `RESEND_API_KEY` is not set — so local development without Resend still works.
2. Catches any Resend error (non-2xx, network, rate-limit) and logs it to `console.error` instead of throwing.

**A broken email provider never blocks a publish or a payment transition.** The invoice state is the source of truth; email is best-effort delivery on top of it.

### What is *not* tracked

There is currently **no database log of emails** — no `sent_at` column, no `email_deliveries` table, no idempotency token. Evidence that an email was sent lives only in:
- The Resend dashboard (per-message send history, retention per Resend plan).
- Application stdout / Vercel runtime logs at send time.

This is a known limitation. If we needed to answer *"did the payer actually receive the invoice link?"* or *"why did this owner not get a confirmation email?"* after the fact, we'd be reading Resend webhooks. A lightweight `email_events` table is a candidate for a future version.

---

## Schema columns that drive this

Migration `0008_background_payment_schedule.sql`:

- `next_check_at TIMESTAMPTZ` — when the cron should next process this row. `NULL` = not in the rotation.
- `mempool_seen_at TIMESTAMPTZ` — stamped the first time a paying tx is observed. Drives the pre-/post-mempool cadence branch.
- `stage_attempt INT DEFAULT 0` — counter the scheduler uses to index into the delay tables.

Partial index `invoices_next_check_at_idx` on `next_check_at WHERE next_check_at IS NOT NULL` keeps the cron's `SELECT … WHERE next_check_at <= now()` fast.
