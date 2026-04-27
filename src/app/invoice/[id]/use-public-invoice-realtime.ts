"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/invoice-public";

type PartialInvoice = Partial<Invoice> & { id: string };

/**
 * Public payer page (v1.4.2) Realtime subscription.
 *
 * The /invoice/[id] page is unauthenticated — we subscribe with the anon key so
 * cron-driven status transitions (which the on-page mempool watcher cannot see
 * when no payment hits its watched address) flip the badge without a refresh.
 *
 * RLS for anon SELECT on non-draft invoices is granted by migration 0009.
 * REPLICA IDENTITY FULL (migration 0006) ensures UPDATE payloads carry full rows.
 */
export function usePublicInvoiceRealtime(
  invoiceId: string,
  onUpdate: (next: PartialInvoice) => void
) {
  const router = useRouter();

  useEffect(() => {
    if (!invoiceId) return;

    const supabase = createClient();
    const channelName = `public-invoice:${invoiceId}`;
    let channel: RealtimeChannel | null = null;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "invoices",
          filter: `id=eq.${invoiceId}`,
        },
        (payload) => {
          const next = payload.new as PartialInvoice | undefined;
          if (next && next.id) onUpdate(next);
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`[public-invoice-realtime] ${status} on ${channelName}`, err);
        }
      });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, [invoiceId, onUpdate, router]);
}
