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

### ⏳ v1.2 — Client Payment View + BTC QR Code

**Branch:** `v1.2/client-payment-view`

> Note: `/invoice/[id]` currently shows a "Client payment view coming soon" stub. This branch replaces it with the full implementation.

- [ ] Public route `/invoice/[id]` with access code gate
- [ ] BTC price fetching API: `GET /api/btc-price?currency=USD` (Coinbase primary, CoinGecko fallback, ~60s server-side cache)
- [ ] BTC amount computed from live price at view time
- [ ] BIP21 QR code generated (`bitcoin:<address>?amount=<btc>&label=<label>`)
- [ ] Client view: invoice details, fiat total, BTC amount, QR code

**Done when:** A client can open a link, enter an access code, see the invoice, and scan a QR code to pay.

---

### ⏳ v1.3 — Payment Detection

**Branch:** `v1.3/payment-detection`

- [ ] mempool.space WebSocket connection opened client-side on the payment view page
- [ ] 0-conf event: update invoice status to `payment_detected`
- [ ] 1-conf event: update invoice status to `paid`
- [ ] Fallback: exponential backoff polling (30s start, doubles, caps ~10min)
- [ ] On login: sweep all `pending` / `payment_detected` invoices for the user to catch missed events
- [ ] WebSocket closed once invoice reaches `paid`
- [ ] Real-time status UI update on client payment page

**Done when:** Payment detection works end-to-end with live and fallback paths.

---

### ⏳ v1.4 — PDF Generation + Email Notifications

**Branch:** `v1.4/pdf-and-email`

- [ ] Resend + React Email configured
- [ ] Email: invoice link + access code sent to client on publish
- [ ] Email: payment detected notification to creator (0-conf)
- [ ] Email: payment confirmed notification to creator (1+ conf)
- [ ] PDF generation with `@react-pdf/renderer` (server-side)
- [ ] PDF download available from invoice detail view

**Done when:** All transactional emails send correctly and PDFs are downloadable.

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

- [ ] Saved contacts (client name, email, defaults)
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
