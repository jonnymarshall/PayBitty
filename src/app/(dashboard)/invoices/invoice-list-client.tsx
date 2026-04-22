"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { bulkArchive, bulkDelete, bulkMarkPaid } from "./bulk-actions";

interface Invoice {
  id: string;
  invoice_number: string | null;
  client_name: string | null;
  total_fiat: number;
  currency: string;
  status: string;
  due_date: string | null;
}

interface Props {
  invoices: Invoice[];
}

export function InvoiceListClient({ invoices }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const visible = invoices.filter((inv) => showArchived || inv.status !== "archived");
  const selectable = visible.filter((inv) => inv.status !== "archived");
  const allSelected = selectable.length > 0 && selectable.every((inv) => selected.has(inv.id));
  const selectedIds = Array.from(selected);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable.map((inv) => inv.id)));
    }
  }

  async function handleArchive() {
    setPending(true);
    try {
      await bulkArchive(selectedIds);
      setSelected(new Set());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleMarkPaid() {
    setPending(true);
    try {
      await bulkMarkPaid(selectedIds);
      setSelected(new Set());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      await bulkDelete(selectedIds);
      setSelected(new Set());
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const hasArchived = invoices.some((inv) => inv.status === "archived");

  return (
    <div id="invoice-list-client" className="space-y-3">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div id="invoice-list--bulk-bar" className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
          <span className="text-sm text-muted-foreground mr-2">{selected.size} selected</span>
          <button
            id="invoice-list--bulk-archive"
            onClick={handleArchive}
            disabled={pending}
            className="rounded px-3 py-1 text-sm border border-border hover:bg-muted transition-colors"
          >
            Archive
          </button>
          <button
            id="invoice-list--bulk-mark-paid"
            onClick={handleMarkPaid}
            disabled={pending}
            className="rounded px-3 py-1 text-sm border border-border hover:bg-muted transition-colors"
          >
            Mark as Paid
          </button>
          <button
            id="invoice-list--bulk-delete"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            className="rounded px-3 py-1 text-sm border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div id="invoice-list--confirm-delete" className="rounded-lg border border-destructive bg-card px-4 py-3 flex items-center gap-3">
          <p className="text-sm flex-1">Delete {selected.size} invoice{selected.size !== 1 ? "s" : ""}? Only drafts will be deleted.</p>
          <button
            id="invoice-list--confirm-delete-btn"
            onClick={handleDelete}
            disabled={pending}
            className="rounded px-3 py-1 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded px-3 py-1 text-sm border border-border hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      )}

      {/* List */}
      <div id="invoice-list--table" className="rounded-lg border border-border divide-y divide-border">
        {/* Header row with select-all */}
        <div className="flex items-center gap-3 px-5 py-2 bg-muted/20">
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Invoice</span>
        </div>

        {visible.map((invoice) => {
          const isArchived = invoice.status === "archived";
          return (
            <div
              key={invoice.id}
              id={`invoice-list--row-${invoice.id}`}
              className="proxy-id--invoice-list--row flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              {!isArchived && (
                <input
                  type="checkbox"
                  aria-label={`Select ${invoice.invoice_number ?? invoice.id}`}
                  checked={selected.has(invoice.id)}
                  onChange={() => toggleOne(invoice.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-border flex-shrink-0"
                />
              )}
              {isArchived && <div className="w-4 flex-shrink-0" />}

              {/* Clickable content */}
              <button
                onClick={() => router.push(`/invoices/${invoice.id}`)}
                className="flex flex-1 items-center justify-between text-left"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span>{invoice.invoice_number || "—"}</span>
                    {invoice.client_name && (
                      <span className="font-normal text-muted-foreground">{invoice.client_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.due_date
                      ? `Due ${format(new Date(invoice.due_date + "T12:00:00"), "MMM d, yyyy")}`
                      : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: invoice.currency,
                    }).format(invoice.total_fiat)}
                  </span>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Archive toggle */}
      {hasArchived && (
        <div className="flex justify-end">
          <button
            id="invoice-list--archive-toggle"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
        </div>
      )}
    </div>
  );
}
