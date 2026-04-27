import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
const mockGetUserById = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
  }),
}));

const mockFetchAddressTxs = vi.fn();
vi.mock("@/lib/mempool", () => ({
  fetchAddressTxs: (...args: unknown[]) => mockFetchAddressTxs(...args),
  txPaysToAddress: (tx: { vout: { scriptpubkey_address?: string }[] }, addr: string) =>
    tx.vout.some((o) => o.scriptpubkey_address === addr),
}));

const mockSendDetected = vi.fn().mockResolvedValue(undefined);
const mockSendConfirmed = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/send", () => ({
  sendPaymentDetectedEmail: (...args: unknown[]) => mockSendDetected(...args),
  sendPaymentConfirmedEmail: (...args: unknown[]) => mockSendConfirmed(...args),
}));

async function getRequest(headers: Record<string, string> = {}) {
  const { GET } = await import("./payment-sweep/route");
  const req = new NextRequest("http://localhost/api/cron/payment-sweep", {
    method: "GET",
    headers,
  });
  return GET(req);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

function authHeaders() {
  return { authorization: "Bearer test-secret" };
}

/**
 * Helper that returns a chainable query-builder mock where each method records
 * the call and returns `this`. The terminal return value is the `data`.
 */
function makeSelectBuilder(rows: unknown[]) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  const chain = (method: string) =>
    vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  builder.select = chain("select");
  builder.eq = chain("eq");
  builder.in = chain("in");
  builder.lte = chain("lte");
  builder.limit = chain("limit");
  builder.not = chain("not");
  builder.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(onFulfilled);
  return { builder, calls };
}

function makeUpdateBuilder(result: { error: unknown } = { error: null }) {
  const calls: Array<{ payload: unknown; filters: Array<{ method: string; args: unknown[] }> }> = [];
  const factory = vi.fn((payload: unknown) => {
    const filters: Array<{ method: string; args: unknown[] }> = [];
    const chainable: Record<string, unknown> = {};
    const chain = (method: string) =>
      vi.fn((...args: unknown[]) => {
        filters.push({ method, args });
        return chainable;
      });
    chainable.eq = chain("eq");
    chainable.then = (onFulfilled: (v: unknown) => unknown) => {
      calls.push({ payload, filters });
      return Promise.resolve(result).then(onFulfilled);
    };
    return chainable;
  });
  return { factory, calls };
}

describe("GET /api/cron/payment-sweep — auth", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await getRequest();
    expect(res.status).toBe(401);
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await getRequest({ authorization: "Bearer wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is unset even if a header is provided", async () => {
    delete process.env.CRON_SECRET;
    const res = await getRequest({ authorization: "Bearer anything" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/payment-sweep — scope", () => {
  it("queries invoices where status is pending/payment_detected, next_check_at <= now, with a limit", async () => {
    const { builder, calls } = makeSelectBuilder([]);
    mockFrom.mockReturnValue(builder);

    await getRequest(authHeaders());

    const inStatus = calls.find((c) => c.method === "in" && c.args[0] === "status");
    expect(inStatus?.args).toEqual(["status", ["pending", "payment_detected"]]);

    const lteCheck = calls.find((c) => c.method === "lte" && c.args[0] === "next_check_at");
    expect(lteCheck).toBeDefined();

    const limit = calls.find((c) => c.method === "limit");
    expect(limit?.args[0]).toBe(50);
  });

  it("returns { processed: 0, transitions: 0, errors: 0 } when there is nothing to do", async () => {
    const { builder } = makeSelectBuilder([]);
    mockFrom.mockReturnValue(builder);

    const res = await getRequest(authHeaders());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ processed: 0, transitions: 0, errors: 0 });
  });
});

describe("GET /api/cron/payment-sweep — per-invoice processing", () => {
  const pending = {
    id: "inv-1",
    user_id: "owner-1",
    btc_address: "tb1qaddr",
    status: "pending" as const,
    mempool_seen_at: null,
    stage_attempt: 0,
    invoice_number: "INV-1",
    client_name: "Ada",
    client_email: "payer@example.com",
    total_fiat: 250,
    currency: "USD",
    your_name: "Charles",
    your_company: null,
    your_email: "charles@example.com",
  };

  const unconfirmed = {
    txid: "tx-seen",
    status: { confirmed: false },
    vout: [{ scriptpubkey_address: "tb1qaddr", value: 50_000 }],
  };

  const confirmed = {
    txid: "tx-paid",
    status: { confirmed: true, block_height: 900_000 },
    vout: [{ scriptpubkey_address: "tb1qaddr", value: 50_000 }],
  };

  it("updates an invoice and dispatches payment_detected email when an unconfirmed tx is seen", async () => {
    const { builder } = makeSelectBuilder([pending]);
    const update = makeUpdateBuilder();
    mockFrom.mockImplementation((table: string) => {
      expect(table).toBe("invoices");
      return { ...builder, update: update.factory };
    });
    mockFetchAddressTxs.mockResolvedValue([unconfirmed]);
    mockGetUserById.mockResolvedValue({ data: { user: { id: "owner-1", email: "owner@example.com" } } });

    const res = await getRequest(authHeaders());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ processed: 1, transitions: 1, errors: 0 });

    expect(update.calls).toHaveLength(1);
    expect(update.calls[0].payload).toMatchObject({
      status: "payment_detected",
      btc_txid: "tx-seen",
      stage_attempt: 0,
    });

    expect(mockSendDetected).toHaveBeenCalledTimes(1);
    expect(mockSendDetected).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerEmail: "owner@example.com",
        payerEmail: "payer@example.com",
        userId: "owner-1",
        invoiceId: "inv-1",
        invoiceNumber: "INV-1",
        senderName: "Charles",
        clientName: "Ada",
        totalFiat: 250,
        currency: "USD",
        txid: "tx-seen",
      })
    );
    expect(mockSendConfirmed).not.toHaveBeenCalled();
  });

  it("passes payerEmail: null when client_email is blank", async () => {
    const noPayer = { ...pending, client_email: "" };
    const { builder } = makeSelectBuilder([noPayer]);
    const update = makeUpdateBuilder();
    mockFrom.mockImplementation(() => ({ ...builder, update: update.factory }));
    mockFetchAddressTxs.mockResolvedValue([unconfirmed]);
    mockGetUserById.mockResolvedValue({ data: { user: { id: "owner-1", email: "owner@example.com" } } });

    await getRequest(authHeaders());

    expect(mockSendDetected).toHaveBeenCalledTimes(1);
    expect(mockSendDetected).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerEmail: "owner@example.com",
        payerEmail: null,
      })
    );
  });

  it("dispatches payment_confirmed email when a confirmed tx is seen on a payment_detected invoice", async () => {
    const detected = { ...pending, status: "payment_detected" as const, mempool_seen_at: "2026-04-23T10:00:00Z" };
    const { builder } = makeSelectBuilder([detected]);
    const update = makeUpdateBuilder();
    mockFrom.mockImplementation(() => ({ ...builder, update: update.factory }));
    mockFetchAddressTxs.mockResolvedValue([confirmed]);
    mockGetUserById.mockResolvedValue({ data: { user: { id: "owner-1", email: "owner@example.com" } } });

    const res = await getRequest(authHeaders());
    const body = await res.json();
    expect(body).toEqual({ processed: 1, transitions: 1, errors: 0 });

    expect(mockSendConfirmed).toHaveBeenCalledTimes(1);
    expect(mockSendDetected).not.toHaveBeenCalled();
  });

  it("still updates next_check_at / stage_attempt when no transition happens (processed counts, transitions does not)", async () => {
    const { builder } = makeSelectBuilder([pending]);
    const update = makeUpdateBuilder();
    mockFrom.mockImplementation(() => ({ ...builder, update: update.factory }));
    mockFetchAddressTxs.mockResolvedValue([]);

    const res = await getRequest(authHeaders());
    const body = await res.json();
    expect(body).toEqual({ processed: 1, transitions: 0, errors: 0 });

    expect(update.calls).toHaveLength(1);
    expect(update.calls[0].payload).toMatchObject({
      stage_attempt: 1,
    });
    expect(mockSendDetected).not.toHaveBeenCalled();
    expect(mockSendConfirmed).not.toHaveBeenCalled();
  });

  it("uses optimistic concurrency on status when updating (filters .eq('status', prior))", async () => {
    const { builder } = makeSelectBuilder([pending]);
    const update = makeUpdateBuilder();
    mockFrom.mockImplementation(() => ({ ...builder, update: update.factory }));
    mockFetchAddressTxs.mockResolvedValue([unconfirmed]);
    mockGetUserById.mockResolvedValue({ data: { user: { email: "owner@example.com" } } });

    await getRequest(authHeaders());

    const idFilter = update.calls[0].filters.find(
      (f) => f.method === "eq" && f.args[0] === "id"
    );
    const statusFilter = update.calls[0].filters.find(
      (f) => f.method === "eq" && f.args[0] === "status"
    );
    expect(idFilter?.args).toEqual(["id", "inv-1"]);
    expect(statusFilter?.args).toEqual(["status", "pending"]);
  });
});
