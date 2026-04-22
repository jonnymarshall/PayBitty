# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-04-22

### Added
- **Login sweep** — on dashboard mount (once per tab session), check every `pending` / `payment_detected` invoice against mempool.space to catch status transitions that happened while the user was offline. Confirmed-on-chain → `paid`; unconfirmed but broadcast → `payment_detected`. Clears the deferred item from v1.3.
- **Invoice PDF generation** — server-side rendering with `@react-pdf/renderer`. Exposes `renderInvoicePdf(invoice)` → `Buffer` with headers for parties, line items, totals, and the BTC payment block when `accepts_bitcoin` is true.
- **PDF download** — `GET /api/invoices/[id]/pdf` returns the invoice as `application/pdf`, auth-gated to the owner (scoped on both `id` and `user_id` so an attacker can't enumerate). New `Download PDF` button on `/invoices/[id]` for non-draft invoices.
- **Transactional emails** via Resend + React Email:
  - On publish → invoice link + access code sent to `client_email`.
  - On transition to `payment_detected` (0-conf) → notification to the invoice creator.
  - On transition to `paid` (1+ conf) → confirmation to the invoice creator.
  - Emails fire from both the client-side watcher path (`/api/invoices/[id]/payment-status`) and the login sweep, so the creator gets notified whether they were online or away.
  - Configured via `RESEND_API_KEY`. Missing key → email sends are silently skipped (a warning is logged) so the app still works in dev without email.
- `EMAIL_FROM` env var (optional, defaults to `Paybitty <onboarding@resend.dev>`), `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` env var (optional, for building absolute links in emails).

### Notes
- Pre-deployment checklist added to `development/ROADMAP.md` — `RESEND_API_KEY` and other `.env` values need to be mirrored into Vercel project env vars before first deploy.
- Email dispatch uses a `safeSend` wrapper that catches and logs errors without failing the parent action — a broken email provider will never block a publish or a payment transition.

## [1.3.6] - 2026-04-22

### Added
- `/invoice/[id]` public payment view: copy button next to the BTC amount — one-click copy of the exact displayed amount (e.g. `0.01`, trimmed of trailing zeros) with the same "Copied" feedback used on the share-link copy button.
- `/invoice/[id]` public payment view: copy button next to the BTC address — one-click copy of the full address with the same "Copied" feedback.
- `CopyButton` gains an optional `label` prop that sets both `aria-label` and `title`, so multiple copy buttons on the same view remain distinguishable to screen readers and end users.

### Notes
- Password-manager icon suppression on `/invoices/new` identity fields was attempted (`data-lpignore`, `data-1p-ignore`, `autoComplete="off"`, `data-form-type="other"`) but reverted — LastPass injects its icon regardless when a field's label/id matches its autofill heuristics (name/email/company). The only workarounds that work (`type="search"` on identity fields, or dropping `type="email"`) break HTML semantics and native validation, so this item is marked won't-fix in the roadmap.

## [1.3.5] - 2026-04-22

### Added
- `Unarchive` action on the `/invoices` per-row dropdown for archived rows — reverts status to `pending` so the invoice rejoins the main list.
- `Clear Selected` button in the `/invoices` toolbar — visible whenever one or more rows are selected; clicking it clears the row-selection state without affecting filters or the archived toggle.
- `/invoices/[id]` dashboard detail page now mirrors every per-row dropdown action as an explicit button row at the bottom of the page (status-aware): Edit (draft), View public invoice + Copy public link (non-draft), Mark as sent (draft), Mark as paid, Archive / Unarchive, Duplicate, Delete. The existing dropdown on the list stays as-is; the detail page gets its own button surface.

### Changed
- Unarchiving now restores the original status (a paid invoice comes back as paid, an overdue one comes back as overdue) instead of defaulting to `pending`. Migration `0007_add_pre_archive_status.sql` adds a nullable `pre_archive_status` column that `bulkArchive` captures and `bulkUnarchive` consumes. Legacy archived rows with a NULL `pre_archive_status` fall back to `pending` on unarchive.
- Removed the redundant "Copy public link" button from the `/invoices/[id]` detail action row. The page's "Share with client" section already has a dedicated copy button next to the invoice URL, so the duplicate action row button was noise.

### Fixed
- Archiving a draft invoice no longer throws a `duplicate key value violates unique constraint "invoices_btc_address_active_idx"` error. The Archive action is now hidden on drafts in both the list dropdown and the detail page, and `bulkArchive` silently excludes drafts server-side (a pre-fetch filter on `status NOT IN ('draft','archived')`) as defense-in-depth for mixed bulk selections. Drafts aren't a valid thing to archive anyway — use Delete instead.

## [1.3.4] - 2026-04-22

### Added
- `Duplicate` action on the `/invoices` per-row dropdown — clones any invoice (draft, pending, paid, archived, etc.) into a fresh draft and navigates the user straight to the new invoice's edit page. Replaces the `Duplicate 🚩` placeholder shipped in v1.3.2.
- `duplicateInvoice(id)` server action copies all source fields into a new row with `status=draft`, clears `btc_address` and `btc_txid` (BTC addresses can't be reused across active invoices), preserves `access_code`, and appends ` (copy)` to `invoice_number` when the source has one (otherwise leaves it null). Access is scoped to the owning user.

### Changed
- Dropdown label `Duplicate 🚩` → `Duplicate` (placeholder flag removed).

## [1.3.3] - 2026-04-22

### Added
- `/invoices` list now live-updates via Supabase Realtime — when a payer's BTC payment is detected on the public invoice view, the freelancer's list row flips from "Pending" to "Payment Detected" within ~1s, without a manual refresh. Also covers INSERT and DELETE (new invoices from another tab, archives, bulk deletes). Works by subscribing the data-table to `postgres_changes` on `public.invoices` (RLS scopes events to the signed-in user) and calling `router.refresh()` on each event so the server component re-fetches fresh rows.
- `/invoices/[id]` dashboard detail page also live-updates via Supabase Realtime with a narrower filter (`id=eq.<invoiceId>`). Status badge, transaction ID link, and the action menu all reflect the current DB state within ~1s of the payer's confirmation — no manual refresh. A `key={invoice.status}` was added to the page's `PaymentWatcherUncontrolled` so its internal state resets when the server re-renders with a fresh status (prevents stale-badge edge case when another device detected the payment).
- Migration `0005_enable_invoices_realtime.sql` — adds `public.invoices` to the `supabase_realtime` publication so Realtime events are emitted. RLS policies (already in place) continue to scope events to the signed-in user.
- Migration `0006_invoices_replica_identity_full.sql` — sets `REPLICA IDENTITY FULL` on `public.invoices` so UPDATE events carry all column values. Supabase Realtime needs this for reliable event delivery when RLS policies inspect columns beyond the primary key.
- Realtime hook explicitly calls `supabase.realtime.setAuth(access_token)` before subscribing, closing a race where Realtime would connect unauthenticated and have events silently dropped by RLS.
- Realtime hook has a `visibilitychange` fallback: when the tab regains focus, it calls `router.refresh()` so the list still catches up if a Realtime event was ever missed.
- Diagnostic logging in the Realtime hook (`[invoice-realtime] ...`) — subscribe status, event receipt, and auth state — makes future connection issues easier to diagnose from the browser console.
- "Pay now in Bitcoin" reveal button on the public invoice view — QR code and address are now hidden behind an explicit click so the payer can review the invoice first. Auto-reveals if the invoice is already `payment_detected` or `paid` (so the txid link is visible without the extra click).
- "Mark as Payment Sent" button (shown once payment details are revealed) opens a dialog that actively polls mempool.space over 60 seconds with a front-loaded tiered schedule (15 polls: 5x2s + 5x3s + 3x5s + 2x10s)
- Polling dialog has three states: polling (with progress bar + "Cancel" button and helper text "Click here if you have not yet made the Bitcoin payment"), detected ("Your payment has been detected" with "OK"), and timed-out (with a link to view the address on mempool.space)
- When a payment is detected mid-polling, the progress bar animates to 100% for ~400ms before the dialog flips to the detected view — the payer gets a clear visual beat for the confirmation
- Detected dialog auto-opens even when the payer never clicked "Mark as Payment Sent" — if the background watcher catches the payment, the dialog still pops so the confirmation is unmistakable

### Changed
- `PaymentWatcher` is now a controlled component (accepts `status` + `onStatusChange` props instead of `initialStatus`); status is owned by the parent so the reveal button, the polling dialog, and the background watcher all stay in sync
- Background watcher's fallback polling first-delay reduced from 30s to 10s (still exponential backoff up to 10 minutes) so page-reload and long-open tab detection recovers faster when the WebSocket fails
- Added `console.warn` in the WebSocket `onerror` handler to surface testnet4 flakiness in the browser console

### Added (internal)
- `PaymentWatcherUncontrolled` wrapper for use in server-rendered pages that want the old "manages its own state" API (used by the dashboard invoice detail page)

## [1.3.2] - 2026-04-21

### Added
- `/invoices` list rebuilt as a shadcn Data Table (TanStack Table) with proper column headers, per-column sorting, row selection checkboxes, and column visibility toggle
- Always-visible toolbar: filter input (searches invoice # and client), Bulk actions dropdown (disabled until rows are selected), Show/Hide archived toggle, Columns dropdown
- Columns in order: Invoice, Client, Date Sent, Date Due, Amount, Status (all except Status sortable)
- Per-row actions menu (⋯) with status-aware items: View invoice, Edit (draft), View public invoice / Copy public link (non-draft), Mark as sent (draft), Mark as paid, Archive, Duplicate 🚩 (placeholder, tracked in v1.3.3), Delete
- Bulk actions dropdown: Mark as paid, Archive, Delete (same order as per-row actions)
- Delete confirmation now uses shadcn AlertDialog instead of the native browser prompt
- Pagination footer with "X of N invoices selected" and Previous/Next controls
- `archived` status added to the invoice status enum; archived rows hidden by default with a toggle to reveal them
- `bulkArchive`, `bulkDelete`, `bulkMarkPaid` server actions with ownership scoping
- Migration `0004_add_archived_status.sql` adds `archived` to the Postgres `invoice_status` enum
- shadcn components: `table`, `checkbox`, `dropdown-menu`, `input`, `alert-dialog`; dependency `@tanstack/react-table`

## [1.3.1] - 2026-04-21

### Added
- Invoice detail page now shows "Date Sent" and "Date Due" in the header area
- Client payment view now shows "Date Sent" alongside the existing "Due" date
- Invoice list now shows due date with "Due" prefix instead of creation date; invoices with no due date show "—"

### Fixed
- Due date formatting across all views now handles date-only strings correctly (no off-by-one-day in western timezones)
- Dashboard redirect test updated to reflect the `/dashboard` → `/invoices` redirect behaviour

## [1.1.5] - 2026-04-19

### Fixed
- Navbar "Paybitty" logo now links to `/invoices`
- Qty line item field rejects values above 100,000 or more than 2 decimal places
- Unit price line item field rejects values above 1,000,000,000 or more than 2 decimal places
- Date picker popover now renders at correct width (was incorrectly constrained to `w-auto`)
- Added `id` attributes to key UI elements across all pages for accessibility and testing
