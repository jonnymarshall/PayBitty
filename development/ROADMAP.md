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

### ⏳ v1.2 — Client Payment View + BTC QR Code

**Branch:** `v1.2/client-payment-view`

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
- Light mode is optional and not scheduled.
