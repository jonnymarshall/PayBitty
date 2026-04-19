import { describe, it, expect } from "vitest";
import { buildBip21Uri, fiatToBtc } from "./btc-qr";

describe("buildBip21Uri", () => {
  it("builds a BIP21 URI with address and amount", () => {
    expect(buildBip21Uri("bc1qxxx", 0.005)).toBe("bitcoin:bc1qxxx?amount=0.005");
  });

  it("includes label when provided", () => {
    const uri = buildBip21Uri("bc1qxxx", 0.001, "Invoice 42");
    expect(uri).toContain("label=Invoice+42");
  });

  it("strips trailing zeros from amount", () => {
    const uri = buildBip21Uri("bc1qxxx", 0.005);
    expect(uri).toContain("amount=0.005");
    expect(uri).not.toContain("0.00500000");
  });

  it("handles whole BTC amounts", () => {
    expect(buildBip21Uri("bc1qxxx", 1.0)).toBe("bitcoin:bc1qxxx?amount=1");
  });

  it("handles amounts that need 8 decimal places", () => {
    const uri = buildBip21Uri("bc1qxxx", 0.00000001);
    expect(uri).toContain("amount=0.00000001");
  });
});

describe("fiatToBtc", () => {
  it("divides fiat amount by BTC price", () => {
    expect(fiatToBtc(1000, 50000)).toBeCloseTo(0.02);
  });

  it("returns correct precision for small amounts", () => {
    expect(fiatToBtc(10, 100000)).toBeCloseTo(0.0001);
  });

  it("throws when BTC price is zero", () => {
    expect(() => fiatToBtc(100, 0)).toThrow();
  });

  it("throws when BTC price is negative", () => {
    expect(() => fiatToBtc(100, -1000)).toThrow();
  });
});
