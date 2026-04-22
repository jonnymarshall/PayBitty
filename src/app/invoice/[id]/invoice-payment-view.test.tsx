import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InvoicePaymentView } from "./invoice-payment-view";
import type { Invoice } from "@/lib/invoice-public";

vi.mock("@/lib/btc-network", () => ({
  getMempoolBaseUrl: () => "https://mempool.space",
  getMempoolWsUrl: () => "wss://mempool.space/testnet4/api/v1/ws",
}));
vi.mock("./payment-watcher", () => ({ PaymentWatcher: () => null }));
vi.mock("@/components/btc-qr-code", () => ({ BtcQrCode: () => <div data-testid="btc-qr" /> }));
vi.mock("./mark-sent-button", () => ({ MarkSentButton: () => null }));

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
  it("shows 'Date Sent:' label with formatted date", () => {
    render(<InvoicePaymentView invoice={BASE_INVOICE} btcPrice={null} />);
    expect(screen.getByText(/date sent:/i)).toBeInTheDocument();
    expect(screen.getByText(/apr(il)? 15,? 2026/i)).toBeInTheDocument();
  });

  it("shows 'Date Due:' label with formatted date when due_date is present", () => {
    render(<InvoicePaymentView invoice={BASE_INVOICE} btcPrice={null} />);
    expect(screen.getByText(/date due:/i)).toBeInTheDocument();
    expect(screen.getByText(/may 15,? 2026/i)).toBeInTheDocument();
  });

  it("shows 'No due date' when due_date is null", () => {
    render(<InvoicePaymentView invoice={{ ...BASE_INVOICE, due_date: null }} btcPrice={null} />);
    expect(screen.getByText(/no due date/i)).toBeInTheDocument();
  });
});

describe("InvoicePaymentView — BTC reveal", () => {
  const BTC_INVOICE: Invoice = {
    ...BASE_INVOICE,
    accepts_bitcoin: true,
    btc_address: "tb1qtarget",
    status: "pending",
  };

  it("shows 'Pay now in Bitcoin' reveal button and hides the QR by default on a pending invoice", () => {
    render(<InvoicePaymentView invoice={BTC_INVOICE} btcPrice={50000} />);
    expect(screen.getByRole("button", { name: /pay now in bitcoin/i })).toBeInTheDocument();
    expect(screen.queryByTestId("btc-qr")).not.toBeInTheDocument();
  });

  it("reveals QR code + address after clicking 'Pay now in Bitcoin'", () => {
    render(<InvoicePaymentView invoice={BTC_INVOICE} btcPrice={50000} />);
    fireEvent.click(screen.getByRole("button", { name: /pay now in bitcoin/i }));
    expect(screen.getByTestId("btc-qr")).toBeInTheDocument();
    expect(screen.getByText(/tb1qtarget/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay now in bitcoin/i })).not.toBeInTheDocument();
  });

  it("auto-reveals QR details when the invoice is already payment_detected", () => {
    render(<InvoicePaymentView invoice={{ ...BTC_INVOICE, status: "payment_detected" }} btcPrice={50000} />);
    expect(screen.getByTestId("btc-qr")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay now in bitcoin/i })).not.toBeInTheDocument();
  });

  it("auto-reveals QR details when the invoice is already paid", () => {
    render(<InvoicePaymentView invoice={{ ...BTC_INVOICE, status: "paid" }} btcPrice={50000} />);
    expect(screen.getByTestId("btc-qr")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay now in bitcoin/i })).not.toBeInTheDocument();
  });
});
