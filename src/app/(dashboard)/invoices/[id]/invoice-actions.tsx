"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteDraft, markOverdue, publishInvoice } from "../actions";

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
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-primary">{error}</p>
      )}
      <div className="flex gap-3 flex-wrap">
        {invoice.status === "draft" && (
          <>
            <Button onClick={() => run(() => publishInvoice(invoice.id))} disabled={busy}>
              Publish invoice
            </Button>
            <Button
              variant="outline"
              className="text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => run(async () => { await deleteDraft(invoice.id); router.push("/dashboard"); })}
              disabled={busy}
            >
              Delete draft
            </Button>
          </>
        )}
        {invoice.status === "pending" && (
          <Button variant="outline" onClick={() => run(() => markOverdue(invoice.id))} disabled={busy}>
            Mark as overdue
          </Button>
        )}
      </div>
    </div>
  );
}
