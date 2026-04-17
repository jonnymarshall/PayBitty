import { describe, it, expect } from "vitest";
import { generateAccessCode, computeInvoiceTotals } from "./invoices";

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
    const { subtotal, total } = computeInvoiceTotals(items, 0);
    expect(subtotal).toBe(2500);
    expect(total).toBe(2500);
  });

  it("adds tax to produce the correct total", () => {
    const items = [{ description: "Consulting", quantity: 1, unit_price: 1000 }];
    const { subtotal, total } = computeInvoiceTotals(items, 100);
    expect(subtotal).toBe(1000);
    expect(total).toBe(1100);
  });

  it("returns zeros for empty line items", () => {
    const { subtotal, total } = computeInvoiceTotals([], 0);
    expect(subtotal).toBe(0);
    expect(total).toBe(0);
  });
});
