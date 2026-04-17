import { describe, it, expect } from "vitest";
import { generateAccessCode, computeInvoiceTotals, isValidEmail } from "./invoices";

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
