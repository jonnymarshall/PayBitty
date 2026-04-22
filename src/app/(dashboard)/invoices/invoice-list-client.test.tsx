import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InvoiceListClient } from "./invoice-list-client";

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

describe("InvoiceListClient — checkboxes", () => {
  it("renders a checkbox for each non-archived invoice", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    const checkboxes = screen.getAllByRole("checkbox");
    // 3 non-archived + 1 select-all = 4
    expect(checkboxes.length).toBe(4);
  });

  it("renders a select-all checkbox in the header", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    expect(screen.getByRole("checkbox", { name: /select all/i })).toBeInTheDocument();
  });
});

describe("InvoiceListClient — bulk action bar", () => {
  it("hides the bulk action bar when nothing is selected", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    expect(document.getElementById("invoice-list--bulk-bar")).not.toBeInTheDocument();
  });

  it("shows the bulk action bar when at least one invoice is selected", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // first row checkbox
    expect(document.getElementById("invoice-list--bulk-bar")).toBeInTheDocument();
  });

  it("shows archive, delete and mark as paid actions in the bar", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(screen.getByRole("button", { name: /^archive$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark as paid/i })).toBeInTheDocument();
  });

  it("select-all selects all non-archived invoices", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /select all/i }));
    const rowCheckboxes = screen.getAllByRole("checkbox").filter(
      (cb) => !(cb as HTMLInputElement).name?.includes("select-all")
    );
    rowCheckboxes.slice(1).forEach((cb) => {
      expect((cb as HTMLInputElement).checked).toBe(true);
    });
  });
});

describe("InvoiceListClient — bulk actions", () => {
  it("calls bulkArchive with selected ids when Archive is clicked", async () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // select inv-1
    fireEvent.click(screen.getByRole("button", { name: /^archive$/i }));
    await waitFor(() => expect(bulkArchive).toHaveBeenCalledWith(["inv-1"]));
  });

  it("calls bulkMarkPaid with selected ids when Mark as Paid is clicked", async () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // select inv-1
    fireEvent.click(screen.getByRole("button", { name: /mark as paid/i }));
    await waitFor(() => expect(bulkMarkPaid).toHaveBeenCalledWith(["inv-1"]));
  });

  it("calls bulkDelete with selected ids when Delete is confirmed", async () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // select inv-1 (draft)
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    // confirm dialog should appear
    const confirmBtn = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(bulkDelete).toHaveBeenCalledWith(["inv-1"]));
  });
});

describe("InvoiceListClient — archive toggle", () => {
  it("hides archived invoices by default", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    expect(screen.queryByText("Umbrella")).not.toBeInTheDocument();
  });

  it("shows a toggle to reveal archived invoices", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    expect(screen.getByRole("button", { name: /show archived/i })).toBeInTheDocument();
  });

  it("shows archived invoices after toggling", () => {
    render(<InvoiceListClient invoices={MOCK_INVOICES} />);
    fireEvent.click(screen.getByRole("button", { name: /show archived/i }));
    expect(screen.getByText("Umbrella")).toBeInTheDocument();
  });
});
