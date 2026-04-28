export function isAccessCodeValid(
  required: string | null,
  provided: string | null | undefined
): boolean {
  if (!required) return true;
  if (!provided) return false;
  return provided.toLowerCase() === required.toLowerCase();
}

export function accessCookieName(invoiceId: string): string {
  return `pb_access_${invoiceId}`;
}
