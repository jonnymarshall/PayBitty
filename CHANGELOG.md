# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
