import { describe, it, expect, vi, afterEach } from "vitest";
import { txPaysToAddress, fetchAddressTxs, fetchTx } from "./mempool";
import type { MempoolTx } from "./mempool";

const tx = (vout: { scriptpubkey_address?: string; value: number }[]): MempoolTx => ({
  txid: "abc123",
  status: { confirmed: false },
  vout,
});

describe("txPaysToAddress", () => {
  it("returns true when a vout matches the address", () => {
    const t = tx([
      { scriptpubkey_address: "tb1qother", value: 1000 },
      { scriptpubkey_address: "tb1qtarget", value: 5000 },
    ]);
    expect(txPaysToAddress(t, "tb1qtarget")).toBe(true);
  });

  it("returns false when no vout matches", () => {
    const t = tx([{ scriptpubkey_address: "tb1qother", value: 1000 }]);
    expect(txPaysToAddress(t, "tb1qtarget")).toBe(false);
  });

  it("returns false when vout has no address (OP_RETURN etc)", () => {
    const t = tx([{ value: 0 }]);
    expect(txPaysToAddress(t, "tb1qtarget")).toBe(false);
  });
});

const fakeTx: MempoolTx = {
  txid: "abc123",
  status: { confirmed: false },
  vout: [{ scriptpubkey_address: "tb1qtarget", value: 10000 }],
};

describe("fetchAddressTxs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fetches from the correct mempool base URL", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([fakeTx]), { status: 200 })
    );
    await fetchAddressTxs("tb1qtarget");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/address/tb1qtarget/txs")
    );
  });

  it("returns empty array on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 })
    );
    expect(await fetchAddressTxs("tb1qtarget")).toEqual([]);
  });
});

describe("fetchTx", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fetches a transaction by txid", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fakeTx), { status: 200 })
    );
    const result = await fetchTx("abc123");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("/api/tx/abc123"));
    expect(result?.txid).toBe("abc123");
  });

  it("returns null on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 })
    );
    expect(await fetchTx("abc123")).toBeNull();
  });
});
