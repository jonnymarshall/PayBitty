import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { NextRequest } from "next/server";

// Mock Supabase admin
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  single: mockSingle,
}));
const mockGetUserById = vi.fn().mockResolvedValue({
  data: { user: { id: "owner-1", email: "owner@example.com" } },
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
  }),
}));

const mockSendDetected = vi.fn().mockResolvedValue(undefined);
const mockSendConfirmed = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/send", () => ({
  sendPaymentDetectedEmail: (...args: unknown[]) => mockSendDetected(...args),
  sendPaymentConfirmedEmail: (...args: unknown[]) => mockSendConfirmed(...args),
}));

// Mock mempool fetchTx
const mockFetchTx = vi.fn();
vi.mock("@/lib/mempool", () => ({
  fetchTx: (...args: unknown[]) => mockFetchTx(...args),
  txPaysToAddress: (tx: { vout: { scriptpubkey_address?: string }[] }, addr: string) =>
    tx.vout.some((o) => o.scriptpubkey_address === addr),
}));

async function postRequest(invoiceId: string, body: object) {
  const { POST } = await import(
    "./[id]/payment-status/route"
  );
  const req = new NextRequest(`http://localhost/api/invoices/${invoiceId}/payment-status`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req, { params: Promise.resolve({ id: invoiceId }) });
}

const pendingInvoice = {
  id: "inv-1",
  btc_address: "tb1qtarget",
  status: "pending",
  user_id: "owner-1",
  invoice_number: "INV-PAY-1",
  client_name: "Ada",
  client_email: "payer@example.com",
  total_fiat: 250,
  currency: "USD",
  your_name: "Charles",
  your_company: null,
  your_email: "charles@example.com",
};

const matchingTx = {
  txid: "txabc",
  status: { confirmed: false },
  vout: [{ scriptpubkey_address: "tb1qtarget", value: 50000 }],
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("POST /api/invoices/[id]/payment-status", () => {
  it("returns 400 when body is missing txid", async () => {
    const res = await postRequest("inv-1", { status: "payment_detected" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when status is invalid", async () => {
    const res = await postRequest("inv-1", { txid: "txabc", status: "draft" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when invoice not found", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    const res = await postRequest("inv-1", { txid: "txabc", status: "payment_detected" });
    expect(res.status).toBe(404);
  });

  it("returns 400 when tx does not pay to invoice address", async () => {
    mockSingle.mockResolvedValueOnce({ data: pendingInvoice, error: null });
    mockFetchTx.mockResolvedValueOnce({
      txid: "txabc",
      status: { confirmed: false },
      vout: [{ scriptpubkey_address: "tb1qother", value: 50000 }],
    });
    const res = await postRequest("inv-1", { txid: "txabc", status: "payment_detected" });
    expect(res.status).toBe(400);
  });

  it("updates status to payment_detected for unconfirmed tx", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: pendingInvoice, error: null })
      .mockResolvedValueOnce({ data: { status: "payment_detected" }, error: null });
    mockFetchTx.mockResolvedValueOnce(matchingTx);
    mockUpdate.mockReturnValue({ eq: () => ({ eq: () => ({ select: () => ({ single: mockSingle }) }) }) });

    const res = await postRequest("inv-1", { txid: "txabc", status: "payment_detected" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("payment_detected");
  });

  it("returns 200 with requested status when DB row already changed (PGRST116)", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: pendingInvoice, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "no rows" } });
    mockFetchTx.mockResolvedValueOnce(matchingTx);
    mockUpdate.mockReturnValue({ eq: () => ({ eq: () => ({ select: () => ({ single: mockSingle }) }) }) });

    const res = await postRequest("inv-1", { txid: "txabc", status: "payment_detected" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("payment_detected");
  });

  it("returns current status when already at or past requested status", async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...pendingInvoice, status: "paid" }, error: null });
    const res = await postRequest("inv-1", { txid: "txabc", status: "payment_detected" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paid");
  });

  it("dispatches a payment_detected email with both owner and payer addresses on a successful transition", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: pendingInvoice, error: null })
      .mockResolvedValueOnce({ data: { status: "payment_detected" }, error: null });
    mockFetchTx.mockResolvedValueOnce(matchingTx);
    mockUpdate.mockReturnValue({ eq: () => ({ eq: () => ({ select: () => ({ single: mockSingle }) }) }) });

    await postRequest("inv-1", { txid: "txabc", status: "payment_detected" });

    expect(mockSendDetected).toHaveBeenCalledTimes(1);
    expect(mockSendConfirmed).not.toHaveBeenCalled();
    expect(mockSendDetected).toHaveBeenCalledWith(expect.objectContaining({
      ownerEmail: "owner@example.com",
      payerEmail: "payer@example.com",
      userId: "owner-1",
      invoiceId: "inv-1",
      invoiceNumber: "INV-PAY-1",
      senderName: "Charles",
      clientName: "Ada",
      totalFiat: 250,
      currency: "USD",
      txid: "txabc",
    }));
  });

  it("dispatches a payment_confirmed email with both owner and payer addresses on a successful transition", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: pendingInvoice, error: null })
      .mockResolvedValueOnce({ data: { status: "paid" }, error: null });
    mockFetchTx.mockResolvedValueOnce(matchingTx);
    mockUpdate.mockReturnValue({ eq: () => ({ eq: () => ({ select: () => ({ single: mockSingle }) }) }) });

    await postRequest("inv-1", { txid: "txabc", status: "paid" });

    expect(mockSendConfirmed).toHaveBeenCalledTimes(1);
    expect(mockSendDetected).not.toHaveBeenCalled();
    expect(mockSendConfirmed).toHaveBeenCalledWith(expect.objectContaining({
      ownerEmail: "owner@example.com",
      payerEmail: "payer@example.com",
      userId: "owner-1",
      invoiceId: "inv-1",
      txid: "txabc",
    }));
  });

  it("passes payerEmail: null when client_email is blank", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { ...pendingInvoice, client_email: "" }, error: null })
      .mockResolvedValueOnce({ data: { status: "payment_detected" }, error: null });
    mockFetchTx.mockResolvedValueOnce(matchingTx);
    mockUpdate.mockReturnValue({ eq: () => ({ eq: () => ({ select: () => ({ single: mockSingle }) }) }) });

    await postRequest("inv-1", { txid: "txabc", status: "payment_detected" });

    expect(mockSendDetected).toHaveBeenCalledTimes(1);
    expect(mockSendDetected).toHaveBeenCalledWith(expect.objectContaining({
      ownerEmail: "owner@example.com",
      payerEmail: null,
    }));
  });
});
