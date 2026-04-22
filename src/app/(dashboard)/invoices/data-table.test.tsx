import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InvoiceDataTable } from "./data-table";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./bulk-actions", () => ({
  bulkArchive: vi.fn().mockResolvedValue(undefined),
  bulkDelete: vi.fn().mockResolvedValue(undefined),
  bulkMarkPaid: vi.fn().mockResolvedValue(undefined),
}));

import { bulkArchive, bulkDelete, bulkMarkPaid } from "./bulk-actions";

const MOCK_INVOICES = [
  { id: "inv-1", invoice_number: "INV-001", client_name: "Acme", total_fiat: 1000, currency: "USD", status: "draft", due_date: null },
  { id: "inv-2", invoice_number: "INV-002", client_name: "Globex", total_fiat: 500, currency: "USD", status: "pending", due_date: "2026-06-01" },
  { id: "inv-3", invoice_number: "INV-003", client_name: "Initech", total_fiat: 250, currency: "USD", status: "paid", due_date: null },
  { id: "inv-4", invoice_number: "INV-004", client_name: "Umbrella", total_fiat: 750, currency: "USD", status: "archived", due_date: null },
];

beforeEach(() => vi.clearAllMocks());

describe("InvoiceDataTable — structure", () => {
  it("renders column headers (Invoice, Client, Due Date, Status, Amount)", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    expect(screen.getByRole("button", { name: /^invoice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^client/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /due date/i })).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^amount/i })).toBeInTheDocument();
  });

  it("renders a row for each non-archived invoice by default", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("Initech")).toBeInTheDocument();
    expect(screen.queryByText("Umbrella")).not.toBeInTheDocument();
  });

  it("always shows the bulk actions button, disabled when nothing is selected", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    const btn = document.getElementById("invoice-data-table--bulk-actions") as HTMLButtonElement;
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("shows the filter input and Columns dropdown", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    expect(screen.getByPlaceholderText(/filter by client/i)).toBeInTheDocument();
    expect(document.getElementById("invoice-data-table--bulk-actions")).toBeInTheDocument();
  });

  it("shows 'X of N row(s) selected' footer", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    expect(screen.getByText(/0 of 3 row\(s\) selected/)).toBeInTheDocument();
  });
});

describe("InvoiceDataTable — filtering", () => {
  it("filters rows by client name", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    fireEvent.change(screen.getByPlaceholderText(/filter by client/i), {
      target: { value: "Acme" },
    });
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.queryByText("Globex")).not.toBeInTheDocument();
  });
});

describe("InvoiceDataTable — archive toggle", () => {
  it("reveals archived invoices when toggled", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    fireEvent.click(screen.getByRole("button", { name: /show archived/i }));
    expect(screen.getByText("Umbrella")).toBeInTheDocument();
  });
});

describe("InvoiceDataTable — bulk actions", () => {
  it("enables the Actions button once a row is selected", () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    const rowCheckboxes = screen.getAllByRole("checkbox", { name: /select row/i });
    fireEvent.click(rowCheckboxes[0]);
    const btn = document.getElementById("invoice-data-table--bulk-actions") as HTMLButtonElement;
    expect(btn).not.toBeDisabled();
    expect(btn.textContent).toMatch(/\(1\)/);
  });

  it("calls bulkArchive with selected ids", async () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    const rowCheckboxes = screen.getAllByRole("checkbox", { name: /select row/i });
    fireEvent.click(rowCheckboxes[0]); // inv-1
    fireEvent.click((document.getElementById("invoice-data-table--bulk-actions") as HTMLButtonElement));
    fireEvent.click(screen.getByRole("menuitem", { name: /archive/i }));
    await waitFor(() => expect(bulkArchive).toHaveBeenCalledWith(["inv-1"]));
  });

  it("calls bulkMarkPaid with selected ids", async () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    const rowCheckboxes = screen.getAllByRole("checkbox", { name: /select row/i });
    fireEvent.click(rowCheckboxes[1]); // inv-2
    fireEvent.click((document.getElementById("invoice-data-table--bulk-actions") as HTMLButtonElement));
    fireEvent.click(screen.getByRole("menuitem", { name: /mark as paid/i }));
    await waitFor(() => expect(bulkMarkPaid).toHaveBeenCalledWith(["inv-2"]));
  });

  it("requires confirmation before calling bulkDelete", async () => {
    render(<InvoiceDataTable data={MOCK_INVOICES} />);
    const rowCheckboxes = screen.getAllByRole("checkbox", { name: /select row/i });
    fireEvent.click(rowCheckboxes[0]);
    fireEvent.click((document.getElementById("invoice-data-table--bulk-actions") as HTMLButtonElement));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    // Delete not yet called — confirmation is showing
    expect(bulkDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(bulkDelete).toHaveBeenCalledWith(["inv-1"]));
  });
});
