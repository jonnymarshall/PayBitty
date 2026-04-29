"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PublishMenu } from "@/components/publish-menu";
import {
  deleteDraft,
  duplicateInvoice,
  markOverdue,
  markPaid,
  markUnpaid,
  publishInvoice,
  publishAndSendEmail,
  publishAndMarkSent,
} from "../actions";
import { bulkArchive, bulkDelete, bulkUnarchive } from "../bulk-actions";
import { parseServerError } from "@/lib/invoices";

interface Invoice {
  id: string;
  status: string;
  client_email?: string | null;
  sent_at?: string | null;
  send_method?: "email" | "manual" | null;
  email_attempted_at?: string | null;
}

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = invoice.status === "draft";
  const isArchived = invoice.status === "archived";
  const isPaid = invoice.status === "paid";
  const canMarkPaid = !isDraft && !isArchived && !isPaid;
  // The menu has at least one useful action when:
  //   - it's a draft (Publish-only is always relevant), OR
  //   - the invoice hasn't been marked sent (manual options are usable), OR
  //   - the invoice hasn't yet had an email attempt (Send via email is reachable).
  // Once both sent_at and email_attempted_at are set, every action is a no-op — hide the trigger.
  const emailReachable = !invoice.email_attempted_at && !!invoice.client_email;
  const hasUsefulPublishAction = isDraft || !invoice.sent_at || emailReachable;
  const canShowPublishMenu = !isArchived && hasUsefulPublishAction;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(parseServerError((e as Error).message).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (isDraft) {
      await run(async () => {
        await deleteDraft(invoice.id);
        router.push("/invoices");
      });
    } else {
      await run(async () => {
        await bulkDelete([invoice.id]);
        router.push("/invoices");
      });
    }
  }

  const deliveryLine =
    invoice.sent_at && invoice.send_method
      ? invoice.send_method === "email"
        ? `Sent via email on ${format(new Date(invoice.sent_at), "MMM d, yyyy")}`
        : `Marked as sent on ${format(new Date(invoice.sent_at), "MMM d, yyyy")}`
      : null;

  return (
    <div id="invoice-actions" className="space-y-3 pb-8">
      {error && <p id="invoice-actions--error" className="text-sm text-primary">{error}</p>}
      {deliveryLine && (
        <p id="invoice-actions--delivery-status" className="text-sm text-muted-foreground">
          {deliveryLine}
        </p>
      )}
      <div id="invoice-actions--buttons" className="flex gap-3 flex-wrap">
        {isDraft && (
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button id="invoice-actions--edit-draft-button" variant="outline">Edit draft</Button>
          </Link>
        )}

        {!isDraft && (
          <Link href={`/invoice/${invoice.id}`} target="_blank">
            <Button id="invoice-actions--view-public-button" variant="outline">View public invoice</Button>
          </Link>
        )}

        {!isDraft && (
          <a href={`/api/invoices/${invoice.id}/pdf`} download>
            <Button id="invoice-actions--download-pdf-button" variant="outline">Download PDF</Button>
          </a>
        )}

        {canShowPublishMenu && (
          <PublishMenu
            invoiceId={invoice.id}
            isDraft={isDraft}
            emailAttemptedAt={invoice.email_attempted_at ?? null}
            clientEmail={invoice.client_email ?? null}
            sentAt={invoice.sent_at ?? null}
            sendMethod={invoice.send_method ?? null}
            busy={busy}
            onSendEmail={(id) =>
              run(async () => {
                const result = await publishAndSendEmail(id);
                if (result.emailStatus === "failed") {
                  setError("Email delivery failed. The invoice has been published; visit the activity log for details.");
                }
              })
            }
            onMarkSent={(id) => run(() => publishAndMarkSent(id))}
            onDownloadAndMarkSent={(id) =>
              run(async () => {
                const result = await publishAndMarkSent(id, { withDownload: true });
                if (result?.downloadUrl && typeof window !== "undefined") {
                  window.location.href = result.downloadUrl;
                }
              })
            }
            onPublishOnly={(id) => run(() => publishInvoice(id))}
          />
        )}

        {canMarkPaid && (
          <Button
            id="invoice-actions--mark-paid-button"
            onClick={() => run(() => markPaid(invoice.id))}
            disabled={busy}
          >
            Mark as paid
          </Button>
        )}

        {invoice.status === "pending" && (
          <Button
            id="invoice-actions--mark-overdue-button"
            variant="outline"
            onClick={() => run(() => markOverdue(invoice.id))}
            disabled={busy}
          >
            Mark as overdue
          </Button>
        )}

        {isPaid && (
          <Button
            id="invoice-actions--mark-unpaid-button"
            variant="outline"
            onClick={() => run(() => markUnpaid(invoice.id))}
            disabled={busy}
          >
            Mark as unpaid
          </Button>
        )}

        {isArchived && (
          <Button
            id="invoice-actions--unarchive-button"
            variant="outline"
            onClick={() => run(() => bulkUnarchive([invoice.id]))}
            disabled={busy}
          >
            Unarchive
          </Button>
        )}
        {!isArchived && !isDraft && (
          <Button
            id="invoice-actions--archive-button"
            variant="outline"
            onClick={() => run(() => bulkArchive([invoice.id]))}
            disabled={busy}
          >
            Archive
          </Button>
        )}

        <Button
          id="invoice-actions--duplicate-button"
          variant="outline"
          onClick={() => run(() => duplicateInvoice(invoice.id))}
          disabled={busy}
        >
          Duplicate
        </Button>

        <Button
          id="invoice-actions--delete-button"
          variant="outline"
          className="text-primary border-primary/30 hover:bg-primary/10"
          onClick={handleDelete}
          disabled={busy}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
