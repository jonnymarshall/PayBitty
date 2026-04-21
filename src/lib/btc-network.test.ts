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
