import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PaymentWatcher } from "./payment-watcher";

// Mock WebSocket to avoid real connections in tests
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor() {
    setTimeout(() => this.onopen?.(), 0);
  }
}
vi.stubGlobal("WebSocket", MockWebSocket);

// Mock mempool module
const mockFetchAddressTxs = vi.fn();
vi.mock("@/lib/mempool", () => ({
  fetchAddressTxs: (...a: unknown[]) => mockFetchAddressTxs(...a),
  txPaysToAddress: (tx: { vout: { scriptpubkey_address?: string }[] }, addr: string) =>
    tx.vout.some((o) => o.scriptpubkey_address === addr),
}));

// Mock btc-network
vi.mock("@/lib/btc-network", () => ({
  getMempoolWsUrl: () => "wss://mempool.space/testnet4/api/v1/ws",
}));

const unconfirmedTx = {
  txid: "tx1",
  status: { confirmed: false },
  vout: [{ scriptpubkey_address: "tb1qtarget", value: 50000 }],
};
const confirmedTx = { ...unconfirmedTx, status: { confirmed: true, block_height: 100 } };

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchAddressTxs.mockResolvedValue([]);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ status: "payment_detected" }), { status: 200 })
  );
});
afterEach(() => vi.restoreAllMocks());

describe("PaymentWatcher", () => {
  it("renders the status badge from props", () => {
    render(
      <PaymentWatcher
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
      />
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("does not poll when already paid", async () => {
    render(
      <PaymentWatcher
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="paid"
        onStatusChange={() => {}}
      />
    );
    expect(screen.getByText("Paid")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetchAddressTxs).not.toHaveBeenCalled();
  });

  it("calls onStatusChange with payment_detected when it finds an unconfirmed tx on mount", async () => {
    const onStatusChange = vi.fn();
    mockFetchAddressTxs.mockResolvedValueOnce([unconfirmedTx]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "payment_detected" }), { status: 200 })
    );

    render(
      <PaymentWatcher
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith("payment_detected"));
  });

  it("calls onStatusChange with paid when it finds a confirmed tx on mount", async () => {
    const onStatusChange = vi.fn();
    mockFetchAddressTxs.mockResolvedValueOnce([confirmedTx]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "paid" }), { status: 200 })
    );

    render(
      <PaymentWatcher
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith("paid"));
  });
});
