"use client";

import { useEffect, useRef } from "react";
import { fetchAddressTxs, txPaysToAddress, type MempoolTx } from "@/lib/mempool";
import { getMempoolWsUrl } from "@/lib/btc-network";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import type { Invoice } from "@/lib/invoice-public";

type Status = Invoice["status"];

interface Props {
  invoiceId: string;
  btcAddress: string;
  status: Status;
  onStatusChange: (s: Status) => void;
}

async function reportStatus(
  invoiceId: string,
  txid: string,
  status: "payment_detected" | "paid"
): Promise<Status | null> {
  const res = await fetch(`/api/invoices/${invoiceId}/payment-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txid, status }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.status ?? null;
}

export function PaymentWatcher({ invoiceId, btcAddress, status, onStatusChange }: Props) {
  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPaid = status === "paid";

  useEffect(() => {
    if (isPaid) return;

    let cancelled = false;

    async function checkRestAndUpdate() {
      const txs = await fetchAddressTxs(btcAddress);
      if (cancelled) return;

      const confirmed = txs.find((tx) => tx.status.confirmed && txPaysToAddress(tx, btcAddress));
      const unconfirmed = txs.find((tx) => !tx.status.confirmed && txPaysToAddress(tx, btcAddress));

      if (confirmed) {
        const next = await reportStatus(invoiceId, confirmed.txid, "paid");
        if (!cancelled && next) {
          onStatusChange(next);
          if (next === "paid") closeWebSocket();
        }
      } else if (unconfirmed) {
        const next = await reportStatus(invoiceId, unconfirmed.txid, "payment_detected");
        if (!cancelled && next) {
          onStatusChange(next);
        }
      }
    }

    function startPolling(delayMs: number) {
      if (cancelled) return;
      pollTimerRef.current = setTimeout(async () => {
        await checkRestAndUpdate();
        if (!cancelled) startPolling(Math.min(delayMs * 2, 600_000));
      }, delayMs);
    }

    function closeWebSocket() {
      const ws = wsRef.current;
      if (!ws) return;
      wsRef.current = null;
      // Closing a CONNECTING socket logs a browser warning — override onopen to close
      // cleanly once the connection is established instead of force-closing mid-handshake.
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      } else {
        ws.close();
      }
    }

    function openWebSocket() {
      const ws = new WebSocket(getMempoolWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: "want", data: ["blocks"] }));
        ws.send(JSON.stringify({ action: "track-address", data: btcAddress }));
      };

      ws.onmessage = async (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        const blockTxs = msg["address-block-transactions"] as MempoolTx[] | undefined;
        const mempoolTxs = msg["address-transactions"] as MempoolTx[] | undefined;

        if (blockTxs) {
          const tx = blockTxs.find((t) => txPaysToAddress(t, btcAddress));
          if (tx) {
            const next = await reportStatus(invoiceId, tx.txid, "paid");
            if (!cancelled && next) {
              onStatusChange(next);
              if (next === "paid") closeWebSocket();
            }
          }
        } else if (mempoolTxs) {
          const tx = mempoolTxs.find((t) => txPaysToAddress(t, btcAddress));
          if (tx) {
            const next = await reportStatus(invoiceId, tx.txid, "payment_detected");
            if (!cancelled && next) {
              onStatusChange(next);
            }
          }
        }
      };

      ws.onerror = (event) => {
        console.warn("[PaymentWatcher] WebSocket error, falling back to polling", event);
        ws.close();
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!cancelled) startPolling(10_000);
      };
    }

    checkRestAndUpdate();
    openWebSocket();

    return () => {
      cancelled = true;
      closeWebSocket();
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [invoiceId, btcAddress, onStatusChange, isPaid]);

  return <InvoiceStatusBadge status={status} id="invoice-view--status" />;
}
