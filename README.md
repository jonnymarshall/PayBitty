# Paybitty

Bitcoin-enabled invoicing for freelancers and small businesses.

---

## How payment detection works

> **The plain-English version.** Skip to "Detailed mechanics" further down if you want code references and timing tables.

### What we're trying to do

When a payer sends Bitcoin to an invoice, the invoice's status needs to change from **Pending** → **Payment Detected** → **Paid**. That status lives in our database. Two pages care about it:

- The **payer's page** at `/invoice/[id]` — public, anyone with the link can see it.
- The **owner's pages** under `/invoices` — private, only the logged-in invoice owner.

Both pages need to update **as soon as the status changes**, no matter who triggered it.

### A few terms first

| Term | What it means here |
|------|---------------------|
| **Mempool** | The "waiting room" for Bitcoin transactions. After a wallet broadcasts a tx but before a miner confirms it, it sits in the mempool. We use [mempool.space](https://mempool.space) as our window into it. |
| **Confirmation** | A miner has put the tx into a block. 0 confirmations = "broadcast, in mempool, not yet in a block". 1+ confirmations = "in a block on the chain". |
| **WebSocket** | A long-lived connection between your browser and a server that lets the server push messages **whenever something happens**. No need for the browser to keep asking. We use one to mempool.space and one to Supabase. |
| **Polling** | The opposite of a WebSocket. The browser (or server) repeatedly asks "anything new?" on a timer. Slower and chattier than a push, but works as a fallback when sockets aren't available. |
| **Cron** | A scheduled job. Vercel runs ours every minute, in the background, with no browser involved. Think of it as a server-side alarm clock that wakes up, checks the mempool for every active invoice, and goes back to sleep. |
| **Realtime (Supabase)** | A separate WebSocket from the browser to Supabase that delivers **database changes** as they happen. Anything that updates an invoice row anywhere in the system shows up on the page within ~1 second. |

### How a payment gets noticed (the three watchers)

There are exactly **three things** that can spot an incoming payment. Faster ones first:

#### 1. The mempool socket on the payer's page (sub-second, when it works)

When a payer opens `/invoice/[id]`, the page **immediately** opens a WebSocket to mempool.space and asks it to "track this BTC address". The connection stays open for as long as the page is open.

The moment a wallet broadcasts a payment to that address, mempool.space pushes a message down the socket. The page sends "I saw it" to our API, which writes `payment_detected` to the database.

> **You do not need to click the "Pay now in Bitcoin" button for this to work.** That button only reveals the QR code; the watcher runs in the background regardless. Closing the tab stops the watcher.

#### 2. The cron sweep (system-wide every minute, but each invoice on its own schedule)

There are **two clocks** here, and it's worth keeping them straight:

- **System clock** — Vercel Cron hits `/api/cron/payment-sweep` exactly once a minute, forever, regardless of how many invoices exist. This is what "every minute, no browser needed" refers to.
- **Per-invoice clock** — each invoice has its own scheduled next check (`next_check_at`). When the system clock fires, the endpoint **only checks invoices whose own scheduled time has come up** — typically a small handful per minute, not every outstanding invoice.

Each invoice's schedule is **front-loaded**, then tapers off:

- **Right after publish, no tx in mempool yet** — checks at **+1 min, +5 min, +10 min, +30 min**, then **stops**. The invoice hibernates if nothing arrives in the first ~46 minutes.
- **Once a tx hits the mempool** — schedule speeds back up: every 10 min × 3, then every 1 h × 6, then every 4 h × 12, then every 8 h × 24, over a total window of ~11 days.
- **A confirmed tx at any point** promotes the invoice straight to **Paid** and the schedule stops.

So: the cron itself runs every minute (system-wide), but a given invoice is **not** checked every minute — most of the time it's resting between scheduled checks. This avoids hammering mempool.space and burning cron compute on invoices nobody is paying.

This is what catches payments while everyone's tabs are closed. It's slower than the mempool socket (up to ~60 s for the next cron tick + however long mempool.space takes to see the tx + the per-invoice schedule gap) but it's tireless and unattended.

#### 3. The page's REST poll (only if the socket dies)

If the mempool WebSocket drops (network hiccup, mempool.space restart), the payer's page falls back to asking mempool.space "any new txs?" every 10 seconds, doubling the gap each time it gets nothing back, capped at ~10 minutes.

This is a backup, not a primary. **Most of the time you won't see it run.**

### How the badge moves (the push to your screen)

Spotting the payment is half the job. Once the database row changes, both the payer's and the owner's open pages need to **see** the change.

That's what Supabase Realtime is for. Both pages open a Realtime WebSocket when they mount. When the database row changes — by **any** of the three mechanisms above — Realtime pushes the new row down those sockets, and the badge updates within ~1 second.

So: a single status change can take three hops (mempool socket → API → database → Realtime → badge), but most of that is sub-second. The slowest link is **whoever spotted the tx**, not the push to the screen.

### Why a payment might take 30+ seconds to show up

The most common reason is **the mempool socket didn't catch it**, so you're waiting for the cron's 1-minute tick to find it instead. That happens when:

- The mempool socket connected but mempool.space hadn't yet seen the broadcast tx when the page asked. This is genuinely common — propagation takes 5–30 s.
- The mempool socket disconnected and the REST fallback hadn't been waiting long enough.
- You're on testnet, where mempool.space is slower and less reliable than mainnet.

When this happens, the cron eventually finds it (max 60 s) → updates the database → Realtime pushes to the page → badge flips. Total: 30–90 s instead of <1 s.

### What happens when nothing is open

Just the cron, plus a tapering schedule. After publish, checks happen at +1 min, +5 min, +10 min, +30 min, then **stop** if nothing has hit the mempool — at that point we assume the payer has abandoned the invoice. As soon as a tx **does** hit the mempool, the cron speeds back up: 10 min ×3, then 1 h ×6, then 4 h ×12, then 8 h ×24, then stop after ~11 days. A confirmation at any point promotes the invoice straight to **Paid**.

### Two extras

- **"Mark as Payment Sent" button.** When a payer clicks this, the page polls mempool.space hard for 60 seconds (every 2 s, then every 3 s, then every 5 s, then every 10 s — 15 polls total) and shows a progress dialog. It's a UX polish: the payer sees confirmation right after they paid instead of waiting for the next mempool socket message. The watcher and the cron are still running underneath.
- **Visibility refresh safety net.** If you tab away for an hour and come back, the page does a quick refresh from the server in case the live socket missed anything while it was backgrounded.

---

## Detailed mechanics

For the implementation specifics — file paths, exact intervals, code references — read on. The plain-English section above is enough to use and debug the system.

### Summary table

| Scenario                                                           | Active mechanism                         | Frequency                                     | Time-to-detect (typical)     |
|--------------------------------------------------------------------|------------------------------------------|-----------------------------------------------|------------------------------|
| (A) Payer on `/invoice/[id]`, has **not** clicked "Payment Sent"   | Mempool WebSocket (+ polling fallback)   | Real-time push; fallback 10s → doubles → ~10m | < 1 second (push)            |
| (B) Payer on `/invoice/[id]`, **clicks** "Mark as Payment Sent"    | Tiered active polling for 60 seconds     | 5×2s + 5×3s + 3×5s + 2×10s = 15 polls in 60s  | 2–10 seconds                 |
| (C) Nobody has a page open                                         | Vercel Cron (background poll)            | Every minute, per-invoice back-off schedule   | 1–30 minutes pre-mempool; 10 min – 8 h post-mempool |
| (D) Owner on `/invoices` or `/invoices/[id]`                       | Supabase Realtime subscription           | Pushed as soon as any other path updates DB   | < 1 second after DB update   |
| (E) Payer on public `/invoice/[id]`                                | Supabase Realtime subscription (anon)    | Pushed as soon as any other path updates DB   | < 1 second after DB update   |

(A), (B), (C) are detection paths — they spot the on-chain payment. (D), (E) are display paths — they push the resulting database change to whatever page is open.

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

### (E) Payer live updates

File: `src/app/invoice/[id]/use-public-invoice-realtime.ts`

- Subscribes to Supabase Realtime UPDATE events on the `invoices` row matching the public page's id, using the **anon** key (the payer is unauthenticated).
- Migration `0009_anon_select_for_realtime.sql` adds an anon SELECT policy on non-draft invoices so Realtime delivers events under RLS. Draft invoices remain owner-only.
- The hook surfaces `payload.new` to the page, which applies the next status to local React state — so the badge moves without a `router.refresh()` (which would re-run the server fetch and clobber other in-flight UI state).
- `visibilitychange` → `router.refresh()` is the safety net for silent socket drops.
- The on-page mempool watcher (path A) is still the fastest source for transactions hitting the watched address; this Realtime path is the catch-all for cron-driven (path C) and owner-driven (e.g. mark-as-paid) transitions the watcher can't see.

---

## Publishing and sending an invoice

Publishing an invoice (creating its public URL) is **decoupled** from sending it via email. The owner picks how delivery should happen via a single split-button menu on the invoice detail page and the `/invoices` per-row dropdown.

Three columns on `invoices` capture delivery state without polluting the payment-status enum (which stays focused on `pending → payment_detected → paid`):

- `sent_at` — non-null once the invoice has been "delivered" (manually or via successful email).
- `send_method` — `'email'` or `'manual'`; non-null when `sent_at` is set.
- `email_attempted_at` — set the moment a `safeSend` for `type=invoice_published` is fired, regardless of outcome. Used to gate the "Send via email" option.

The menu shows only actions that are still useful for the invoice's current state:

| State | Trigger | Menu options |
|---|---|---|
| Draft | **Publish** | Send via email · Download and mark as sent · Mark as sent · Publish only |
| Published-only (`sent_at` NULL) | **Send** | Send via email · Download and mark as sent · Mark as sent |
| Manually-marked-sent (`sent_at` set, `email_attempted_at` NULL) | **Send** | Send via email *(only)* |
| Email attempted but failed (`email_attempted_at` set, `sent_at` NULL) | **Send** | Send via email *(disabled)* · Download and mark as sent · Mark as sent |
| Successfully delivered via email | (hidden) | — |
| Manually sent + email attempted | (hidden) | — |
| Archived | (hidden) | — |

Notes:
- Once `email_attempted_at` is set, "Send via email" is permanently disabled with a tooltip — re-attempts would hit the same `client_email`, which is currently immutable post-publish.
- After a manual mark-as-sent the manual options ("Mark as sent", "Download and mark as sent") drop out because they are no-ops; the existing **Download PDF** button on the detail page / row dropdown handles that affordance.
- The `Send` trigger disappears entirely once *every* path is a no-op (delivered via email, OR marked-sent + email-attempted).

Three server actions back the menu (`src/app/(dashboard)/invoices/actions.ts`):

- `publishInvoice(id)` — publish only, no delivery side-effect.
- `publishAndSendEmail(id)` — publish + fire `invoice-published` email; returns `{ emailStatus }` so the UI can show success/failure.
- `publishAndMarkSent(id, { withDownload? })` — publish + record manual delivery. With `withDownload: true`, returns `{ downloadUrl }` so the client triggers the existing `/api/invoices/[id]/pdf` route.

---

## Email notifications

All transactional email goes through **Resend** via `src/lib/email/send.ts`. There are three email types, three triggers, and two recipient types.

> **Supabase auth emails (magic-link, signup confirmation, password reset) also route through Resend** via Supabase's custom SMTP setting (dashboard → Project Settings → Auth → SMTP Settings, pointing at `smtp.resend.com:465`). The custom SMTP **Sender** is set to `team@mail.satsend.me` — the same address `EMAIL_FROM` uses for transactional mail — so all SatSend mail (auth + invoicing) arrives with one consistent `From:` identity. Both auth email *and* transactional email depend on the Resend account / domain being healthy.

### Triggers, senders, recipients

| # | Email                 | Fires when…                                     | Callsite (server)                                        | Recipients                          |
|---|-----------------------|-------------------------------------------------|----------------------------------------------------------|-------------------------------------|
| 1 | **Invoice published** | Owner picks "Send now via email" from the publish/send menu | `src/app/(dashboard)/invoices/actions.ts` → `publishAndSendEmail` | Payer (`client_email`)              |
| 2 | **Payment detected**  | Status transitions → `payment_detected`         | `src/app/api/invoices/[id]/payment-status/route.ts` **or** `src/app/api/cron/payment-sweep/route.ts` | Invoice owner **and** payer (`client_email`) |
| 3 | **Payment confirmed** | Status transitions → `paid`                     | Same two callsites as above                              | Invoice owner **and** payer (`client_email`) |

Notes:
- The **payment-detected** and **payment-confirmed** emails are dispatched to **both** recipients per transition: the owner gets an "your client paid invoice X" framing, and the payer gets a "your payment to {sender} has been detected / confirmed" framing. Each transition fires two distinct Resend calls with role-specific templates (`payment-detected-owner.tsx` / `payment-detected-payer.tsx`, and the same split for confirmed).
- The owner email is resolved via `supabase.auth.admin.getUserById(invoice.user_id)`; the payer email is the invoice's `client_email`.
- If `client_email` is blank on an invoice (payer email is optional), every payer-side send is silently skipped — including the invoice-published email and both payment-status emails. The owner copy still goes out.
- Each email contains the invoice reference, a mempool.space link to the tx, and a link back to the right surface for that recipient (owner → dashboard view, payer → public invoice page).

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

### Email event log

Every send attempt is recorded in the `email_events` table (migration `0010_email_events.sql`):

| Column            | Meaning                                                                  |
|-------------------|--------------------------------------------------------------------------|
| `email_type`      | `invoice_published` / `payment_detected` / `payment_confirmed`           |
| `recipient`       | The address Resend was asked to send to                                  |
| `status`          | `queued` → terminal `sent` / `failed` / `skipped_no_api_key`             |
| `resend_message_id` | Populated on `sent` from Resend's response — useful for cross-referencing the dashboard |
| `error_message`   | First 500 chars of the failure reason (Resend error or thrown exception) |
| `created_at` / `updated_at` | Timestamps for the row insert and its terminal-status update    |

`safeSend` (`src/lib/email/send.ts`) inserts a `queued` row before each Resend call, then flips the row to its terminal status when the send returns or throws. Both the insert and the update are best-effort: a failed DB write logs and continues so a broken `email_events` table never blocks a publish or a payment transition.

The table is owner-scoped via RLS (`auth.uid() = user_id`) and surfaces on `/invoices/[id]` as the **Email activity** card so the owner can answer *"did the payer get the link?"* or *"why didn't I get a confirmation email?"* without leaving the app.

### What is *still not* tracked

The `email_events` row records what happened at our end (we asked Resend, Resend acknowledged or rejected). It does not yet record what happened on the recipient's end:

- **Delivered / bounced / complained / opened / clicked** — these are emitted by Resend as webhooks. A future version would expose `POST /api/webhooks/resend` and update rows by `resend_message_id`. For now, that detail lives in the Resend dashboard.
- There is no retry queue: `failed` is terminal until someone manually triggers a resend.

---

## Schema columns that drive this

Migration `0008_background_payment_schedule.sql`:

- `next_check_at TIMESTAMPTZ` — when the cron should next process this row. `NULL` = not in the rotation.
- `mempool_seen_at TIMESTAMPTZ` — stamped the first time a paying tx is observed. Drives the pre-/post-mempool cadence branch.
- `stage_attempt INT DEFAULT 0` — counter the scheduler uses to index into the delay tables.

Partial index `invoices_next_check_at_idx` on `next_check_at WHERE next_check_at IS NOT NULL` keeps the cron's `SELECT … WHERE next_check_at <= now()` fast.
