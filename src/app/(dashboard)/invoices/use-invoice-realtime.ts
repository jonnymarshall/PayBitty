"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function useInvoiceChannelRefresh(channelName: string | null, filter: string | null) {
  const router = useRouter();

  useEffect(() => {
    if (!channelName) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        console.info(`[invoice-realtime] visibility visible — refreshing ${channelName}`);
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    (async () => {
      // Supabase Realtime applies RLS using the subscription's JWT. If the token
      // isn't set on the Realtime instance before subscribing, events are silently
      // dropped. Explicitly fetch the session and set it on Realtime first.
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session) {
        supabase.realtime.setAuth(session.access_token);
        console.info(`[invoice-realtime] auth set for user ${session.user.id}`);
      } else {
        console.warn(`[invoice-realtime] no session — Realtime events will be blocked by RLS`);
        return;
      }

      const postgresChangesConfig: {
        event: "*";
        schema: string;
        table: string;
        filter?: string;
      } = {
        event: "*",
        schema: "public",
        table: "invoices",
      };
      if (filter) postgresChangesConfig.filter = filter;

      channel = supabase
        .channel(channelName)
        .on("postgres_changes", postgresChangesConfig, (payload) => {
          console.info(`[invoice-realtime] event on ${channelName}`, payload.eventType);
          router.refresh();
        })
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            console.info(`[invoice-realtime] subscribed: ${channelName}`);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            console.warn(`[invoice-realtime] ${status} on ${channelName}`, err);
          }
        });
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, [channelName, filter, router]);
}

/**
 * Subscribe to all invoices belonging to the signed-in user (for the /invoices list).
 *
 * Note: no explicit filter — RLS policy `owner_all` already restricts events to rows
 * where auth.uid() = user_id. Relying on RLS is more reliable than a user_id filter,
 * which previously didn't match events correctly in some environments.
 */
export function useInvoiceRealtime(userId: string) {
  useInvoiceChannelRefresh(userId ? `invoices:${userId}` : null, null);
}

/** Subscribe to a single invoice by id (for the /invoices/[id] detail page). */
export function useSingleInvoiceRealtime(invoiceId: string) {
  useInvoiceChannelRefresh(
    invoiceId ? `invoice:${invoiceId}` : null,
    invoiceId ? `id=eq.${invoiceId}` : null
  );
}
