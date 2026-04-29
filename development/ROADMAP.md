# Paybitty — Feature Roadmap

## Status Legend

| Emoji | Meaning |
|-------|---------|
| ✅ | Complete (merged) |
| 🔄 | In progress |
| ⏳ | Queued — not started |
| 🚫 | Deferred |

---

## v1 — MVP (Core BTC Invoicing)

> Goal: A working product a freelancer can use today. Create an invoice, share it, get paid in BTC.

---

### ✅ v1.0 — Project Foundation

**Branch:** `v1.0/foundation`

- [x] Next.js App Router project with TypeScript
- [x] Tailwind CSS + shadcn/ui dark theme configured (bg `#0A0A0A`, surface `#181818`, accent `#DE3C4B`)
- [x] Supabase project linked; `invoices` table + enums + RLS policies
- [x] Magic link auth via Supabase Auth
- [x] Auth proxy (proxy.ts, Next.js 16) protecting `/dashboard` and related routes
- [x] Basic layout: navbar, authenticated shell

**Done when:** A user can sign in via magic link and land on an empty dashboard.

---

### ✅ v1.1 — Invoice CRUD + Dashboard

**Branch:** `v1.1/invoice-crud`

- [x] Invoice creation form: client name, client email, line items, optional tax, due date, BTC address
- [x] BTC address uniqueness validation (no reuse across non-draft invoices)
- [x] Save as draft
- [x] Publish invoice: generates 8-char alphanumeric access code + shareable link
- [x] Dashboard: list all invoices with status badge (draft, pending, payment_detected, paid, overdue)
- [x] Delete draft invoice
- [x] Mark invoice as overdue (manual)

**Done when:** A freelancer can create, publish, and manage invoices from their dashboard.

---

### ✅ v1.1.1 — Invoice Form Improvements

**Branch:** `fix/invoice-form-improvements`

**Schema changes**
- [x] Add `invoice_number` (text, nullable) to invoices table
- [x] Replace `tax_fiat` with `tax_percent` (numeric, default 0) — store as %, compute fiat at save time
- [x] Add sender fields: `your_name`, `your_email`, `your_company`, `your_address`, `your_tax_id` (all text, nullable)
- [x] Add client fields: `client_company`, `client_address`, `client_tax_id` (all text, nullable)
- [x] Add `accepts_bitcoin` (boolean, default false)
- [x] Change `access_code` to be nullable and user-set (no auto-generation)
- [x] Add `btc_address` nullable when `accepts_bitcoin` is false

**Form UX**
- [x] Split form header: "YOU" (left) / "CLIENT" (right) with full sender + client fields
- [x] Invoice number field (freeform text, max 50 chars)
- [x] Tax field: percent input (%), compute fiat on save
- [x] Due date: shadcn date picker + "No due date" toggle
- [x] Quantity and unit price: freeform (empty = 0 on submit), max qty 100,000 / max unit price 1,000,000,000, 2 decimal places, no spinner arrows
- [x] "Accept Bitcoin" toggle — shows BTC address field only when enabled
- [x] Access code: user-set text field OR "No access code" toggle (no auto-generation)
- [x] Remove red asterisks from all fields
- [x] Email validation (valid format if entered, not required)

**Invoice detail page**
- [x] Mark as paid button (manual, for non-BTC or already-confirmed payments)
- [x] Edit draft button → pre-populated edit form (same as new invoice form)
- [x] Fix share link: show full URL (`http://...`), add copy button with copied feedback
- [x] Fix route: `/invoice/[id]` public route stub (placeholder until v1.2)

**Done when:** All form feedback addressed, draft editing works, share link copies correctly.

---

### ✅ v1.1.2 — Invoice Form Polish

**Branch:** `fix/invoice-form-improvements` (continued)

- [x] Form too left-aligned — remove `max-w-2xl` constraint, let dashboard width govern
- [x] Add visual gap/separator between YOU and CLIENT columns
- [x] Line items: rewrite with flex rows (grid arbitrary values unreliable), keep no-spinners + allow empty
- [x] Tax % input: replace absolute-positioned `%` with inline flex suffix; remove spinners
- [x] Date picker: widens automatically once form width is fixed
- [x] Access code: remove checkbox, single optional input labelled "Access code (Optional)"
- [x] Remove client name as a required field — all client fields optional

**Done when:** Form looks balanced, line items are horizontal, tax field is clean, access code is simplified.

---

### ✅ v1.1.3 — Invoice Form Layout & Validation Fixes

**Branch:** `fix/invoice-form-improvements` (continued)

**Layout**
- [x] Fix YOU/CLIENT sections — columns side-by-side with centred divider and clear gap (inline styles to work around Tailwind v4 gap/padding generation bug)
- [x] Line items: column headers (Description, Qty, Unit price) in same div as their inputs — mirrors Field pattern, labels only on first row, subsequent rows align underneath
- [x] Line items: use inline `gap` style so column widths are consistent across all rows
- [x] Dynamic page title — reverted; title stays as static "New Invoice" / "Edit Invoice"
- [x] Remove Tax % suffix element — label now reads "Tax (%)" instead

**Validation & input behaviour**
- [x] Email validation: only validates format if an email is entered; blank is allowed for both sender and client
- [x] Allow "0" as a valid quantity or unit price (tracked as raw string; zero no longer collapses to empty display)
- [x] Invoice number: max 50 characters enforced via `maxLength` attribute and validation
- [x] Qty field: no placeholder after deletion — field is blank when empty, no greyed "1" re-appearing
- [x] Qty / Unit price inputs changed to `type="text" inputMode="decimal"` — eliminates spinners, scroll-wheel changes, and arrow-key increments entirely
- [x] Tax input likewise changed to `type="text" inputMode="decimal"`
- [x] Fix `client_email` / `your_email` NOT NULL constraint — send empty string instead of null when blank
- [x] New line items added via "+ Add line item" now prefill qty with "1" (matching the initial row)

**Done when:** YOU and CLIENT sit side by side with a centre divider; column headers align with their inputs; all input behaviour matches spec above.

---

### ✅ v1.1.4 — Invoice UX Polish

**Branch:** `fix/invoice-form-improvements` (continued)

**Routing**
- [x] `/invoices` route shows the invoice list (same as `/dashboard`); `/dashboard` redirects to `/invoices`

**Invoice form**
- [x] Remove `heading-invoice-title` element from the invoice form — title lives on the page, not inside the form component
- [x] Close vertical space between field rows within YOU and CLIENT sections
- [x] Scroll page to first failed validation field when a form submission fails validation
- [x] Stop `client_name` defaulting to "Unnamed" when left blank — allow empty
- [x] Cancel button at the bottom of the edit invoice form; if the form is dirty, show a confirmation modal before discarding changes

**Invoice detail page**
- [x] Fix centering — detail page content is left-aligned within the wide layout container; add `mx-auto`
- [x] Replace client name in the large header with the invoice number; remove the smaller inline invoice number beside it
- [x] Add "Mark as unpaid" action for paid invoices (reverts status to pending)

**Done when:** All items above are checked off.

---

### ✅ v1.1.5 — Form Validation, Nav & Date Picker

**Branch:** `fix/invoice-form-improvements` (continued)

**Routing & nav**
- [x] Navbar "Paybitty" logo text links to home (`/invoices`)

**Form validation hardening**
- [x] Qty field: enforce max 100,000 and max 2 decimal places (validate on submit, not on keystroke)
- [x] Unit price field: enforce max 1,000,000,000 and max 2 decimal places (validate on submit)

**Date picker**
- [x] Replace current narrow date picker with the correctly-sized shadcn date picker matching the component docs (proper popover width, calendar styling)

**ID coverage**
- [x] Create a reusable `add-ids` skill that audits the UI and adds appropriately named `id` attributes to all key elements
- [x] Run the skill across all pages and components so every interactive and structural element has a stable ID

**Done when:** Nav logo navigates home, validation rejects out-of-range qty/price, date picker matches shadcn docs, all key elements have IDs.

---

### ✅ v1.2 — Client Payment View + BTC QR Code

**Branch:** `v1.2/client-payment-view`

> Note: `/invoice/[id]` currently shows a "Client payment view coming soon" stub. This branch replaces it with the full implementation.

- [x] Public route `/invoice/[id]` with access code gate
- [x] BTC price fetching API: `GET /api/btc-price?currency=USD` (Coinbase primary, CoinGecko fallback, ~60s server-side cache)
- [x] BTC amount computed from live price at view time
- [x] BIP21 QR code generated (`bitcoin:<address>?amount=<btc>&label=<label>`)
- [x] Client view: invoice details, fiat total, BTC amount, QR code

**Also fixed on this branch**
- [x] BTC address conflict error: shows inline below field (not top of form), scrolls to field, friendly message naming the conflicting invoice
- [x] BTC conflict check covers all non-draft statuses (was only checking `pending`; DB index covers all)
- [x] Centralised `parseServerError()` utility — error message wording lives in one place
- [x] Conflict error falls back to short invoice ID (`…xxxxxxxx`) when conflicting invoice has no number

**Done when:** A client can open a link, enter an access code, see the invoice, and scan a QR code to pay.

---

### ✅ v1.3 — Payment Detection

**Branch:** `v1.3/payment-detection`

- [x] mempool.space WebSocket connection opened client-side on the payment view page
- [x] 0-conf event: update invoice status to `payment_detected`
- [x] 1-conf event: update invoice status to `paid`
- [x] Fallback: exponential backoff polling (30s start, doubles, caps ~10min)
- [x] WebSocket closed once invoice reaches `paid`
- [x] Real-time status UI update on client payment page
- [x] `btc_txid` saved when payment is detected or confirmed; displayed in both user and client views as a link to mempool.space
- [x] BTC address validation — checksum-verified (bech32, bech32m, base58check) on both client form and server action; invalid addresses blocked at publish time

> **Deferred to v1.4:** On-login sweep of all `pending` / `payment_detected` invoices — detected payments are caught when any relevant invoice page is viewed, which covers the common case. A background sweep at login will be added in v1.4 alongside email notifications (same session).

**Done when:** Payment detection works end-to-end with live and fallback paths; invalid BTC addresses are rejected at publish time.

---

### ✅ v1.3.1 — Invoice View & List Date Polish

**Branch:** `v1.3.1/invoice-date-polish`

- [x] Invoice detail page (user view): add "Date Sent" (created/published date) and "Date Due" — currently shows no date information
- [x] Client payment view: already shows "Due" date — add "Date Sent" alongside it for full context
- [x] `/invoices` list: replace creation date with due date; label it "Due \<date\>" to avoid ambiguity (invoices with no due date show a dash or nothing)

**Done when:** Both views clearly surface sent and due dates; the invoice list shows due date with unambiguous label.

---

### ✅ v1.3.2 — Invoice List Management

**Branch:** `v1.3.2/invoice-list-management`

- [x] Multi-select checkboxes on the `/invoices` list
- [x] Bulk action dropdown appears when one or more invoices are selected: Delete, Archive, Mark as Paid
- [x] Archive status: add `archived` to invoice status enum; archived invoices hidden from main list by default (consider a toggle to show them)
- [x] Bulk delete: confirm before executing; only draft invoices deletable in bulk (or confirm for non-draft)
- [x] Bulk mark as paid: applies to selected non-paid invoices

**Done when:** User can select multiple invoices and apply bulk actions from a single dropdown.

---

### ✅ v1.3.3 — Payment Sent Button & Reveal Gate

**Branch:** `v1.3.3/payment-sent-button`

- [x] "Pay now in Bitcoin" reveal button — QR and address hidden until the payer clicks through, so they review the invoice first. Auto-reveals for already-detected/paid invoices.
- [x] "Mark as Payment Sent" button opens a dialog that actively polls mempool.space for 60 seconds on a front-loaded tiered schedule (5x2s + 5x3s + 3x5s + 2x10s = 15 polls)
- [x] Dialog states: polling (progress bar + "Cancel" with helper text), detected ("Your payment has been detected" + OK), timed-out (with mempool.space link)
- [x] Detected dialog auto-pops on status transition pending/overdue → payment_detected/paid — even if the payer never clicked "Mark as Payment Sent"
- [x] Progress bar animates to 100% for ~400ms on detection before flipping to the detected view (visual beat for confirmation)
- [x] Background watcher's fallback-polling first-delay cut from 30s to 10s; WebSocket errors now logged to the browser console
- [x] `/invoices` list and `/invoices/[id]` detail page live-update via Supabase Realtime — freelancer's row/page flips alongside the payer's confirmation, no manual refresh required
- [x] `REPLICA IDENTITY FULL` set on `public.invoices` (migration `0006`) so UPDATE events carry all column values for reliable Realtime delivery
- [x] Realtime hook explicitly sets `supabase.realtime.setAuth(access_token)` before subscribing to avoid RLS silently dropping events, and falls back to `router.refresh()` on `visibilitychange` as a safety net

**Done when:** A payer has an explicit action that tells them the system is actively checking, with a clear resolution (detected or not-yet-detected with a mempool.space link) within 60 seconds, AND a clear "Your payment has been detected" confirmation appears even if they never clicked the button.

---

### ✅ v1.3.4 — Invoice Duplication

**Branch:** `v1.3.4/invoice-duplication`

- [x] `Duplicate` action on the `/invoices` per-row dropdown (placeholder 🚩 shipped in v1.3.2)
- [x] Server action `duplicateInvoice(id)` — creates a new draft invoice by copying all fields from the source except: `id`, `status` (→ draft), `btc_address` (cleared — addresses can't be reused), `btc_txid` (cleared), `created_at` / `updated_at`. `access_code` persists.
- [x] `invoice_number` behavior: append " (copy)" if source has a number; leave null otherwise
- [x] After duplication, redirect the user to `/invoices/[new-id]/edit`

**Done when:** User can duplicate any invoice into a new draft with a single click.

---

### ✅ v1.3.5 — Dashboard Invoice UX Polish

**Branch:** `v1.3.5/dashboard-invoice-polish`

Small follow-up polish on the owner's dashboard views — the list and the single-invoice detail page. All items are self-contained UI improvements, no schema changes.

**`/invoices` list**
- [x] `Unarchive` action on the per-row dropdown for rows with status `archived` (mirrors the existing `Archive` action, reverses status back to its pre-archive value or a sensible default like `pending`)
- [x] `Clear Selected` button appears above the data table (next to or within the toolbar row) whenever one or more rows are selected; clicking it clears the row-selection state without affecting filters or other UI state

**`/invoices/[id]` dashboard detail page**
- [x] Mirror the `/invoices` per-row dropdown actions as buttons at the bottom of the detail view (status-aware, same conditional logic). Example: Edit (draft only), View public invoice / Copy public link (non-draft), Mark as sent (draft), Mark as paid, Archive / Unarchive, Duplicate, Delete. The existing dropdown stays as-is on the list; this is a second surface for the same actions on the detail page where there is room for explicit buttons.

**Done when:** Archived rows can be restored without leaving the list, selection can be cleared with one click, and every action available from the dropdown is also reachable as an explicit button from the single-invoice view.

---

### ✅ v1.3.6 — Form & Client View Polish

**Branch:** `v1.3.6/form-and-client-view-polish`

Two small, independent input/display-quality fixes bundled because they each touch a single field or component.

**`/invoices/new` form**
- 🚫 ~~Suppress password-manager browser-extension icons on Invoice number / Name / Email / Company fields.~~ _Won't fix: LastPass ignores the standard opt-out signals (`data-lpignore`, `autoComplete="off"`, `data-form-type="other"`) whenever a field's label or id matches one of its autofill categories (name/email/company/number). Attributes alone were shipped and verified in the DOM but LastPass injected the icon anyway. The only reliable workarounds (`type="search"` on identity fields, or swapping `type="email"` for `type="text"`) break HTML semantics and native validation — not worth the tradeoff for one extension's heuristic._

**`/invoice/[id]` public payment view**
- [x] Make the BTC amount copyable — click/tap to copy, with the same "copied" feedback used on the `/invoices/[id]` share-link copy button (`src/components/copy-button.tsx`)
- [x] Make the BTC address copyable with the same pattern

**Done when:** Password-manager icons no longer clutter the New Invoice form on fields where autofill is nonsense, and the payer can copy the BTC amount and address with a single click from the public view.

---

### ✅ v1.4 — PDF Generation + Email Notifications

**Branch:** `v1.4/pdf-and-email`

- [x] On login: sweep all `pending` / `payment_detected` invoices for the user to catch missed events (deferred from v1.3)
- [x] Resend + React Email configured
- [x] Email: invoice link + access code sent to client on publish
- [x] Email: payment detected notification to creator (0-conf)
- [x] Email: payment confirmed notification to creator (1+ conf)
- [x] PDF generation with `@react-pdf/renderer` (server-side)
- [x] PDF download available from invoice detail view
- [x] Log out button in the dashboard nav (right of the user email) — needed for testing sign-in with a different account during email deliverability checks

**Done when:** All transactional emails send correctly and PDFs are downloadable.

---

### ✅ v1.4.1 — Background Payment Polling (replaces login sweep)

**Branch:** `v1.4.1/background-payment-polling`

**Context for a fresh session:** v1.4 shipped two payment-detection paths: (a) a client-side mempool WebSocket watcher on `/invoice/[id]` that catches transitions in real time while the payer is on the page, and (b) a login-time "sweep" (`src/components/login-sweep-trigger.tsx` + `src/app/(dashboard)/sweep-action.ts`) that catches missed transitions when the owner next opens the dashboard. Both leave a gap: if the payer closes the page *and* the owner doesn't log in, nothing runs. This version replaces the login sweep with a **Vercel Cron** that polls mempool.space on a per-invoice schedule, so detection is fully background — no user presence required on either side.

**Polling schedule (user-confirmed):**

- **Pre-mempool (status = `pending`, nothing broadcast yet):** 1m, 5m, 10m, 30m after publish. If still not seen after ~46 min, background polling stops for that invoice. Client-side watcher still works if the payer returns to the page.
- **Post-mempool (status = `payment_detected`, tx seen but unconfirmed):** 10m × 3, then 1h × 6, then 4h × 12, then 8h × 24. After ~11 days unconfirmed, stop.

**Login sweep is removed entirely** — the background cron becomes the single source of truth.

---

#### Schema — new migration `supabase/migrations/0008_background_payment_schedule.sql`

Add three columns to `invoices`:

- `next_check_at TIMESTAMPTZ` (nullable) — when the cron should next process this row. `NULL` = no polling (draft, paid, archived, or exhausted).
- `mempool_seen_at TIMESTAMPTZ` (nullable) — when the tx was first seen in mempool. Drives the post-mempool cadence.
- `stage_attempt INT NOT NULL DEFAULT 0` — counter within the current stage. Interval = fn(mempool_seen_at IS NULL, stage_attempt).

Partial index on `next_check_at WHERE next_check_at IS NOT NULL` for fast cron lookups.

Backfill: existing `pending`/`payment_detected` rows get `next_check_at = now() + interval '1 minute'` so they pick up on first cron run.

#### New pure scheduling function — `src/lib/invoices/payment-schedule.ts`

```ts
interface ScheduleInput {
  status: "pending" | "payment_detected";
  btc_address: string;
  mempool_seen_at: string | null;
  stage_attempt: number;
}

interface ScheduleDecision {
  newStatus: "pending" | "payment_detected" | "paid";
  newMempoolSeenAt: string | null;
  newStageAttempt: number;
  newNextCheckAt: string | null; // null = stop polling
  detectedTxid: string | null;   // non-null if status changed this tick
}

function decidePaymentSchedule(
  input: ScheduleInput,
  txs: MempoolTx[],
  now: Date
): ScheduleDecision
```

Pure function, no I/O. Replaces the core decision logic currently inside `sweepUserInvoices`. Fully unit-tested.

Delay table (hardcoded, easy to tweak):

```ts
const PRE_MEMPOOL_DELAYS_MS = [60_000, 300_000, 600_000, 1_800_000]; // 1m, 5m, 10m, 30m
const POST_MEMPOOL_STAGES = [
  { count: 3,  intervalMs: 10 * 60_000 },
  { count: 6,  intervalMs: 60 * 60_000 },
  { count: 12, intervalMs: 4 * 60 * 60_000 },
  { count: 24, intervalMs: 8 * 60 * 60_000 },
];
```

#### New cron endpoint — `src/app/api/cron/payment-sweep/route.ts`

Behavior:
1. Require `Authorization: Bearer $CRON_SECRET` — 401 otherwise. Vercel Cron attaches this header automatically.
2. Fetch up to 50 invoices where `next_check_at <= now()` AND `status IN ('pending','payment_detected')`.
3. For each: `fetchAddressTxs(btc_address)` (existing helper in `src/lib/mempool.ts`), pass to `decidePaymentSchedule`, apply update with optimistic concurrency (`.eq("status", current.status)`).
4. If status transitioned: dispatch via existing `sendPaymentDetectedEmail` / `sendPaymentConfirmedEmail` (resolve owner email via `supabase.auth.admin.getUserById`, same pattern as `src/app/api/invoices/[id]/payment-status/route.ts`).
5. Return JSON `{ processed, transitions, errors }` for Vercel Cron logs.

Batch cap (50) protects against mempool.space rate limits (~10/s).

#### Vercel cron config — new `vercel.json` at repo root

```json
{
  "crons": [
    { "path": "/api/cron/payment-sweep", "schedule": "* * * * *" }
  ]
}
```

Every minute. Vercel's current policy (2025) supports per-minute cron on Hobby with up to 2 crons.

#### Payment-status route — consolidate shared logic

`src/app/api/invoices/[id]/payment-status/route.ts` currently has near-duplicate transition logic. After the route's existing txid validation, replace its ad-hoc status-update block with a call into a thin wrapper around `decidePaymentSchedule` (or a helper that accepts a known txid rather than raw mempool txs). The route still exists — it's the fast path when the client-side watcher fires — but it now shares one schedule / one state-update shape with the cron.

#### Files to DELETE (login sweep removal)

- `src/components/login-sweep-trigger.tsx`
- `src/app/(dashboard)/sweep-action.ts`
- `src/lib/invoices/sweep.ts` + `sweep.test.ts` (logic moves to `payment-schedule.ts`)

#### Files to EDIT

- `src/app/(dashboard)/layout.tsx` — remove `<LoginSweepTrigger />` and its import.
- `src/app/(dashboard)/invoices/actions.ts` — in `publishInvoice`, after setting status to `pending`, also set `next_check_at = now() + 1 minute`, `stage_attempt = 0`, `mempool_seen_at = null`.
- `src/app/api/invoices/[id]/payment-status/route.ts` — consolidate per above.
- `development/ROADMAP.md` — flip this section ⏳ → ✅ when done; add `CRON_SECRET` to the pre-deployment checklist.
- `CHANGELOG.md` — add v1.4.1 entry.

#### Tests

New:
- `src/lib/invoices/payment-schedule.test.ts` — high coverage; this is the core logic:
  - Pre-mempool attempt 0 → next interval 5m.
  - Pre-mempool attempt 3 (final) with no tx → `next_check_at = null` (stop).
  - Pre-mempool attempt with unconfirmed tx → transition to `payment_detected`, `mempool_seen_at` set, `stage_attempt = 0`, `next_check_at = +10m`.
  - Pre-mempool attempt with confirmed tx → transition to `paid`, `next_check_at = null`.
  - Post-mempool attempt 2 (end of 10m stage) → next interval 1h.
  - Post-mempool attempt 8 (end of 1h stage) → next interval 4h.
  - Post-mempool attempt 44 (final) with still-unconfirmed tx → `next_check_at = null` (stop).
  - Post-mempool attempt with confirmed tx → transition to `paid`, `next_check_at = null`.
- `src/app/api/cron/payment-sweep.test.ts` (route-level):
  - 401 when bearer missing / wrong.
  - Correct scope: `.eq("status", "pending"/"payment_detected")`, `.lte("next_check_at", now())`, `.limit(50)`.
  - Emails dispatched exactly once per transition (mock `@/lib/email/send` same way `payment-status.test.ts` does).

Update:
- `src/app/(dashboard)/invoices/actions.test.ts` — `publishInvoice` tests should assert `next_check_at`, `stage_attempt`, `mempool_seen_at` are written.

Delete:
- `src/lib/invoices/sweep.test.ts` (the sweep it tests is being removed).

All remaining tests should continue to pass. Typecheck + lint clean.

#### Manual-test affordance for dev

In dev, Vercel Cron doesn't fire. Curl the endpoint with the secret:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/payment-sweep
```

Document this at the top of the route file.

#### Pre-deployment additions

Add to the "Pre-deployment Checklist" section at the bottom of this roadmap:
- `CRON_SECRET` — required by the cron endpoint. Vercel generates this when you configure the cron; mirror it into `.env.local` for dev curl.

**Done when:** A testnet invoice, published and then immediately abandoned (payer closes the tab), still transitions to `payment_detected` and then `paid` on the correct mempool events — with the creator receiving both emails — without anyone logging in.

> **Followup validation (not yet performed):** end-to-end tested on testnet4 only. A mainnet dry-run with a real BTC address is still outstanding — set `NEXT_PUBLIC_BTC_NETWORK=mainnet` in `.env`, restart the dev server, publish an invoice with a real receive address, and confirm the same `pending → payment_detected → paid` flow runs through the cron without code changes. An earlier attempt against a mainnet address failed silently, most likely because the network env var was still pointing at testnet4.

---

### ✅ v1.4.2 — Public Payer Page Live Updates

**Branch:** `v1.4.2/public-invoice-realtime`

**Context:** In v1.4.1, the background cron (and the existing fast-path `/api/invoices/[id]/payment-status` route) can both transition an invoice's status without the payer's page knowing. The public `/invoice/[id]` page currently has no Supabase Realtime subscription — it only updates via its own mempool.space WebSocket (while the tab is open) or via server-render on first load. If the cron flips `pending → payment_detected` while the payer is looking at the page, the badge won't move until they refresh.

**Scope**
- [x] Add a Supabase Realtime subscription to `src/app/invoice/[id]/invoice-payment-view.tsx` (or a small hook like `use-public-invoice-realtime.ts`) that listens for UPDATEs on the `invoices` table filtered to the specific invoice id, and applies them to local state.
- [x] Subscribe with the anon key (not the user session — payer is unauthenticated on this page). Confirm RLS allows a SELECT on the row scoped by id + access_code, or add a permissive SELECT policy specifically for Realtime if needed. `REPLICA IDENTITY FULL` is already set (migration 0006) so UPDATE events carry full rows.
- [x] Keep the existing mempool.space WebSocket watcher — it's still the fastest path when the payer is on the page. Realtime is the fallback for cron-driven transitions.
- [x] Add `visibilitychange` → `router.refresh()` safety net (same pattern as the dashboard hook).
- [x] Unit-test the new hook the same way `use-invoice-realtime.test.ts` tests the dashboard one.

**Done when:** With the payer's page open and no mempool-side connection activity, running the cron (or calling the fast-path API from a different client) immediately flips the status badge on the payer's page without a refresh.

**Also update the README when this ships:**
- [x] In `README.md` → "Payment detection architecture" → summary table, remove the callout under the table that says path (C) changes won't reach the payer without a refresh. That disclaimer exists specifically because of the v1.4.1 gap this branch closes.
- [x] Extend the "(D) Owner live updates" section (or add a new "(E) Payer live updates" section) documenting that the public `/invoice/[id]` page now subscribes to Supabase Realtime too, including the anon-key / RLS note.

---

### ✅ v1.4.3 — Email Event Log (DB-backed)

**Branch:** `v1.4.3/email-events-log`

**Context:** v1.4 added three transactional emails (invoice published, payment detected, payment confirmed), and v1.4.1 added a second callsite for the payment emails (the background cron). Today there is **no persistent record** that any of these were sent — evidence only lives in Resend's dashboard and transient runtime logs. If a payer reports never receiving an invoice link, or an owner claims they never got a payment-confirmed email, there is no in-app way to answer *"was it sent, when, and did it succeed?"* This branch closes that gap.

**Checklist:**
- [x] Migration `0010_email_events.sql` (renumbered from 0009 — that slot was taken by v1.4.2's anon-select policy): enums, table, indexes, RLS, owner-read policy
- [x] `src/lib/email/send.test.ts` covers queued→sent, skipped_no_api_key, failed-with-error-message, and DB-write-failure-doesn't-throw
- [x] `safeSend` refactored to take `EmailContext { invoiceId, userId, type, recipient }` and write `email_events`
- [x] All three `sendXxxEmail` functions build and pass `EmailContext`
- [x] `publishInvoice` passes `invoice.user_id`; existing test asserts `userId: "user-1"`
- [x] `payment-status` route passes `invoice.user_id`; existing test asserts `userId: "owner-1"`
- [x] `payment-sweep` cron passes `inv.user_id`; existing test asserts `userId: "owner-1"`
- [x] **Email Activity** card on `/invoices/[id]` (server component fetching `email_events` for the invoice)
- [x] README "Email event log" + "What is *still not* tracked" sections rewritten
- [x] CHANGELOG v1.4.3 entry
- [x] Manual test guide: `manual-tests/v1.4.3-email-events-log.md` (6 tests + 90s smoke)
- [x] ROADMAP flipped to ✅

**Notes / deviations from the original spec:**
- Migration filename is `0010_email_events.sql`, not `0009_email_events.sql` (the `0009` slot was taken by v1.4.2's anon-select policy).
- Failed-row error rendering: spec said *"error message on hover"* (native `title` tooltip). Implementation surfaces the error **inline in red text below the row** instead — discoverable without hover, accessible to keyboard and screen-reader users.
- Realtime auto-refresh of the activity card is **not wired up** (deferred). The existing v1.3.3 invoice realtime hook only refetches the invoice row, not its email events. Loading the page or any normal navigation re-fetches them server-side.

---

#### Schema — new migration `supabase/migrations/0009_email_events.sql`

```sql
create type email_type as enum (
  'invoice_published',
  'payment_detected',
  'payment_confirmed'
);

create type email_event_status as enum (
  'queued',
  'sent',
  'failed',
  'skipped_no_api_key'
);

create table email_events (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references invoices(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  email_type      email_type not null,
  recipient       text not null,
  status          email_event_status not null default 'queued',
  resend_message_id text,              -- populated from Resend's response on success
  error_message   text,                -- populated on 'failed'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index email_events_invoice_id_idx on email_events (invoice_id, created_at desc);
create index email_events_user_id_idx    on email_events (user_id, created_at desc);

alter table email_events enable row level security;

create policy "owner can read own email events"
  on email_events for select
  using (auth.uid() = user_id);
-- Inserts/updates only happen server-side via the service role key; no anon insert policy.
```

`user_id` is denormalised from the invoice row so the RLS policy is a simple `auth.uid() = user_id` check rather than a join.

---

#### `safeSend` refactor — `src/lib/email/send.ts`

Current signature wraps a closure; new signature passes context so the wrapper can write to `email_events`:

```ts
interface EmailContext {
  invoiceId: string;
  userId: string;
  type: EmailType;
  recipient: string;
}

async function safeSend(ctx: EmailContext, send: () => Promise<{ id: string }>): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("email_events")
    .insert({
      invoice_id: ctx.invoiceId,
      user_id: ctx.userId,
      email_type: ctx.type,
      recipient: ctx.recipient,
      status: "queued",
    })
    .select("id")
    .single();

  if (!getResend()) {
    await admin.from("email_events").update({ status: "skipped_no_api_key" }).eq("id", row!.id);
    console.warn(`[email] skipping ${ctx.type} — RESEND_API_KEY not set`);
    return;
  }

  try {
    const { id: resendId } = await send();
    await admin.from("email_events").update({
      status: "sent",
      resend_message_id: resendId,
      updated_at: new Date().toISOString(),
    }).eq("id", row!.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("email_events").update({
      status: "failed",
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", row!.id);
    console.error(`[email] ${ctx.type} failed`, err);
  }
}
```

- All three `sendXxxEmail` functions in `src/lib/email/send.ts` are updated to build an `EmailContext` and pass it through.
- `publishInvoice` and both payment callsites pass `invoice.user_id` (for `invoice_published` this is the owner's id, even though the recipient is the payer — the log is owner-scoped for RLS).
- The DB write is best-effort (same philosophy as the email itself): if the admin client fails, log and continue. Never block the parent flow.

---

#### Minimal UI — invoice detail page

On `src/app/(dashboard)/invoices/[id]/page.tsx`, add a small collapsible **"Email activity"** card below the existing actions:

- Lists every `email_events` row for the invoice, most recent first.
- Each row renders: type (human-readable), recipient, status badge (sent / queued / failed / skipped), timestamp, error message on hover if `failed`.
- No pagination — invoices will have at most a handful of rows.

Server component, fetched inline — no client-side polling needed. If a row is still `queued` when the page loads, the Realtime subscription from v1.3.3 already fires `router.refresh()` on invoice row changes; we can extend it to also refresh on `email_events` inserts/updates, or simply leave a "click to refresh" affordance.

---

#### Tests

Update:
- `src/app/(dashboard)/invoices/actions.test.ts` — assert an `email_events` row is inserted with `type='invoice_published'` and eventually marked `sent` on a successful publish.
- `src/app/api/invoices/payment-status.test.ts` — assert event rows for `payment_detected` / `payment_confirmed` transitions.
- `src/app/api/cron/payment-sweep.test.ts` — same assertions for cron-driven transitions.

New:
- `src/lib/email/send.test.ts` — unit tests for `safeSend`: queued-then-sent happy path; skipped when no API key; failed with error message captured; DB write failure doesn't throw.

---

#### Files to EDIT

- `src/lib/email/send.ts` — `safeSend` refactor + context plumbing.
- `src/app/(dashboard)/invoices/actions.ts` — pass `user_id` to `sendInvoicePublishedEmail`.
- `src/app/api/invoices/[id]/payment-status/route.ts` — pass `user_id` to the payment email calls.
- `src/app/api/cron/payment-sweep/route.ts` — same.
- `src/app/(dashboard)/invoices/[id]/page.tsx` — render the email activity card.
- `README.md` — rewrite the **"What is *not* tracked"** sub-section to describe the new table; mention the Resend dashboard as the complementary source for webhook-level data (bounces, complaints) that is not captured yet.
- `development/ROADMAP.md` — flip this section ⏳ → ✅.
- `CHANGELOG.md` — v1.4.3 entry.

---

#### Out of scope (deferred)

- **Resend webhooks** (delivered / bounced / complained events). Would go into a follow-up (e.g. v1.4.4) as a `POST /api/webhooks/resend` endpoint that updates `email_events` rows by `resend_message_id`. Useful but not required to answer the original *"did it send?"* question.
- **Admin-wide email console.** Per-invoice is enough for v1.4.3. A tenant-wide deliverability view is a v2 concern.
- **Retry of failed sends.** No queue infra yet. Leave `status='failed'` as terminal; manual resend is an explicit action.

**Done when:** every email the system sends (or skips) has a corresponding `email_events` row, visible from the invoice detail page to the owner, with status and error messaging surfaced. The README accurately describes the log.

---

### ✅ v1.4.4 — Email Recipient Expansion + Sender Identity

**Branch:** `v1.4.4/email-recipient-and-sender`

**Context:** Today the payment-detected / payment-confirmed emails go to the invoice owner only; the payer never hears back by email after paying. The payer only sees confirmation on the public invoice page they paid through, which is gone the moment they close the tab. Separately, the Resend transactional sender (`EMAIL_FROM`) and the Supabase auth SMTP sender are not aligned — users get magic links from one `From:` and invoice emails from another. Both go out as part of this branch.

**Scope**
- [x] `sendPaymentDetectedEmail` and `sendPaymentConfirmedEmail` — send to **both** the owner and the payer (`client_email`). Two separate Resend calls per transition (keeps per-recipient personalisation simple; `safeSend` already handles failures per-call). Skip the payer-side send if `client_email` is blank, same rule as `sendInvoicePublishedEmail`.
- [x] Consider distinct email copy per recipient — the owner wants "Your client paid invoice X"; the payer wants "Your payment to Y has been detected / confirmed". Two template variants or one template parameterised by role. Prefer template variants for clarity.
- [x] Update `src/lib/email/templates/payment-detected.tsx` and `payment-confirmed.tsx` accordingly — or split into `-owner`/`-payer` files.
- [x] Update all three email callsites (`publishInvoice`, fast-path payment-status route, cron sweep) to dispatch both recipients where applicable.
- [x] Unify sender identity: set `EMAIL_FROM="SatSend <team@mail.satsend.me>"` in `.env` and the Vercel env vars, and change the Supabase custom SMTP sender (dashboard → Auth → SMTP Settings → Sender) to the same address. No code change is strictly needed for the Supabase half — it's a dashboard setting — but call it out in the `CHANGELOG` and the pre-deployment checklist so nobody later wonders why the address differs between envs.
- [x] README: in "Email notifications" → update the triggers/recipients table to show detected/confirmed emails go to **both** owner and payer; update the Supabase SMTP note to show the specific sender address.

**Tests**
- [x] Extend existing payment-status and cron-sweep route tests to assert two email dispatches per transition (one per recipient) and that the payer send is skipped when `client_email` is blank.
- [x] Extend `src/lib/email/send.ts` tests (or add one) to confirm the split templates render without throwing.

**Done when:** A single `pending → payment_detected` transition results in exactly two emails (one to owner, one to payer) unless the payer has no email on file. All transactional mail and all Supabase auth mail come from `team@mail.satsend.me`.

---

### ✅ v1.4.5 — PDF Polish: Filename Format + Dropdown Download

**Branch:** `v1.4.5/pdf-polish`

**Context:** Two small PDF improvements. The filename is currently `invoice-<invoiceName>.pdf`, which is ambiguous across freelancers ("who is this invoice from?" when the payer is filing receipts). And the PDF can only be downloaded from the invoice detail page — not from the `/invoices` per-row dropdown, where users expect all invoice actions to live.

**Scope**
- [x] Change the PDF filename format to `<sender>_<invoiceName>_<YYYYMMDD>.pdf`, where:
  - `<sender>` = `your_company` if set, else `your_name` if set, else the prefix of `your_email` (everything before `@`), else literal `invoice`. Sanitise to filesystem-safe chars (strip `/`, `\`, leading/trailing whitespace; collapse internal whitespace to `_`).
  - `<invoiceName>` = `invoice_number` if set, else the short id `…xxxxxxxx`. Same sanitisation.
  - `<YYYYMMDD>` = the date the invoice was published (fallback: created_at), in UTC.
- [x] Centralise the filename builder in a pure helper (e.g. `src/lib/invoices/pdf-filename.ts`) with full unit tests covering each fallback branch and the sanitisation.
- [x] Apply the helper to both callers: the existing detail-page download, and the new dropdown action.
- [x] Add a `Download PDF` action to the `/invoices` per-row dropdown (`src/app/(dashboard)/invoices/row-actions.tsx` or wherever the existing actions live). Only shows for non-draft invoices (drafts shouldn't have a public URL / PDF). Reuses the same server endpoint as the detail-page download.

**Tests**
- [x] `src/lib/invoices/pdf-filename.test.ts` — covers every fallback branch (`your_company` missing, `your_name` missing, email-prefix path, everything missing), bad-character sanitisation, and the date format.
- [x] Update the dropdown actions test to assert `Download PDF` appears for non-draft rows and is wired to the correct URL.
- [x] **PDF content redesign** (added late in the branch): `Date Created` + `Date Due` (with `"No due date"` fallback) labels in the meta block; clickable `View and pay online` hyperlink to the public invoice URL; brand-coloured header (pulled from new `src/lib/brand-colors.ts` module mirrored from `globals.css`); BIP-21 BTC QR code (no amount); clickable hyperlink to `buildSpotPriceUrl(currency)` (Coinbase spot endpoint). All driven by tests in `invoice-pdf.test.ts` using `pdf-parse`.
- [x] **Public `Download PDF` button** on `/invoice/[id]` plus a new unauthenticated route `/api/invoice/[id]/pdf` (uses `fetchPublicInvoice`, 404s on drafts).

**Done when:** A PDF downloaded from either the dropdown or the detail page saves as `<sender>_<invoiceName>_<YYYYMMDD>.pdf`, with all sensible fallbacks.

---

### ✅ v1.4.6 — Invoice UX Micro-fixes

**Branch:** `v1.4.6/invoice-ux-micro-fixes`

**Context:** A bundle of four independent UX annoyances reported during v1.4.1 manual testing. None of them warrant a branch on their own; grouped here for a single clean PR. (The original "Rename Mark as sent → Publish" item moved into **v1.4.8 — Publish vs Send-via-email split**, since the rename is now part of a larger state-machine change rather than a standalone label tweak.)

**Scope**
- [x] **Prefill and lock `your_email`** on `/invoices/new` and `/invoices/[id]/edit` — read `session.user.email` on the server render and inject it into the form as a read-only (disabled or `readonly`) field. Remove the field from `InvoiceFormSchema` validation on the client so users can't bypass. This collapses the "two emails" confusion (account email vs invoice sender email). Per-invoice override is an explicit future non-goal — call it out in a code comment; a future branch can add it back behind a toggle.
- [x] **Access codes: lowercase enforcement** — change the existing uppercase-on-input transform to lowercase-on-input. Typing `FOO12` becomes `foo12`. Easier to type on mobile, less ambiguous visually. Update `src/components/invoice-form.tsx` (or wherever the access code field lives) and the corresponding validation schema — no DB migration needed since existing codes are stored as-is; optionally write a one-off `UPDATE invoices SET access_code = lower(access_code)` if we want case-normalisation across existing rows.
- [x] **Feedback when archiving an unarchivable invoice** — today, attempting to archive an invoice that's already archived (or a status that doesn't support archive) silently fails. Add toast feedback with a specific reason, and/or disable the action in the dropdown with a tooltip.
- [x] **"Mark as overdue" missing from `/invoices` dropdown** for pending invoices — the detail page has the button, the list dropdown doesn't. Add it to the row-actions menu with the same conditional logic used on the detail page.

**Tests**
- [x] Update dropdown-actions tests to assert "Mark as overdue" appears with correct conditional visibility.
- [x] Update invoice-form tests to assert the email field is read-only and pre-filled from session.
- [x] Update access-code handling test to assert lowercase normalisation.

**Done when:** All four fixes are live and covered by tests; users can't enter mixed-case access codes.

---

### ✅ v1.4.7 — Drag-to-reorder Line Items

**Branch:** `v1.4.7/line-item-reorder`

**Context:** Line items on the invoice form are currently fixed in the order they were added. Users want to reorder them without delete-and-re-add, especially when the invoice has many items or when the natural ordering changes mid-edit. Drag handles on the right of each row are a familiar pattern.

**Scope**
- [x] Add a small drag handle (vertical-grip / six-dot icon) to the right of each line item row in `src/components/invoice-form.tsx`. Visible on hover (mobile: always visible).
- [x] Wire up drag-and-drop reordering of the line-items array using `@dnd-kit/core` + `@dnd-kit/sortable` — lightweight, accessible, framework-agnostic, well-suited to the modest payload of an invoice form. Avoid `react-beautiful-dnd` (deprecated, no React 19 support).
- [x] Keyboard a11y: arrow keys move focus, space picks up + space drops, escape cancels. `@dnd-kit` provides this out of the box.
- [x] Touch a11y: long-press to start drag on mobile.
- [x] Schema: line items already live as a JSONB array on `invoices`; ordering is positional within the array — no migration needed. Persist on form save like any other field.

**Tests**
- [x] Form test: reorder via drag (simulated via `@dnd-kit`'s testing utilities) → submit → assert the saved array reflects the new order.
- [x] Keyboard a11y test: focus the handle on row B, space, arrow up, space → row B is now above row A.

**Out of scope**
- Reordering line items on the public invoice view (it's read-only).
- Reordering line items on the rendered PDF (the PDF order matches what's in the DB; no UI for the payer).

**Done when:** Owners can drag any line item to a new position on `/invoices/new` and `/invoices/[id]/edit`, the new order persists on save, and keyboard-only users can do the same.

---

### ✅ v1.4.8 — Publish vs Send-via-email Split

**Branch:** `v1.4.8/publish-send-split`

**Context:** Today, "Publish" and "send the invoice email to the client" are coupled — clicking Publish (currently labelled "Mark as sent") creates the public URL *and* fires the published-invoice email in one server action. The owner has no way to publish privately and deliver the invoice through a different channel (in person, in-app messenger, postal). This branch decouples the two concerns:

- **Publish** = put the invoice into its "final" state (status = `pending`), creating the public URL. No email side-effect.
- **Send** = an explicit, separate step. Three sub-paths: "Send now via email" (fires the email + marks as sent), "Download and mark as sent" (downloads the PDF + marks as sent for manual delivery), or "Mark as sent" (just records the manual delivery).

Once an email has been *attempted* against the invoice (success or failure), "Send via email" is permanently disabled — re-attempts would hit the same `client_email`, which is currently immutable post-publish. Failed-email surfacing is handled in **v1.4.9**.

This branch also subsumes the **"Rename Mark as sent → Publish"** item that was previously slotted in v1.4.6, since the rename only makes sense in the context of the larger split.

**State-machine model**
"Sent" is **metadata on top of `pending`**, not a new status enum value. The payment lifecycle (`pending → payment_detected → paid`) is orthogonal to delivery — combining them would explode the status enum (`pending_unsent`, `pending_sent_email`, `pending_sent_manual`, …) and force every UI branch to switch on the cross product. Three new columns capture delivery state without touching the status enum.

**Schema — new migration `supabase/migrations/00XX_publish_send_split.sql`**

```sql
alter table invoices add column sent_at timestamptz;
alter table invoices add column send_method text check (send_method in ('email', 'manual'));
alter table invoices add column email_attempted_at timestamptz;
```

- `sent_at` — non-null when the invoice has been "delivered" (manually OR via successful email).
- `send_method` — non-null when `sent_at` is set; either `'email'` (successful email send) or `'manual'` (owner clicked Mark as sent / Download and mark as sent).
- `email_attempted_at` — set the moment a Resend `safeSend` for `type=invoice_published` is fired, **regardless of outcome**. Used to gate the "Send via email" option.

**Backfill**
- All existing **non-draft** invoices: `sent_at = created_at, send_method = 'email', email_attempted_at = created_at`. Rationale: previously, publish auto-sent the email, so the implicit historical state is "delivered via email at create time". Per user instruction, retroactively apply this state.
- Draft invoices: leave all three columns NULL.

**Publish-action UI — split-button menu**
The current "Publish" button (on the detail page and `/invoices` per-row dropdown for drafts) becomes a split-button. Clicking opens a menu with **four** options for a draft invoice:

| Option | Side effects |
|--------|--------------|
| **Send now via email** | Publish + fire email. On success: `status='pending', sent_at=now(), send_method='email', email_attempted_at=now()`. On failure: `status='pending', email_attempted_at=now()` (sent_at + send_method stay NULL). |
| **Download and mark as sent** | Publish + trigger PDF download + `status='pending', sent_at=now(), send_method='manual'`. No email. |
| **Mark as sent** | Publish + `status='pending', sent_at=now(), send_method='manual'`. No email, no download. |
| **Publish only (don't send yet)** | Publish, no delivery side-effect. `status='pending'`, all three new columns stay NULL. |

For an **already-published, not-yet-sent** invoice (status `pending` via "Publish only"), the same menu appears with **3 options** (the bottom row removed). For a **manually-marked-sent** invoice, "Send now via email" remains available since `email_attempted_at` is NULL — but the manual options ("Mark as sent" / "Download and mark as sent") are hidden because they are no-ops once `sent_at` is set (the existing "Download PDF" button covers that affordance). For an **email-attempted** invoice (sent or failed), the "Send now via email" item is disabled with a tooltip ("An email has already been attempted for this invoice; multiple sends are not supported").

**Final visibility matrix**

| State | Trigger label | Menu options |
|---|---|---|
| Draft | **Publish** | Send via email · Download and mark as sent · Mark as sent · Publish only |
| Published-only (`sent_at` NULL) | **Send** | Send via email · Download and mark as sent · Mark as sent |
| Manually-marked-sent (`sent_at` set, `email_attempted_at` NULL) | **Send** | Send via email *(only — disabled with tooltip if no `client_email`)* |
| Email attempted but failed (`email_attempted_at` set, `sent_at` NULL) | **Send** | Send via email *(disabled)* · Download and mark as sent · Mark as sent |
| Successfully delivered via email (`sent_at` + `email_attempted_at` both set) | (hidden) | — |
| Manually sent + email attempted (both set) | (hidden) | — |
| Archived | (hidden) | — |

> **Email delivery confirmation is "Resend-accepted", not "inbox-confirmed".** When `publishAndSendEmail` records `email_events.status = 'sent'`, it means the Resend API accepted the request — the email may still bounce later (invalid recipient, spam-block, etc.) and we won't know. True delivery confirmation requires a Resend webhook subscription that updates `email_events.status` post-acceptance; that's tracked as out-of-scope for v1.4.8 and v1.4.9 and will land in a later branch.

**Server actions**
Three new actions in `src/app/(dashboard)/invoices/actions.ts`:

- `publishInvoice(id)` — publish only, no delivery side-effect (this *replaces* the existing `publishInvoice`, which currently also fires the email).
- `publishAndSendEmail(id)` — publish + fire email. Returns the email-attempt outcome so the UI can show success/failure.
- `publishAndMarkSent(id, { withDownload: boolean })` — publish + record manual delivery. When `withDownload=true`, the action also returns the PDF stream.

The `email_events` table from v1.4.3 keeps recording every send attempt; the new `email_attempted_at` column is a denormalised flag for fast UI gating without an extra query.

**Surfacing — detail page + dropdown + status badge**
- Detail page: show "Sent via email on Apr 28" or "Marked as sent on Apr 28" as a small line under the status badge when `sent_at` is set.
- `/invoices` per-row dropdown: if not yet sent, show the same split-menu shape; if sent, show the static line.
- `/invoices` columns: small icon next to the status badge (envelope ✓ for email-sent, hand-mark ✓ for manual-sent, blank for not-sent), tooltip-driven to avoid visual noise.

**Email template — out of scope for this branch**
The existing `invoice-published.tsx` template is reused as-is when "Send now via email" fires. If the wording needs to be re-framed as a deliberate send rather than an auto-publish, do it in a separate small branch.

**Tests**
- [x] Publish only — no `email_events` row written, all three new columns NULL, public URL works.
- [x] Publish + send email (success) — one `email_events` row (`status=sent`), `sent_at` set, `send_method='email'`, `email_attempted_at` set.
- [x] Publish + send email (failure) — one `email_events` row (`status=failed`), `sent_at` NULL, `send_method` NULL, `email_attempted_at` set.
- [x] Publish + mark as sent — no `email_events` row, `sent_at` set, `send_method='manual'`, `email_attempted_at` NULL.
- [x] Publish + download and mark as sent — same as above. Response shape: `{ downloadUrl: "/api/invoices/<id>/pdf" }` (the client triggers the existing PDF endpoint via `window.location`, rather than streaming megabytes through a server-action JSON envelope — same end-user effect, simpler transport).
- [x] UI gate: after a failed email attempt, "Send via email" is disabled (assert disabled state in dropdown and detail page).
- [x] UI gate: after manual mark-as-sent (no email yet), "Send via email" is still enabled.
- [x] Backfill migration `0011_publish_send_split.sql` applied via `npx supabase db push`; all non-drafts get the three columns populated correctly; drafts unchanged.

**Out of scope**
- Email template re-wording (separate small branch later).
- Editing `client_email` post-publish (would change failed-email retry semantics; deferred — see v1.4.9 "out of scope" notes).
- Re-enabling "Send via email" after a successful manual-then-email-failed sequence.

**Done when:** Owners can publish privately, choose between four send paths, and the system distinguishes "delivered via email" from "delivered manually" cleanly. Repeated email sends are prevented; the existing `email_events` audit trail still records every attempt.

---

### ✅ v1.4.9 — Failed Email Surfacing

**Branch:** `v1.4.9/failed-email-surfacing`

**Context:** v1.4.8 introduces the rule that "Send via email" is permanently disabled once an email attempt has been made — even if that attempt failed. This is correct behaviour (re-trying with the same `client_email` will keep failing, and editing `client_email` post-publish isn't supported yet), but it leaves a hole: today the owner has no clear visual signal that an email attempt failed. They have to dig into the v1.4.3 email-events activity card on the detail page to find out.

This branch makes failed-email state a first-class signal in the dashboard.

**Implementation note (revised during build):** rather than deriving failed-email state in the page layer, v1.4.9 introduces a Postgres view `invoice_email_summary` (migration `0012`) that left-joins each invoice to its most-recent `invoice_published` row in `email_events`. The `/invoices` list reads from the view directly, exposing `last_publish_email_status`, `last_publish_email_error`, and `last_publish_email_at` as first-class fields. This keeps `email_events` as the single source of truth, makes the row-level indicator read a real DB field (not an app-derived flag), and means a future Resend bounce/complaint webhook only writes/updates `email_events` — the UI reflects automatically.

**Scope decisions during build:**
- A detail-page alert at the top of the invoice was scoped out — the existing **Email Activity** card (v1.4.3) already shows the per-attempt failure reason in red, and a duplicate alert at the top of the page was redundant.
- The "Email failed" filter toggle on `/invoices` was scoped out — too niche relative to the per-row indicator, which already gives at-a-glance recognition.

**Scope (final)**
- [x] `/invoices` per-row visual cue — a small `AlertCircle` indicator next to the status badge for any invoice with a failed last email-publish. Tooltip: "Email failed to send to this client". On rows that were sent via email but the email failed, the failed indicator replaces (does not stack with) the sent-method icon.
- [x] Source the failed-email state from the new `invoice_email_summary` view.

**Out of scope (deferred)**
- **Editing `client_email` post-publish + retrying email**. Requires careful auditing of identity changes and re-enable semantics. Likely a v1.5 / v1.6 branch.
- Bounce / complaint webhooks from Resend feeding back into `email_events.status` automatically. Currently we only know send-time `status=sent` vs `status=failed`. Resend's webhook for bounces (post-send-but-undeliverable) could update the same row to `status=bounced` — useful but separable. The view structure is already compatible.

**Tests**
- [x] List-page test: per-row indicator renders for failed-publish rows and is absent on successful rows.
- [x] List-page test: failed indicator replaces (does not stack with) the sent-via-email icon on a row that was sent via email but failed.

**Done when:** A failed email is visible at a glance from the dashboard list, without the owner having to open the detail page or expand the email-events activity card.

---

### ⏳ v1.4.10 — Invoice Activity Feed (rename + unify manual events)

**Branch:** `v1.4.10/invoice-activity-feed`

**Context:** v1.4.3 introduced the **Email Activity** card on the invoice detail page — a clean, row-based feed of every transactional email attempt for the invoice. It is the right *shape* for an audit trail, but its scope is too narrow: today the owner can see when an email was sent, but not when the invoice was published, marked as sent, marked as paid, or marked as overdue. Those manual state transitions are equally informative and currently invisible. This branch generalises the card into a single "Invoice Activity" feed covering all of these.

**Renames**
- The card title changes from **Email Activity** → **Activity** (or **Invoice Activity** — exact wording TBD in implementation; one source of truth).
- The component file `src/app/(dashboard)/invoices/[id]/email-activity-card.tsx` is renamed to `invoice-activity-card.tsx` (or similar). The detail-page import in `page.tsx` updates accordingly.

**New event types**
Beyond the existing `invoice_published` / `payment_detected` / `payment_confirmed` email events, the feed now surfaces:

| Event | Trigger | Icon |
|---|---|---|
| Email sent (any type) | existing `email_events` row with `status=sent` | envelope (`Mail`) |
| Email failed | existing `email_events` row with `status=failed` | envelope with strike / alert variant — same family for visual cohesion |
| **Marked as sent** | `publishAndMarkSent` action sets `sent_at` with `send_method='manual'` | `Send` / paper-plane icon |
| **Marked as paid** | `markPaid` action flips status `→ paid` | `CheckCircle` / receipt icon |
| **Marked as overdue** | `markOverdue` action flips status `→ overdue` | `Clock` / alarm icon |

All email-related events share **one icon family** (envelope) per the user's preference; manual state transitions each get a **distinct, semantically appropriate icon** (lucide-react has the relevant ones — final selection in implementation, but the constraint is "clean, not over-decorated").

**Schema — new migration `supabase/migrations/00XX_invoice_activity_events.sql`**
- New table `invoice_events` (or extend the naming pattern from `email_events`):
  ```sql
  create type invoice_event_type as enum (
    'marked_as_sent',
    'marked_as_paid',
    'marked_as_overdue'
  );

  create table invoice_events (
    id          uuid primary key default gen_random_uuid(),
    invoice_id  uuid not null references invoices(id) on delete cascade,
    user_id     uuid not null references auth.users(id) on delete cascade,
    event_type  invoice_event_type not null,
    created_at  timestamptz not null default now()
  );

  create index invoice_events_invoice_id_idx on invoice_events (invoice_id, created_at desc);
  alter table invoice_events enable row level security;
  create policy "owner can read own invoice events" on invoice_events
    for select using (auth.uid() = user_id);
  ```
- Server-side writes only (service role) — no anon insert policy.
- **No backfill.** Pre-v1.4.10 invoices show only their email events; new manual transitions accumulate from the migration date forward. (Backfilling from `invoices.sent_at` etc. is possible but not worth the complication.)

**Server-action wiring**
- `publishAndMarkSent` writes a `marked_as_sent` row alongside the `sent_at` update.
- `markPaid` writes a `marked_as_paid` row.
- `markOverdue` writes a `marked_as_overdue` row.
- Failures to insert an `invoice_events` row are logged but do **not** block the primary state transition (mirrors the safeSend pattern in `email/send.ts`).

**Activity card — fetch + render**
- The card fetches both `email_events` and `invoice_events` for the invoice (single round trip if possible, otherwise two parallel queries) and merges them into one chronologically sorted list.
- Each row: small icon (left) · short label (e.g. "Email sent to ada@example.com" / "Marked as sent") · relative time (right, e.g. "2 hours ago") with a hover-tooltip showing the absolute timestamp.
- No new dependencies; lucide-react already provides Mail / Send / CheckCircle / Clock / AlertCircle.
- Visual rule: keep the row height tight, no per-row borders inside the card, no expandable rows. The card is a glanceable feed, not a debugger.

**Tests**
- [ ] Migration applied; `invoice_events` table + RLS policy present.
- [ ] `publishAndMarkSent` writes a `marked_as_sent` row in addition to the existing `sent_at` update.
- [ ] `markPaid` writes a `marked_as_paid` row.
- [ ] `markOverdue` writes a `marked_as_overdue` row.
- [ ] Activity card renders email events and manual events merged into one chronological list.
- [ ] Activity card uses the correct icon family for emails and a distinct icon per manual event.
- [ ] If `invoice_events` insert errors, the primary state transition still succeeds (smoke test).
- [ ] Card title is "Activity" / "Invoice Activity" (final wording — pick one and stick with it).

**Out of scope**
- Surfacing the activity feed anywhere outside the invoice detail page (e.g., a global activity stream).
- Backfilling pre-migration manual events from `invoices.sent_at`, status history, etc.
- Linking activity rows to "undo" or "view details" actions.

**Done when:** The invoice detail page has one consolidated **Activity** card showing both email attempts and the three manual state transitions, each with its own icon, ordered most-recent-first.

---

### ⏳ v1.4.11 — Overdue Automation

**Branch:** `v1.4.11/overdue-automation`

**Context:** Today "overdue" is a fully manual status — the owner has to remember to click "Mark as overdue" after a due date passes, and the "Mark as overdue" button is offered indiscriminately even on invoices with no due date or with a due date in the future. This branch formalises the four cases into a tight state machine and automates the common one (case #1).

**Cases (from the user)**
- Case #1 — Invoice has a due date **in the past** and is unpaid → auto-flip status to `overdue` without owner intervention.
- Case #2 — Invoice has a due date **in the future** and is unpaid → **no** "Mark as overdue" button anywhere.
- Case #3 — Invoice has **no due date** and is unpaid → "Mark as overdue" button available (on both dropdown and detail page).
- Case #4 — Invoice has **no due date** and is `overdue` → "Mark as pending" button available (reverses case #3).

**Scope**
- [ ] Case #1 automation — extend the existing background cron (`/api/cron/payment-sweep`) or add a sibling cron to also flip unpaid `pending` rows with `due_date < now()` to `overdue`. Update `decidePaymentSchedule` or add a second decision fn so the "mark as overdue" write happens alongside / independently of payment polling. Schema: no changes — `overdue` already exists in the status enum.
- [ ] Alternative considered: a scheduled DB job / trigger doing the status flip without Next.js involvement. Rejected for v1.4 because it splits the source of truth; keeping all state transitions in TypeScript is simpler to test.
- [ ] Cases #2 / #3 / #4 — conditional rendering of the "Mark as overdue" / "Mark as pending" buttons on both the invoice row dropdown and the detail page, based on `due_date` presence and current status. One source-of-truth helper (e.g. `src/lib/invoices/overdue-actions.ts`) with `canMarkAsOverdue(invoice)` / `canMarkAsPending(invoice)`.
- [ ] Update the status badge to show "Overdue" when auto-flipped (no code change likely needed — the badge reads from `status` — but visually verify).
- [ ] Email (maybe) — do we notify the owner on auto-flip? Deferred for this branch. Owner sees it on next dashboard load; Realtime picks it up. Add a note in the "Out of scope" section.

**Tests**
- [ ] `decidePaymentSchedule` (or new fn) — unit tests for: pending with future due date → no flip; pending with past due date → flip to overdue; payment_detected with past due date → do NOT flip (payment is in flight); no due date → no flip.
- [ ] Button visibility logic — test the helper for all 4 cases.
- [ ] Integration-ish test on the cron endpoint — inject a pending invoice with `due_date` 1 minute in the past, run the cron, assert status flips.

**Out of scope**
- Email notification for auto-overdue flip.
- Configurable grace period (e.g. "mark as overdue 3 days after due date"). For now, flip the instant `due_date < now()`.

**Done when:** An unpaid invoice with a past due date auto-flips to overdue at the next cron tick without owner action; the "Mark as overdue" and "Mark as pending" buttons appear on the correct surfaces only in the right states.

---

### ⏳ v1.4.12 — BTC Address Hardening

**Branch:** `v1.4.12/btc-address-hardening`

**Context:** Three related gaps in BTC address validation and mempool URL handling discovered during v1.4 testing:

1. **Deleted-invoice reuse.** An owner deletes an invoice that had an address. The uniqueness check (currently "no BTC address reuse across non-draft invoices") is implemented by counting rows in `invoices` — but deleted rows are hard-deleted, so the address becomes free again. A malicious or careless owner can re-publish the same address on a new invoice, which at best fragments payment detection and at worst lets a paid-for-real payment detect against a stale invoice.
2. **Already-used addresses.** A freelancer pastes in a BTC address that already has on-chain history (e.g. reuse from a previous wallet, or a known-public address). mempool.space's balance + tx history gives this away. We should reject addresses with any prior receive history at publish time — it defends against both false-positive detections (prior txs matching the BTC amount) and against weak operational security (address reuse leaks counterparty privacy).
3. **Mempool transaction URLs in emails are not network-aware.** The public invoice page and the payment-confirmed email both link to mempool.space for the detected tx, but the email hard-codes `https://mempool.space/tx/<txid>` while the UI uses a network-aware helper that emits `https://mempool.space/testnet4/tx/<txid>` on testnet. On testnet the email link 404s (or shows a stranger's mainnet tx of the same id, worse). The two surfaces must agree — both should call the same `mempoolTxUrl(txid)` helper that respects `NEXT_PUBLIC_BTC_NETWORK`.

**Scope — deleted-invoice reuse**
- [ ] Soft-delete existing invoices instead of hard-delete. Option A: add a `deleted` enum value to the `status` enum + a `deleted_at` timestamp column; `deleteInvoice` sets status and stamps the timestamp rather than calling `.delete()`. Option B: add a separate `deleted_at` column only, and filter every existing query by `where deleted_at is null`. Option A is cleaner; Option B is a smaller migration. Pick one in the branch; lean A.
- [ ] Update the BTC uniqueness check in `src/app/(dashboard)/invoices/actions.ts` to continue matching against soft-deleted rows (but with a clearer error message: "This address was used on a deleted invoice").
- [ ] Hide deleted rows from all dashboard views (list, detail, Realtime) — they are DB-only at this point.
- [ ] Alternative considered — "only allow hard delete if the invoice was never paid". Rejected because address-reuse risks apply even to unpaid published invoices (a payer could still pay against the stale address after deletion).

**Scope — pre-publish balance check**
- [ ] Add a publish-time call to `GET https://mempool.space/api/address/<addr>` (existing helper in `src/lib/mempool.ts`) and reject if `chain_stats.tx_count > 0` or `mempool_stats.tx_count > 0`. Include the reason in the error ("This address has already received transactions — use a fresh address for each invoice").
- [ ] Cache the mempool response briefly (or not at all — publish is not a hot path).
- [ ] Graceful failure: if mempool.space is unreachable, **allow** publish and log a warning. Do not block the owner on an external dependency. Add a test asserting this fallback.
- [ ] Make the check conditional on `NEXT_PUBLIC_BTC_NETWORK` so testnet addresses are checked against the testnet4 endpoint.

**Scope — network-aware mempool URLs everywhere**
- [ ] Audit every reference to `mempool.space` in the codebase (`grep -ri "mempool.space" src/`). Every one must go through a single helper (e.g. `mempoolTxUrl(txid)` / `mempoolAddressUrl(addr)` in `src/lib/mempool.ts`) that prepends `/testnet4` when `NEXT_PUBLIC_BTC_NETWORK=testnet4`.
- [ ] Replace the hard-coded `https://mempool.space/tx/<txid>` in the payment-confirmed email template (and any other email templates that link to mempool) with the helper. Confirm via grep that no other surface still hard-codes the URL.
- [ ] Test: render the payment-confirmed email under both `NEXT_PUBLIC_BTC_NETWORK=mainnet` and `=testnet4` and assert the link host/path matches what the public invoice page renders for the same tx.

**Tests**
- [ ] Uniqueness check against soft-deleted rows — publish, delete, try to re-publish same address → reject.
- [ ] Balance-check happy path — fresh address → accept.
- [ ] Balance-check rejection — address with existing tx history → reject with the specific message.
- [ ] Balance-check fallback — mempool down → accept with warning logged.
- [ ] Mempool URL parity — assert the email link and the UI link for the same `(txid, network)` are byte-identical.

**Done when:** An owner cannot re-use a BTC address from a deleted invoice, cannot publish an invoice against any address with any on-chain history (on whichever network is configured), and every mempool.space URL in the product (UI, emails, PDFs) is generated through a single network-aware helper.

---

### ⏳ v1.4.13 — Payment Detection Latency (no "Mark as Sent" path)

**Branch:** `v1.4.13/payment-detection-latency`

**Context:** In v1.3.3 we shipped the "Mark as Payment Sent" dialog which front-loads mempool.space polling (5×2s + 5×3s + 3×5s + 2×10s = 15 polls / 60s). When the payer clicks that button, detection is fast — 2–10 seconds typical. But when the payer *doesn't* click it (just pays and closes the tab, or doesn't notice the button), detection falls back to the passive WebSocket watcher (A) and the background cron (C). The WebSocket is usually instant — but if it drops, the fallback polling starts at 10s and exponentially backs off. And if the tab closes before the WebSocket sees the tx, the payer has to wait for the cron — which is minute-granular at best, and the first cron-side poll is scheduled for +1m post-publish.

Real-world testing showed end-to-end latency in the "paid without clicking the button" case ranged from 10s (lucky WebSocket) to a minute+ (cron-only). The ask is: can we narrow the gap?

**Research phase (pre-implementation)**
- [ ] Document the exact request path and timing of each of the four detection mechanisms A/B/C/D with a Chrome DevTools capture: what requests fire, when, against which endpoints.
- [ ] Compare the "button-clicked" path (B) vs the "button-not-clicked" path (A + C) to identify the gap. Specifically: is the passive WebSocket reliably catching 0-conf tx broadcasts, or is it often the cron that wins?
- [ ] Look at mempool.space rate limits per IP — are we leaving headroom to poll more aggressively from the client?

**Implementation options (pick after research)**
- [ ] Option 1: **Lower the passive WebSocket fallback-polling start** from 10s → 2s (mirroring the "button clicked" cadence for the first 10–30 seconds after page open). Simpler; doesn't require the payer to do anything.
- [ ] Option 2: **Auto-trigger the button-clicked polling schedule** as soon as the payer scans / reveals the BTC address, without waiting for them to click. Benefit: full 60s-tiered cadence starts the moment they commit to paying. Risk: extra mempool.space load for every viewer.
- [ ] Option 3: **Tighten the cron's first scheduled check** from +1m to +15s post-publish, so even a closed-tab payer gets sub-minute detection from the server side. Cost: cron runs at up to 15s granularity per invoice — well within rate limit.
- [ ] Option 4: Some combination. Likely 1 + 3.

**Tests**
- [ ] Whatever path is chosen: unit tests for the new cadence, integration test simulating "pay but don't click" to assert detection latency is within the new target.

**Done when:** With "paid but button not clicked" as the scenario, detection happens within a measurably better bound than today (target: < 15s p50, < 60s p95), documented in the README.

---

### ⏳ v1.4.14 — Fiat Payment Flow + Manual Confirmation + Mark-as-Unpaid

**Branch:** `v1.4.14/fiat-payment-and-manual-confirmation`

**Context:** Three tightly coupled features:

1. **Fiat payment flow.** Today the public invoice page only offers "Pay in Bitcoin". Real invoices get paid in fiat too — bank transfer, Wise, etc. There's no way for a client to mark that they paid, and no way for the owner to acknowledge a fiat payment.
2. **New `marked_as_paid` status.** A client self-reports payment (either via fiat, or via BTC to an address not known to the platform — e.g. they accidentally sent to a previous invoice's address and want to reconcile). The invoice sits in `marked_as_paid` until the owner confirms and promotes it to `paid`.
3. **Mark-as-unpaid — but only for manual confirmations.** If an invoice reached `paid` via on-chain detection (we saw the tx), reverting it to unpaid would require replacing the BTC address (else future detections collide with the old tx). If it reached `paid` via manual confirmation, reverting is safe — no on-chain footprint to worry about. Conditional revert logic keyed on *how* the invoice was confirmed.

**Schema changes — new migration `supabase/migrations/0010_fiat_and_manual_confirmation.sql`**

```sql
alter type invoice_status add value if not exists 'marked_as_paid';

create type payment_method as enum ('bitcoin', 'fiat', 'bitcoin_offchain');
create type payment_confirmation_method as enum ('onchain', 'manual');

alter table invoices add column payment_method payment_method;
alter table invoices add column payment_confirmation_method payment_confirmation_method;
alter table invoices add column paid_at timestamptz;
```

- `payment_method` — set when the invoice reaches `marked_as_paid` or `paid`. Nullable until then.
- `payment_confirmation_method` — `onchain` if we detected the tx ourselves, `manual` if either party reported it. Drives mark-as-unpaid eligibility.
- `paid_at` — stamped at the transition to `paid`. Distinct from `updated_at`.

**Payer flow**
- [ ] Add a "Pay with <currency>" button on the public invoice page alongside "Pay with Bitcoin", visible only when the invoice has a fiat total (i.e. always, right now).
- [ ] Clicking opens a dialog with the user-supplied copy: *"By clicking confirm, you are marking this invoice as paid. To avoid any confusion with the payee, please do not click confirm until after you have made payment."* Cancel / Confirm buttons.
- [ ] Confirm → server action sets `status = marked_as_paid`, `payment_method = fiat`, `payment_confirmation_method = manual`. Sends a new email variant ("Your client has marked this invoice as paid in <currency>") to the owner.
- [ ] The same flow can fire with `payment_method = bitcoin_offchain` if we want to offer an "I paid in BTC to a different address" option. Deferred to a follow-up unless requested — for v1.4.10, fiat only.

**Owner flow**
- [ ] Owner sees `marked_as_paid` status on their dashboard with a dedicated badge colour.
- [ ] Detail page + per-row dropdown get a "Confirm payment received" action → transitions to `paid` with same `payment_method` / `payment_confirmation_method` preserved. Also a "Dispute / revert" action → transitions back to `pending`.
- [ ] On `marked_as_paid → paid`, send the existing payment-confirmed email (now going to both parties per v1.4.4).

**Mark-as-unpaid gating**
- [ ] Refactor the existing "Mark as unpaid" button to only render when `payment_confirmation_method = 'manual'`. If `onchain`, either hide the button or show it disabled with a tooltip ("on-chain payments cannot be reverted — the address would need to be replaced to avoid future collisions"). Preferred: hide entirely; tooltip introduces noise.
- [ ] When reverting an `onchain`-confirmed invoice is genuinely needed (edge case: the owner knows the tx was unrelated), offer a separate "Replace BTC address and revert" flow — presents an address input, validates it (including the v1.4.8 balance check), updates both fields atomically, resets `payment_confirmation_method` to null. Deferred unless requested; not blocking v1.4.10.

**Status enum surface area**
- [ ] All existing UI that switches on `status` needs to handle `marked_as_paid` — status badge colour/label, filters on `/invoices`, the PDF renderer. Audit everywhere with `grep -r "'paid'" src/` and `grep -r "'payment_detected'" src/` — every place that has those cases needs a `marked_as_paid` case.

**Tests**
- [ ] Pure logic: the `onchain` vs `manual` gate for mark-as-unpaid.
- [ ] Server action: "client marks as paid in fiat" happy path; ownership check (can't mark-as-paid somebody else's invoice); idempotency (double-click doesn't double-email).
- [ ] Integration test — full fiat flow: payer marks, owner confirms, status ends at `paid` with `payment_method = fiat` and `payment_confirmation_method = manual`.
- [ ] Integration test — on-chain-confirmed invoice does not expose "Mark as unpaid".

**Out of scope (for this branch)**
- Multi-currency handling beyond the single currency stored on the invoice (v2.4 territory).
- "Replace BTC address and revert" flow (deferred).
- Partial payments (never supported today; still not).

**Done when:** A client can mark a fiat invoice as paid from the public page; the owner gets an email and can confirm it (→ `paid`) or revert it (→ `pending`); mark-as-unpaid is only offered for manual confirmations; every code path that switches on status handles the new enum value.

---

### ⏳ v1.4.15 — Rename Paybitty → SatSend

**Branch:** `v1.4.15/rename-to-satsend`

**Context:** The product has been renamed from **Paybitty** to **SatSend**. This is the rename branch — purely mechanical, no behaviour changes. Lands as the final patch in the v1.4 train so that the v1.5 design-system overhaul starts from a clean-branded codebase.

**Scope**
- [ ] `package.json` — `name` field (also affects lockfile; regenerate via `npm install`).
- [ ] All email templates in `src/lib/email/templates/*.tsx` — subject lines, body copy, preview text.
- [ ] All page metadata: `src/app/layout.tsx` (`title`, `description`, `openGraph`), per-route metadata, favicon + manifest if branded.
- [ ] Navbar logo text (`src/components/nav.tsx` or equivalent).
- [ ] All hard-coded UI copy — run `grep -ri "paybitty" src/` and address every hit. Common categories: loading states, toast text, button labels, empty-state illustrations' alt text.
- [ ] All docs: `README.md`, `CHANGELOG.md` (only in the current-version preamble, not historical entries — those stay for provenance), `AGENTS.md`, `CLAUDE.md`, `development/ROADMAP.md` (title line at the top), every file in `manual-tests/`.
- [ ] `.env.example` if it exists; comments inside `.env`; no actual secret values change.
- [ ] Branch naming convention — going forward, still `vX.Y.Z/<slug>`, the project name is not in the branch slug.
- [ ] Custom domain — if a `paybitty.*` domain was provisioned on Vercel, plan the cutover separately (Pre-deployment Checklist). Not in scope for this branch.

**Strategy**
- [ ] Run `grep -ril "paybitty" .` once to inventory every reference. Commit the inventory to the branch description for review, then fix in logical groups (docs / templates / UI copy / code comments).
- [ ] Be careful with **partial-word** matches — `PayBitty`, `paybitty`, `PAYBITTY`. A case-insensitive grep will catch them; run each variant through manual review since the replacement (`SatSend`) has a different capitalisation pattern.
- [ ] **Historical commits, CHANGELOG entries tagged for prior releases, and git tags** do NOT get rewritten — they document a point-in-time state. Only active/living copy gets updated.

**Tests**
- [ ] Typecheck + lint + existing test suite all green (no behavioural changes, so no new tests needed).
- [ ] Visual smoke: open every major page and confirm no stray "Paybitty" string is visible.
- [ ] Email smoke: publish a test invoice, confirm the subject line and body read "SatSend".

**Done when:** `grep -ril "paybitty" src/ app/ docs/ *.md *.json` returns zero matches (or only intentionally-preserved history entries in `CHANGELOG.md`); the visible product — UI, emails, PDFs, page titles, nav — reads "SatSend" everywhere.

---

### ⏳ v1.4.16 — Invoice Number Character Limit

**Branch:** `v1.4.16/invoice-number-char-limit`

**Context:** The invoice number field on the form (`/invoices/new` and `/invoices/[id]/edit`) is currently unbounded. Long values blow out table column widths on `/invoices`, wrap awkwardly on the public invoice page, and produce ugly subject lines in `invoice_published` emails ("Invoice ABCDEFGHIJKLMNOPQRSTUVWXYZ-2026-04-29-FOLLOWUP-V2 from …"). Cap at **30 characters** across the whole pipeline.

**Scope**
- [ ] DB-level constraint — migration `00XX_invoice_number_length.sql` adding a `CHECK (char_length(invoice_number) <= 30)` constraint to `invoices.invoice_number`. Audit existing rows first; if any are over 30 chars (`select id, invoice_number from invoices where char_length(invoice_number) > 30`), decide whether to truncate or reject the migration — most likely truncate with a `update` statement in the migration body, since the existing UI never enforced a limit and any over-length values are user-generated. Document the truncation policy in the migration comment.
- [ ] Form-level enforcement — `<Input maxLength={30}>` on the invoice-number field in `InvoiceForm` (`src/components/invoice-form.tsx` or wherever the field lives), plus a Zod / runtime check in the server actions (`createInvoice`, `updateInvoice`) returning a structured error if exceeded.
- [ ] Helper text — the form should show a small character counter or hint ("Max 30 characters") so the limit is discoverable, not a surprise.
- [ ] Audit display sites — confirm the table column, public invoice page, PDF, and all three email templates render cleanly with a 30-char value (no overflow, no clipping).

**Tests**
- [ ] Unit/integration test on the server action: passing a 31-char invoice number returns a validation error, 30-char passes.
- [ ] Form test: typing past 30 characters is blocked by `maxLength`.
- [ ] DB-level test (or manual): inserting a 31-char value via SQL is rejected by the CHECK constraint.

**Done when:** No code path — UI form, server action, or direct DB insert — accepts an invoice number longer than 30 characters.

---

### ⏳ v1.4.17 — Invoices Pagination State Preserved on Navigate-Away

**Branch:** `v1.4.17/invoices-pagination-state`

**Context (bug):** `/invoices` paginates server-side (TanStack `getPaginationRowModel`). If the owner is on page 3 of their invoices, opens an invoice (`/invoices/[id]`), and clicks "← Invoices" to return, the list resets to page 1. They have to navigate forward again to get back to where they were. Same problem if they navigate away and come back via the browser back button or the nav.

**Likely cause:** pagination state lives only in `useState` inside `InvoiceDataTable`. It's never reflected in the URL or persisted across mount/unmount, so the component re-mounts fresh on return.

**Scope**
- [ ] Choose a persistence approach. Options:
  - **URL search param (`?page=3`)** — simplest, shareable, plays well with App Router's `useSearchParams`. Preferred unless there's a strong reason against.
  - `sessionStorage` — survives navigation but not a hard refresh, and not URL-shareable. Reject.
  - Server-side pagination via Next.js search params — bigger lift; only if URL-param refactor is needed anyway.
- [ ] Wire up `useSearchParams` + `router.replace(?page=N)` in `data-table.tsx` so pagination changes update the URL, and initial state reads from the URL.
- [ ] Verify the same approach handles other transient state worth preserving on navigate-away — global filter (search box), archive toggle, sort. Decide per piece of state; the bug report is about pagination specifically but the fix is most coherent if applied consistently.
- [ ] Verify TanStack `pagination.pageIndex` ↔ URL stays in sync without infinite re-render loops.

**Tests**
- [ ] Component test: rendering `InvoiceDataTable` with `?page=2` initial route lands on page 2.
- [ ] Component test: clicking "Next" updates `?page=2` in the URL (mock `router.replace`).
- [ ] Manual test: navigate to page 3, open an invoice, click back, confirm still on page 3.

**Done when:** the dashboard pagination position is preserved across forward-and-back navigation, hard refresh, and direct URL-share, with the URL reflecting the current page.

---

### ⏳ v1.4.18 — Resend Webhook: Sent vs Delivered vs Bounced

**Branch:** `v1.4.18/resend-webhook`

**Context:** Today the app conflates "Resend accepted the send request" with "the recipient received the email". When `email_events.status='sent'`, all we actually know is that Resend's API returned success at send-time — the email may still bounce (bad address, full mailbox), be marked as spam, or never reach the inbox at all, and the owner has no signal that anything went wrong. The `/invoices` indicator shipped in v1.4.9 surfaces *send-time* failures (Resend rejected the request); this branch covers *post-acceptance* failures by subscribing to Resend's webhook lifecycle.

This branch closes the gap. After it lands, the **Email Activity** card distinguishes a "Sent" email (Resend accepted it) from a "Delivered" email (the recipient mailbox confirmed receipt) from a "Bounced" or "Marked as spam" email (post-acceptance failure).

**Schema**
- [ ] Migration: extend the `email_event_status` enum with `'delivered'`, `'bounced'`, `'complained'`. (Out of scope: `'opened'` / `'clicked'` — read-receipt territory, not delivery confirmation.)
- [ ] Migration: ensure an index on `email_events(resend_message_id)` exists, since the webhook looks up rows by it.

**Webhook endpoint**
- [ ] New route `POST /api/webhooks/resend` (Routing Middleware passthrough — payer routes are already public, this is just another public endpoint).
- [ ] Verifies the Svix signature. Resend uses Svix for webhook delivery; the request carries `svix-id`, `svix-timestamp`, and `svix-signature` headers, and the secret is provisioned per-endpoint in the Resend dashboard. Add `RESEND_WEBHOOK_SECRET` to `.env`, `.env.example`, and Vercel env (preview + production).
- [ ] Parses the event payload, looks up the `email_events` row by `resend_message_id`, and updates `status` + `updated_at`. For `email.bounced` / `email.complained` events, also captures the reason in `error_message`.
- [ ] **Idempotent.** Applying the same `svix-id` twice is a no-op. Status updates follow the lifecycle `queued → sent → delivered`, with `bounced` / `complained` allowed to overwrite `delivered` (a post-delivery complaint is a real and worse signal). Use a small `if (newStatus === currentStatus) return` short-circuit plus monotonic-or-overwrite logic on the lifecycle.
- [ ] Returns `2xx` on every recognised payload. Logs and returns `2xx` (not `5xx`) for unknown event types — Resend retries on `5xx`, so we don't want noise on events we don't care about.

**UI**
- [ ] **Email Activity card** (`src/app/(dashboard)/invoices/[id]/email-activity-card.tsx`) — extend `STATUS_LABEL`, `STATUS_CLASSES`, and `STATUS_CONFIG` maps with `delivered` (green check, "Delivered"), `bounced` (red, "Bounced"), `complained` (orange, "Marked as spam"). The `sent` badge becomes a transient signal — relabel to "Sent — awaiting delivery" or similar so the distinction is visible at a glance.
- [ ] **`/invoices` per-row indicator** (v1.4.9 `AlertCircle`) — extend the failed-state predicate from `status='failed'` to `status IN ('failed', 'bounced', 'complained')`. The `invoice_email_summary` view (v1.4.9 migration `0012`) doesn't need updating; it already exposes whatever status is in the row. Tooltip text should read accurately for each case ("Email failed to send", "Email bounced", "Email marked as spam") — likely a small map keyed off `last_publish_email_status`.

**Out of scope**
- `email.opened` / `email.clicked` events — read-receipt territory, not delivery confirmation. Tracked separately if ever needed.
- Retry / resend UX after a bounce — depends on the deferred "edit `client_email` post-publish + re-send" work.
- Dashboard counters or aggregates ("you have 3 bounced emails this week") — separable from the per-invoice surfacing.

**Tests**
- [ ] Unit (webhook): rejects requests with bad / missing Svix signature with a 401.
- [ ] Unit (webhook): applies an `email.delivered` event by flipping `email_events.status` from `sent → delivered` on the matching row.
- [ ] Unit (webhook): applies an `email.bounced` event by flipping `sent → bounced` and writing `error_message`.
- [ ] Unit (webhook): is idempotent — applying the same `svix-id` twice yields one effect.
- [ ] Unit (webhook): unknown event type logs and returns `2xx` (not `5xx`).
- [ ] Component (email-activity-card): renders the correct badge for `queued` / `sent` / `delivered` / `bounced` / `complained` / `failed` / `skipped_no_api_key`.
- [ ] Component (`/invoices`): per-row indicator renders for `bounced` and `complained` rows, not just `failed` rows.

**Pre-deployment checklist**
- [ ] Add `RESEND_WEBHOOK_SECRET` to Vercel env (production + preview).
- [ ] Configure the webhook endpoint in the Resend dashboard pointing at `https://<your-domain>/api/webhooks/resend`. Subscribe to `email.delivered`, `email.bounced`, `email.complained`. (`email.sent` is also fine but is a near-duplicate of the existing send-time write; subscribing is harmless and idempotent so include it for completeness.)
- [ ] Smoke test on preview: send a publish email to a known-bouncing address (e.g., `bounce@simulator.amazonses.com`) and confirm the row flips through `sent → bounced` within a few seconds, the activity card updates, and the `/invoices` indicator appears.

**Done when:** an owner can distinguish a "sent" email (Resend accepted) from a "delivered" email (recipient confirmed receipt), and a bounced or spam-marked email is surfaced in both the Email Activity card and the `/invoices` indicator without manual investigation. The README note at `notes:` under "Publish vs Send-via-email split" can be removed.

---

### ⏳ v1.5 — Design System Overhaul

**Branch:** `v1.5/design-system`

> **Block:** Colour scheme decision needed from you before implementation begins. See notes below.

**Colour scheme**
- [ ] DECISION: You to choose new colour scheme — current palette (near-black bg, dark surface, red `#DE3C4B` accent) lacks visual variety and makes it hard to differentiate button intent (e.g. primary action vs destructive vs secondary). New scheme should include at least one additional highlight colour and provide enough contrast between action types.
- [ ] Implement new colour scheme across CSS variables / Tailwind config
- [ ] Audit all buttons and badges to ensure each action type (primary, secondary, destructive, neutral) is visually distinct under the new scheme

**Light / dark mode**
- [ ] Add dark/light mode toggle to the navbar
- [ ] Ensure all components render correctly in both modes (Tailwind `dark:` variants)
- [ ] Persist mode preference to `localStorage`

**Done when:** Colour scheme decision is made and implemented, all button states are visually distinct, and both dark and light mode work correctly throughout the app.

---

### ⏳ v1.6 — Bitcoin Enhancements

**Branch:** `v1.6/btc-enhancements`

- [ ] Optional BTC discount field on invoice creation (% value, e.g. 5%)
- [ ] Discount only applies if the invoice is paid in Bitcoin — shown on the client payment view as a line item reducing the BTC amount
- [ ] Discount displayed on client view alongside the BTC amount (e.g. "5% BTC discount — save $X")
- [ ] Discount not reflected in the fiat total; it is a BTC-payment incentive only

**Done when:** A freelancer can offer a percentage discount to clients who pay in BTC, visible only on the payment view.

---

### ⏳ v1.7 — Address Format Standardisation

**Branch:** `v1.7/address-fields`

> **Note:** This branch changes the address data model. Should land before v2.3 (saved client/sender details) since those features depend on the address structure.

- [ ] Replace single freeform `your_address` / `client_address` text fields with structured fields: Line 1, Line 2, City, State/Province, Post Code, Country — following the UN/OASIS xNAL address standard ordering
- [ ] Schema migration: add individual address sub-columns (nullable); keep old `*_address` column for migration only, then drop after backfill
- [ ] Update invoice form with the new multi-field address layout
- [ ] Update invoice detail page (user view) and client payment view to render the structured address correctly
- [ ] No auto-fill or address lookup required

**Done when:** All address inputs are structured multi-field; old freeform address column removed; views render the structured address neatly.

---

## v2 — Growth (Billing + Ecosystem)

> Goal: Monetise the product and expand the creator experience.

---

### 🚫 v2.0 — Subscription Billing

**Branch:** `v2.0/billing`

- [ ] Lemon Squeezy integration
- [ ] Free tier enforcement: 5 invoices/month cap
- [ ] Paid tier: unlimited invoices
- [ ] BTC one-time payments for 1-month / 6-month / 1-year plans

---

### 🚫 v2.1 — OAuth

**Branch:** `v2.1/oauth`

- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] LinkedIn OAuth

---

### 🚫 v2.2 — Custom Subdomains + Branding

**Branch:** `v2.2/custom-subdomains`

- [ ] Wildcard subdomain routing (`yourcompany.paybitty.io`)
- [ ] Logo/branding upload (paid tier only)

---

### 🚫 v2.3 — Address Book + Reusable Items

**Branch:** `v2.3/address-book`

> **Depends on:** v1.7 (address format standardisation) — saved addresses use the structured multi-field format.

**Saved client details**
- [ ] User can save up to 5 client profiles (name, email, company, structured address, tax ID)
- [ ] Client selector on invoice creation form — choosing a saved client pre-fills all client fields
- [ ] Manage saved clients: add, edit, delete from a settings or clients page

**Saved sender (own) details**
- [ ] User can save one set of their own invoicing details (name, email, company, structured address, tax ID)
- [ ] "Your details" section on invoice creation pre-fills from saved profile if one exists
- [ ] User can update their saved details from settings

**Reusable items**
- [ ] Reusable service/line item templates

---

### 🚫 v2.4 — Multi-Currency Support

**Branch:** `v2.4/multi-currency`

- [ ] Currency selector on invoice creation (USD, EUR, GBP, AUD, CAD, etc.)
- [ ] BTC price fetched in the selected fiat currency
- [ ] Dashboard shows currency alongside invoice totals

---

## Notes

- Billing (v2.0+) is fully deferred until v1 is stable and in use.
- xpub / HD wallet support is permanently rejected — security risk if the key leaks.
- Light mode and colour scheme overhaul are tracked in v1.5.

---

## Pre-deployment Checklist

Project is not yet linked to Vercel. Before first deployment, run `vercel link` and mirror all `.env` values into Vercel project env vars (Production, Preview, Development):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (if used server-side)
- [ ] `RESEND_API_KEY` (added v1.4)
- [ ] `CRON_SECRET` (added v1.4.1) — bearer token the Vercel Cron endpoint validates. Vercel generates this when you configure the cron in the dashboard; mirror it into `.env.local` for local `curl` testing.
- [ ] **Verify a sending domain in the Resend dashboard** and set `EMAIL_FROM` to an address on that domain. Without a verified domain, Resend only delivers to the email address on the Resend account itself — sends to any other recipient (clients, test addresses) return a 422 and the email never arrives. This is a Resend free-tier safety rail, not a Paybitty bug.
- [ ] **Sender identity unified (v1.4.4)** — set `EMAIL_FROM="SatSend <team@mail.satsend.me>"` in `.env` and in Vercel project env vars (Production, Preview, Development). Confirm the Supabase custom SMTP "Sender" address (dashboard → Project Settings → Auth → SMTP Settings → Sender) is set to the same `team@mail.satsend.me` so transactional mail and auth mail share a single `From:` identity.
- [x] **Supabase custom SMTP → Resend** — configured 2026-04-24 in Supabase dashboard (Project Settings → Auth → SMTP Settings) pointing at `smtp.resend.com:465` with the `RESEND_API_KEY` as the password and a sender on the verified `mail.satsend.me` domain. This routes all Supabase auth emails (magic link, signup confirmation, password reset) through Resend and bypasses Supabase's default ~4/hour rate limit. Project-level setting — applies to both local dev and production automatically.
- [ ] Any other secrets present in `.env` at deploy time
