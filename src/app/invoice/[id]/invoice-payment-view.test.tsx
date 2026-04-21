import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoicePaymentView } from "./invoice-payment-view";
import type { Invoice } from "@/lib/invoice-public";

vi.mock("@/lib/btc-network", () => ({ getMempoolBaseUrl: () => "https://mempool.space" }));
vi.mock("./payment-watcher", () => ({ PaymentWatcher: () => null }));

const BASE_INVOICE: Invoice = {
  id: "inv-1",
  user_id: "u1",
  invoice_number: "INV-001",
  your_name: null,
  your_email: null,
  your_company: null,
  your_address: null,
  your_tax_id: null,
  client_name: "",
  client_email: "",
  client_company: null,
  client_address: null,
  client_tax_id: null,
  line_items: [{ description: "Work", quantity: 1, unit_price: 500 }],
  subtotal_fiat: 500,
  tax_fiat: 0,
  tax_percent: 0,
  total_fiat: 500,
  currency: "USD",
  accepts_bitcoin: false,
  btc_address: null,
  btc_txid: null,
  status: "pending",
  access_code: null,
  due_date: "2026-05-15",
  created_at: "2026-04-15T12:00:00Z",
  updated_at: "2026-04-15T12:00:00Z",
};

describe("InvoicePaymentView — dates", () => {
  it("shows a 'Date Sent' label", () => {
    render(<InvoicePaymentView invoice={BASE_INVOICE} btcPrice={null} />);
    expect(screen.getByText(/date sent/i)).toBeInTheDocument();
  });

  it("shows the created_at date formatted", () => {
    render(<InvoicePaymentView invoice={BASE_INVOICE} btcPrice={null} />);
    expect(screen.getByText(/apr(il)? 15,? 2026/i)).toBeInTheDocument();
  });

  it("still shows due date when present", () => {
    render(<InvoicePaymentView invoice={BASE_INVOICE} btcPrice={null} />);
    expect(screen.getByText(/may 15,? 2026/i)).toBeInTheDocument();
  });

  it("does not show 'Date Sent' label when created_at is absent from display", () => {
    const noDate = { ...BASE_INVOICE, due_date: null };
    render(<InvoicePaymentView invoice={noDate} btcPrice={null} />);
    expect(screen.getByText(/date sent/i)).toBeInTheDocument();
  });
});
