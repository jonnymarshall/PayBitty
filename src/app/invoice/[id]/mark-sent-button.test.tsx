import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MarkSentButton } from "./mark-sent-button";
import type { Invoice } from "@/lib/invoice-public";

const mockFetchAddressTxs = vi.fn();
vi.mock("@/lib/mempool", () => ({
  fetchAddressTxs: (...a: unknown[]) => mockFetchAddressTxs(...a),
  txPaysToAddress: (
    tx: { vout: { scriptpubkey_address?: string }[] },
    addr: string
  ) => tx.vout.some((o) => o.scriptpubkey_address === addr),
}));

vi.mock("@/lib/btc-network", () => ({
  getMempoolBaseUrl: () => "https://mempool.space/testnet4",
}));

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

const matchingTx = {
  txid: "tx1",
  status: { confirmed: false },
  vout: [{ scriptpubkey_address: "tb1qtarget", value: 50000 }],
};

const BTN = /mark as payment sent/i;
const ANIMATION_MS = 400;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchAddressTxs.mockResolvedValue([]);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ status: "payment_detected" }), { status: 200 })
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MarkSentButton — button visibility", () => {
  it("shows button when status is pending and showButton is true (default)", () => {
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: BTN })).toBeInTheDocument();
  });

  it("shows button when status is overdue", () => {
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="overdue"
        onStatusChange={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: BTN })).toBeInTheDocument();
  });

  it("hides button when showButton is false (reveal not yet clicked)", () => {
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
        showButton={false}
      />
    );
    expect(screen.queryByRole("button", { name: BTN })).not.toBeInTheDocument();
  });

  it("hides button when status is payment_detected", () => {
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="payment_detected"
        onStatusChange={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: BTN })).not.toBeInTheDocument();
  });

  it("hides button when status is paid", () => {
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="paid"
        onStatusChange={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: BTN })).not.toBeInTheDocument();
  });
});

describe("MarkSentButton — polling schedule", () => {
  it("polls on the tiered cumulative schedule: 2,4,6,8,10,13,16,19,22,25,30,35,40,50,60s", async () => {
    vi.useFakeTimers();
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: BTN }));

    expect(mockFetchAddressTxs).not.toHaveBeenCalled();

    const schedule = [
      2000, 2000, 2000, 2000, 2000,
      3000, 3000, 3000, 3000, 3000,
      5000, 5000, 5000,
      10000, 10000,
    ];

    for (let i = 0; i < schedule.length; i++) {
      await vi.advanceTimersByTimeAsync(schedule[i]);
      expect(mockFetchAddressTxs).toHaveBeenCalledTimes(i + 1);
    }
  });

  it("stops polling when a matching tx is detected and calls onStatusChange (after animation delay)", async () => {
    vi.useFakeTimers();
    const onStatusChange = vi.fn();

    mockFetchAddressTxs
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([matchingTx]);

    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: BTN }));

    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(2000);
    await flushMicrotasks();

    expect(onStatusChange).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(ANIMATION_MS);
    await flushMicrotasks();

    expect(onStatusChange).toHaveBeenCalledWith("payment_detected");

    const callsAfterHit = mockFetchAddressTxs.mock.calls.length;
    await vi.advanceTimersByTimeAsync(20000);
    expect(mockFetchAddressTxs).toHaveBeenCalledTimes(callsAfterHit);
  });

  it("shows timed-out state after 60s with no tx detected", async () => {
    vi.useFakeTimers();
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: BTN }));
    await vi.advanceTimersByTimeAsync(60000);
    await flushMicrotasks();

    expect(screen.getByText(/haven't seen your payment/i)).toBeInTheDocument();
  });

  it("stops polling when the Cancel button is clicked", async () => {
    vi.useFakeTimers();
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: BTN }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockFetchAddressTxs).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await vi.advanceTimersByTimeAsync(60000);
    expect(mockFetchAddressTxs).toHaveBeenCalledTimes(1);
  });

  it("shows the Cancel helper text while polling", async () => {
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: BTN }));
    expect(
      screen.getByText(/click here if you have not yet made the bitcoin payment/i)
    ).toBeInTheDocument();
  });

  it("stops polling on unmount", async () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="pending"
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: BTN }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockFetchAddressTxs).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockFetchAddressTxs).toHaveBeenCalledTimes(1);
  });
});

describe("MarkSentButton — detected state", () => {
  it("shows 'Your payment has been detected' with an OK button once the detected phase renders", () => {
    // Use a controlled wrapper to simulate external status transition
    function Wrapper() {
      const [status, setStatus] = useState<Invoice["status"]>("pending");
      return (
        <>
          <button onClick={() => setStatus("payment_detected")}>transition</button>
          <MarkSentButton
            invoiceId="inv-1"
            btcAddress="tb1qtarget"
            status={status}
            onStatusChange={setStatus}
          />
        </>
      );
    }
    render(<Wrapper />);
    fireEvent.click(screen.getByText("transition"));
    expect(screen.getByText(/your payment has been detected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ok$/i })).toBeInTheDocument();
  });
});

describe("MarkSentButton — auto-open on external status transition", () => {
  it("auto-opens the detected dialog when status transitions pending → payment_detected while the dialog is closed", () => {
    function Wrapper() {
      const [status, setStatus] = useState<Invoice["status"]>("pending");
      return (
        <>
          <button onClick={() => setStatus("payment_detected")}>external-detect</button>
          <MarkSentButton
            invoiceId="inv-1"
            btcAddress="tb1qtarget"
            status={status}
            onStatusChange={setStatus}
          />
        </>
      );
    }
    render(<Wrapper />);

    // Dialog not open initially
    expect(screen.queryByText(/your payment has been detected/i)).not.toBeInTheDocument();

    // External transition (simulates PaymentWatcher finding the tx)
    fireEvent.click(screen.getByText("external-detect"));

    expect(screen.getByText(/your payment has been detected/i)).toBeInTheDocument();
  });

  it("auto-opens the detected dialog even when showButton is false (user never clicked reveal)", () => {
    function Wrapper() {
      const [status, setStatus] = useState<Invoice["status"]>("pending");
      return (
        <>
          <button onClick={() => setStatus("payment_detected")}>external-detect</button>
          <MarkSentButton
            invoiceId="inv-1"
            btcAddress="tb1qtarget"
            status={status}
            onStatusChange={setStatus}
            showButton={false}
          />
        </>
      );
    }
    render(<Wrapper />);

    expect(screen.queryByText(/your payment has been detected/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: BTN })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("external-detect"));

    expect(screen.getByText(/your payment has been detected/i)).toBeInTheDocument();
  });

  it("does not auto-open when the initial status is already payment_detected", () => {
    render(
      <MarkSentButton
        invoiceId="inv-1"
        btcAddress="tb1qtarget"
        status="payment_detected"
        onStatusChange={() => {}}
      />
    );
    expect(screen.queryByText(/your payment has been detected/i)).not.toBeInTheDocument();
  });
});
