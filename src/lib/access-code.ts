export function isAccessCodeValid(
  required: string | null,
  provided: string | null | undefined
): boolean {
  if (!required) return true;
  return provided === required;
}

export function accessCookieName(invoiceId: string): string {
  return `pb_access_${invoiceId}`;
}
