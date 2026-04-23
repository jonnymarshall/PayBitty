import { describe, it, expect, vi } from "vitest";
import type { MempoolTx } from "@/lib/mempool";
import { sweepUserInvoices } from "./sweep";

type Row = Record<string, unknown>;

interface FakeConfig {
  invoices: Row[];
  updateResult?: { error: { message: string } | null };
  txsByAddress?: Record<string, MempoolTx[]>;
}

function makeFakeSupabase(config: FakeConfig) {
  const { invoices, updateResult = { error: null } } = config;
  const updateCalls: Array<{ payload: Row; filters: Array<{ method: string; args: unknown[] }> }> = [];
  const selectFilters: Array<{ method: string; args: unknown[] }> = [];

  const selectBuilder = {
    eq: vi.fn((...args: unknown[]) => {
      selectFilters.push({ method: "eq", args });
      return selectBuilder;
    }),
    in: vi.fn((...args: unknown[]) => {
      selectFilters.push({ method: "in", args });
      return selectBuilder;
    }),
    not: vi.fn((...args: unknown[]) => {
      selectFilters.push({ method: "not", args });
      return selectBuilder;
    }),
    then: (onFulfilled: (v: unknown) => void) =>
      Promise.resolve({ data: invoices, error: null }).then(onFulfilled),
  };

  function makeUpdateBuilder(payload: Row) {
    const filters: Array<{ method: string; args: unknown[] }> = [];
    const b: Record<string, unknown> = {
      eq: vi.fn((...args: unknown[]) => {
        filters.push({ method: "eq", args });
        return b;
      }),
      then: (onFulfilled: (v: unknown) => void) => {
        updateCalls.push({ payload, filters });
        return Promise.resolve(updateResult).then(onFulfilled);
      },
    };
    return b;
  }

  const from = vi.fn(() => ({
    select: vi.fn(() => selectBuilder),
    update: vi.fn((payload: Row) => makeUpdateBuilder(payload)),
  }));

  return { client: { from } as unknown as Parameters<typeof sweepUserInvoices>[1]["supabase"], updateCalls, selectFilters };
}

function confirmedTx(txid: string, address: string): MempoolTx {
  return {
    txid,
    status: { confirmed: true, block_height: 900_000 },
    vout: [{ scriptpubkey_address: address, value: 50_000 }],
  };
}

function unconfirmedTx(txid: string, address: string): MempoolTx {
  return {
    txid,
    status: { confirmed: false },
    vout: [{ scriptpubkey_address: address, value: 50_000 }],
  };
}

function fakeFetcher(map: Record<string, MempoolTx[]>) {
  return vi.fn(async (address: string) => map[address] ?? []);
}

describe("sweepUserInvoices", () => {
  it("flips a pending invoice to paid when mempool shows a confirmed tx to its address", async () => {
    const { client, updateCalls } = makeFakeSupabase({
      invoices: [
        { id: "inv-1", btc_address: "bc1qpaid", status: "pending", invoice_number: "INV-1", client_name: "Ada", total_fiat: 100, currency: "USD" },
      ],
      txsByAddress: { bc1qpaid: [confirmedTx("tx-abc", "bc1qpaid")] },
    });

    const fetchAddressTxs = vi.fn(async (address: string) => {
      const map: Record<string, MempoolTx[]> = { bc1qpaid: [confirmedTx("tx-abc", "bc1qpaid")] };
      return map[address] ?? [];
    });

    const result = await sweepUserInvoices("user-1", { supabase: client, fetchAddressTxs });

    expect(result.checked).toBe(1);
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]).toMatchObject({ id: "inv-1", from: "pending", to: "paid", txid: "tx-abc" });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].payload).toEqual({ status: "paid", btc_txid: "tx-abc" });
  });

  it("flips a pending invoice to payment_detected when mempool shows an unconfirmed tx", async () => {
    const { client, updateCalls } = makeFakeSupabase({
      invoices: [{ id: "inv-2", btc_address: "bc1qunconf", status: "pending", invoice_number: "INV-2", client_name: "Ada", total_fiat: 100, currency: "USD" }],
    });
    const fetchAddressTxs = fakeFetcher({
      bc1qunconf: [unconfirmedTx("tx-pending", "bc1qunconf")],
    });

    const result = await sweepUserInvoices("user-1", { supabase: client, fetchAddressTxs });

    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]).toMatchObject({ id: "inv-2", from: "pending", to: "payment_detected", txid: "tx-pending" });
    expect(updateCalls[0].payload).toEqual({
      status: "payment_detected",
      btc_txid: "tx-pending",
    });
  });

  it("scopes the fetch to the user, only sweepable statuses, and only rows with a btc_address", async () => {
    const { client, selectFilters } = makeFakeSupabase({ invoices: [] });
    const fetchAddressTxs = fakeFetcher({});

    await sweepUserInvoices("user-42", { supabase: client, fetchAddressTxs });

    const userScope = selectFilters.find(
      (f) => f.method === "eq" && f.args[0] === "user_id"
    );
    expect(userScope?.args).toEqual(["user_id", "user-42"]);

    const statusScope = selectFilters.find(
      (f) => f.method === "in" && f.args[0] === "status"
    );
    expect(statusScope?.args).toEqual(["status", ["pending", "payment_detected"]]);

    const addressScope = selectFilters.find(
      (f) => f.method === "not" && f.args[0] === "btc_address"
    );
    expect(addressScope).toBeDefined();
  });

  it("upgrades a payment_detected invoice to paid when the tx has confirmed", async () => {
    const { client, updateCalls } = makeFakeSupabase({
      invoices: [{ id: "inv-3", btc_address: "bc1qup", status: "payment_detected", invoice_number: "INV-3", client_name: "Ada", total_fiat: 100, currency: "USD" }],
    });
    const fetchAddressTxs = fakeFetcher({
      bc1qup: [confirmedTx("tx-confirmed", "bc1qup")],
    });

    const result = await sweepUserInvoices("user-1", { supabase: client, fetchAddressTxs });

    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]).toMatchObject({ id: "inv-3", from: "payment_detected", to: "paid", txid: "tx-confirmed" });
    expect(updateCalls[0].payload).toEqual({ status: "paid", btc_txid: "tx-confirmed" });
  });

  it("does not update an invoice when mempool shows no paying tx", async () => {
    const { client, updateCalls } = makeFakeSupabase({
      invoices: [{ id: "inv-4", btc_address: "bc1qnopay", status: "pending", invoice_number: null, client_name: "Ada", total_fiat: 100, currency: "USD" }],
    });
    const fetchAddressTxs = fakeFetcher({ bc1qnopay: [] });

    const result = await sweepUserInvoices("user-1", { supabase: client, fetchAddressTxs });

    expect(result.checked).toBe(1);
    expect(result.updated).toEqual([]);
    expect(updateCalls).toEqual([]);
  });

  it("does not re-update a payment_detected invoice whose only tx is still unconfirmed", async () => {
    const { client, updateCalls } = makeFakeSupabase({
      invoices: [{ id: "inv-5", btc_address: "bc1qstill", status: "payment_detected", invoice_number: null, client_name: "Ada", total_fiat: 100, currency: "USD" }],
    });
    const fetchAddressTxs = fakeFetcher({
      bc1qstill: [unconfirmedTx("tx-still", "bc1qstill")],
    });

    const result = await sweepUserInvoices("user-1", { supabase: client, fetchAddressTxs });

    expect(result.updated).toEqual([]);
    expect(updateCalls).toEqual([]);
  });

  it("processes multiple invoices independently", async () => {
    const { client, updateCalls } = makeFakeSupabase({
      invoices: [
        { id: "inv-a", btc_address: "addr-a", status: "pending", invoice_number: "A", client_name: "Ada", total_fiat: 100, currency: "USD" },
        { id: "inv-b", btc_address: "addr-b", status: "pending", invoice_number: "B", client_name: "Ada", total_fiat: 100, currency: "USD" },
        { id: "inv-c", btc_address: "addr-c", status: "pending", invoice_number: "C", client_name: "Ada", total_fiat: 100, currency: "USD" },
      ],
    });
    const fetchAddressTxs = fakeFetcher({
      "addr-a": [confirmedTx("tx-a", "addr-a")],
      "addr-b": [],
      "addr-c": [unconfirmedTx("tx-c", "addr-c")],
    });

    const result = await sweepUserInvoices("user-1", { supabase: client, fetchAddressTxs });

    expect(result.checked).toBe(3);
    expect(result.updated).toHaveLength(2);
    expect(result.updated[0]).toMatchObject({ id: "inv-a", from: "pending", to: "paid", txid: "tx-a" });
    expect(result.updated[1]).toMatchObject({ id: "inv-c", from: "pending", to: "payment_detected", txid: "tx-c" });
    expect(updateCalls).toHaveLength(2);
  });
});
