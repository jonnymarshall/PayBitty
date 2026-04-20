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
  taxPercent: number
): { subtotal: number; taxFiat: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const taxFiat = Math.round(subtotal * taxPercent) / 100;
  return { subtotal, taxFiat, total: subtotal + taxFiat };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseServerError(raw: string): { field: string | null; message: string } {
  const match = raw.match(/^([a-z_]+): ([\s\S]+)$/);
  if (match) return { field: match[1], message: match[2] };
  return { field: null, message: raw };
}
