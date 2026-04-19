import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBtcPrice, clearPriceCache } from "./btc-price";

beforeEach(() => {
  vi.unstubAllGlobals();
  clearPriceCache();
});

function makeFetch(responses: Array<{ ok: boolean; body?: unknown }>) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[i++] ?? { ok: false };
    return { ok: r.ok, json: async () => r.body ?? {} };
  });
}

describe("fetchBtcPrice", () => {
  it("returns price from Coinbase on success", async () => {
    vi.stubGlobal("fetch", makeFetch([{ ok: true, body: { data: { amount: "95000.50" } } }]));
    const result = await fetchBtcPrice("USD");
    expect(result.price).toBe(95000.5);
    expect(result.source).toBe("coinbase");
  });

  it("falls back to CoinGecko when Coinbase fails", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch([{ ok: false }, { ok: true, body: { bitcoin: { usd: 94500 } } }])
    );
    const result = await fetchBtcPrice("USD");
    expect(result.price).toBe(94500);
    expect(result.source).toBe("coingecko");
  });

  it("throws when both APIs fail", async () => {
    vi.stubGlobal("fetch", makeFetch([{ ok: false }, { ok: false }]));
    await expect(fetchBtcPrice("USD")).rejects.toThrow();
  });

  it("returns cached result within TTL without re-fetching", async () => {
    const fetchMock = makeFetch([{ ok: true, body: { data: { amount: "95000" } } }]);
    vi.stubGlobal("fetch", fetchMock);
    await fetchBtcPrice("USD");
    await fetchBtcPrice("USD");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches separately per currency", async () => {
    const fetchMock = makeFetch([
      { ok: true, body: { data: { amount: "95000" } } },
      { ok: true, body: { data: { amount: "87000" } } },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    await fetchBtcPrice("USD");
    await fetchBtcPrice("EUR");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
