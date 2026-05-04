import { describe, it, expect, vi, afterEach } from "vitest";

describe("getMempoolBaseUrl / getMempoolWsUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_BTC_NETWORK;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_BTC_NETWORK;
    } else {
      process.env.NEXT_PUBLIC_BTC_NETWORK = originalEnv;
    }
    vi.resetModules();
  });

  it("returns mainnet URLs when env var is unset", async () => {
    delete process.env.NEXT_PUBLIC_BTC_NETWORK;
    vi.resetModules();
    const { getMempoolBaseUrl, getMempoolWsUrl } = await import("./btc-network");
    expect(getMempoolBaseUrl()).toBe("https://mempool.space");
    expect(getMempoolWsUrl()).toBe("wss://mempool.space/api/v1/ws");
  });

  it("returns mainnet URLs when env var is 'mainnet'", async () => {
    process.env.NEXT_PUBLIC_BTC_NETWORK = "mainnet";
    vi.resetModules();
    const { getMempoolBaseUrl, getMempoolWsUrl } = await import("./btc-network");
    expect(getMempoolBaseUrl()).toBe("https://mempool.space");
    expect(getMempoolWsUrl()).toBe("wss://mempool.space/api/v1/ws");
  });

  it("returns testnet4 URLs when env var is 'testnet4'", async () => {
    process.env.NEXT_PUBLIC_BTC_NETWORK = "testnet4";
    vi.resetModules();
    const { getMempoolBaseUrl, getMempoolWsUrl } = await import("./btc-network");
    expect(getMempoolBaseUrl()).toBe("https://mempool.space/testnet4");
    expect(getMempoolWsUrl()).toBe("wss://mempool.space/testnet4/api/v1/ws");
  });
});

describe("mempoolTxUrl / mempoolAddressUrl (v1.4.12)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_BTC_NETWORK;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_BTC_NETWORK;
    } else {
      process.env.NEXT_PUBLIC_BTC_NETWORK = originalEnv;
    }
    vi.resetModules();
  });

  it("mempoolTxUrl returns the mainnet tx URL by default", async () => {
    delete process.env.NEXT_PUBLIC_BTC_NETWORK;
    vi.resetModules();
    const { mempoolTxUrl } = await import("./btc-network");
    expect(mempoolTxUrl("abc123")).toBe("https://mempool.space/tx/abc123");
  });

  it("mempoolTxUrl returns the testnet4 tx URL when env var is 'testnet4'", async () => {
    process.env.NEXT_PUBLIC_BTC_NETWORK = "testnet4";
    vi.resetModules();
    const { mempoolTxUrl } = await import("./btc-network");
    expect(mempoolTxUrl("abc123")).toBe("https://mempool.space/testnet4/tx/abc123");
  });

  it("mempoolAddressUrl returns the network-aware address URL", async () => {
    process.env.NEXT_PUBLIC_BTC_NETWORK = "testnet4";
    vi.resetModules();
    const { mempoolAddressUrl } = await import("./btc-network");
    expect(mempoolAddressUrl("bc1qtest")).toBe("https://mempool.space/testnet4/address/bc1qtest");
  });
});
