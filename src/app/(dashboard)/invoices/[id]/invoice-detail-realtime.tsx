"use client";

import { useSingleInvoiceRealtime } from "@/app/(dashboard)/invoices/use-invoice-realtime";

interface Props {
  invoiceId: string;
}

/**
 * Invisible client component that subscribes to Realtime updates for one invoice.
 * When the row changes in Supabase (status flip, txid set), it calls router.refresh()
 * so the parent server component re-fetches and re-renders with fresh data.
 */
export function InvoiceDetailRealtime({ invoiceId }: Props) {
  useSingleInvoiceRealtime(invoiceId);
  return null;
}
