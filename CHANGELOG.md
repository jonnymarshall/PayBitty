# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2026-04-21

### Added
- `/invoices` list rebuilt as a shadcn Data Table (TanStack Table) with proper column headers, per-column sorting, row selection checkboxes, and column visibility toggle
- Always-visible toolbar: client-name filter input, Bulk actions dropdown (disabled until rows are selected), Show/Hide archived toggle, Columns dropdown
- Sortable columns: Invoice, Client, Due Date, Amount
- Per-row actions menu (⋯) with View / Mark as paid / Archive / Delete
- Pagination footer with "X of N row(s) selected" and Previous/Next controls
- Bulk actions (Archive, Mark as Paid, Delete) operate on selected rows; Delete shows an inline "This cannot be undone" confirmation
- `archived` status added to the invoice status enum; archived rows hidden by default with a toggle to reveal them
- `bulkArchive`, `bulkDelete`, `bulkMarkPaid` server actions with ownership scoping
- Migration `0004_add_archived_status.sql` adds `archived` to the Postgres `invoice_status` enum
- shadcn components: `table`, `checkbox`, `dropdown-menu`, `input`; dependency `@tanstack/react-table`

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
