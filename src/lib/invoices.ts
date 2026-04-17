const ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateAccessCode(): string {
  return Array.from(
    { length: 8 },
    () => ACCESS_CODE_CHARS[Math.floor(Math.random() * ACCESS_CODE_CHARS.length)]
  ).join("");
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export function computeInvoiceTotals(
  items: LineItem[],
  taxFiat: number
): { subtotal: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  return { subtotal, total: subtotal + taxFiat };
}
