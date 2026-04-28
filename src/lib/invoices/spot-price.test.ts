import { describe, it, expect } from "vitest";
import { buildSpotPriceUrl } from "./spot-price";

describe("buildSpotPriceUrl", () => {
  it("builds the Coinbase BTC-USD spot URL for USD invoices", () => {
    expect(buildSpotPriceUrl("USD")).toBe(
      "https://api.coinbase.com/v2/prices/BTC-USD/spot"
    );
  });

  it("respects an arbitrary currency code", () => {
    expect(buildSpotPriceUrl("EUR")).toBe(
      "https://api.coinbase.com/v2/prices/BTC-EUR/spot"
    );
  });

  it("uppercases the currency code", () => {
    expect(buildSpotPriceUrl("gbp")).toBe(
      "https://api.coinbase.com/v2/prices/BTC-GBP/spot"
    );
  });
});
