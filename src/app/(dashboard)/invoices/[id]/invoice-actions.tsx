"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteDraft, markOverdue, markPaid, markUnpaid, publishInvoice } from "../actions";

interface Invoice {
  id: string;
  status: string;
}

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 pb-8">
      {error && <p className="text-sm text-primary">{error}</p>}
      <div className="flex gap-3 flex-wrap">
        {invoice.status === "draft" && (
          <>
            <Link href={`/invoices/${invoice.id}/edit`}>
              <Button variant="outline">Edit draft</Button>
            </Link>
            <Button onClick={() => run(() => publishInvoice(invoice.id))} disabled={busy}>
              Publish invoice
            </Button>
            <Button
              variant="outline"
              className="text-primary border-primary/30 hover:bg-primary/10"
              onClick={() =>
                run(async () => {
                  await deleteDraft(invoice.id);
                  router.push("/dashboard");
                })
              }
              disabled={busy}
            >
              Delete draft
            </Button>
          </>
        )}
        {invoice.status === "pending" && (
          <>
            <Button onClick={() => run(() => markPaid(invoice.id))} disabled={busy}>
              Mark as paid
            </Button>
            <Button variant="outline" onClick={() => run(() => markOverdue(invoice.id))} disabled={busy}>
              Mark as overdue
            </Button>
          </>
        )}
        {invoice.status === "overdue" && (
          <Button onClick={() => run(() => markPaid(invoice.id))} disabled={busy}>
            Mark as paid
          </Button>
        )}
        {invoice.status === "payment_detected" && (
          <Button onClick={() => run(() => markPaid(invoice.id))} disabled={busy}>
            Confirm paid
          </Button>
        )}
        {invoice.status === "paid" && (
          <Button variant="outline" onClick={() => run(() => markUnpaid(invoice.id))} disabled={busy}>
            Mark as unpaid
          </Button>
        )}
      </div>
    </div>
  );
}
