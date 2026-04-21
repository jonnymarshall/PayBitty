import { describe, it, expect } from "vitest";
import { generateAccessCode, computeInvoiceTotals, isValidEmail, isValidBtcAddress } from "./invoices";

describe("generateAccessCode", () => {
  it("returns an 8-character alphanumeric string", () => {
    const code = generateAccessCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("produces unique values on each call", () => {
    const codes = new Set(Array.from({ length: 100 }, generateAccessCode));
    expect(codes.size).toBe(100);
  });
});

describe("computeInvoiceTotals", () => {
  it("sums quantity × unit_price across line items", () => {
    const items = [
      { description: "Design", quantity: 2, unit_price: 500 },
      { description: "Dev", quantity: 10, unit_price: 150 },
    ];
    const { subtotal, taxFiat, total } = computeInvoiceTotals(items, 0);
    expect(subtotal).toBe(2500);
    expect(taxFiat).toBe(0);
    expect(total).toBe(2500);
  });

  it("computes tax as a percentage of subtotal", () => {
    const items = [{ description: "Consulting", quantity: 1, unit_price: 1000 }];
    const { subtotal, taxFiat, total } = computeInvoiceTotals(items, 10);
    expect(subtotal).toBe(1000);
    expect(taxFiat).toBe(100);
    expect(total).toBe(1100);
  });

  it("returns zeros for empty line items", () => {
    const { subtotal, taxFiat, total } = computeInvoiceTotals([], 0);
    expect(subtotal).toBe(0);
    expect(taxFiat).toBe(0);
    expect(total).toBe(0);
  });
});

describe("isValidEmail", () => {
  it("accepts valid email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user+tag@sub.domain.io")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("missing@tld")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
  });
});

describe("isValidBtcAddress", () => {
  it("accepts a mainnet P2PKH address (starts with 1)", () => {
    expect(isValidBtcAddress("1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH")).toBe(true);
  });

  it("accepts a mainnet P2SH address (starts with 3)", () => {
    expect(isValidBtcAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toBe(true);
  });

  it("accepts a mainnet bech32 address (bc1)", () => {
    expect(isValidBtcAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
  });

  it("accepts a testnet bech32 address (tb1)", () => {
    expect(isValidBtcAddress("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidBtcAddress("")).toBe(false);
  });

  it("rejects a plaintext string", () => {
    expect(isValidBtcAddress("notanaddress")).toBe(false);
  });

  it("rejects an Ethereum address", () => {
    expect(isValidBtcAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")).toBe(false);
  });

  it("rejects a bech32 address that is too short", () => {
    expect(isValidBtcAddress("bc1q")).toBe(false);
  });

  it("rejects a bech32 address with valid charset and length but wrong checksum", () => {
    // 42 chars total — correct length for P2WPKH, but fabricated data
    expect(isValidBtcAddress("bc1qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
  });

  it("rejects a bech32m address with valid charset and length but wrong checksum", () => {
    // 62 chars total — correct length for P2TR, but fabricated data
    expect(isValidBtcAddress("bc1paaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
  });

  it("rejects a legacy address with valid base58 charset and length but wrong checksum", () => {
    expect(isValidBtcAddress("1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
  });

  it("rejects a bech32 address containing characters not in the bech32 charset", () => {
    // 'b', 'i', 'o' are excluded from bech32 charset to avoid visual ambiguity
    expect(isValidBtcAddress("bc1sdghfgngfnfhgbvdcsdvfbgbg")).toBe(false);
  });
});
