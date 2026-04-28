"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";

export interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  client_name: string | null;
  total_fiat: number;
  currency: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface RowActions {
  onMarkSent: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyPublicLink: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function sortableHeader(label: string) {
  return ({ column }: { column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-3 h-8"
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

export function buildColumns(actions: RowActions): ColumnDef<InvoiceRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "invoice_number",
      header: sortableHeader("Invoice"),
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <Link
            href={`/invoices/${invoice.id}`}
            className="font-medium hover:underline"
          >
            {invoice.invoice_number || "—"}
          </Link>
        );
      },
    },
    {
      accessorKey: "client_name",
      header: sortableHeader("Client"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.client_name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: sortableHeader("Date Sent"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "due_date",
      header: sortableHeader("Date Due"),
      cell: ({ row }) => {
        const d = row.original.due_date;
        return (
          <span className="text-muted-foreground">
            {d ? format(new Date(d + "T12:00:00"), "MMM d, yyyy") : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "total_fiat",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-mr-3 h-8"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.original.currency,
        }).format(row.original.total_fiat);
        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
      filterFn: (row, columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.getValue(columnId) as string);
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const invoice = row.original;
        const isDraft = invoice.status === "draft";
        const isArchived = invoice.status === "archived";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 whitespace-nowrap">
              <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}`}>View invoice</Link>} />
              {isDraft && (
                <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>} />
              )}
              {!isDraft && (
                <>
                  <DropdownMenuItem render={<Link href={`/invoice/${invoice.id}`} target="_blank">View public invoice</Link>} />
                  <DropdownMenuItem onClick={() => actions.onCopyPublicLink(invoice.id)}>
                    Copy public link
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/api/invoices/${invoice.id}/pdf`} download>Download PDF</a>} />
                </>
              )}
              {isDraft && (
                <DropdownMenuItem onClick={() => actions.onMarkSent(invoice.id)}>
                  Mark as sent
                </DropdownMenuItem>
              )}
              {invoice.status !== "paid" && !isDraft && (
                <DropdownMenuItem onClick={() => actions.onMarkPaid(invoice.id)}>
                  Mark as paid
                </DropdownMenuItem>
              )}
              {isArchived && (
                <DropdownMenuItem onClick={() => actions.onUnarchive(invoice.id)}>
                  Unarchive
                </DropdownMenuItem>
              )}
              {!isArchived && !isDraft && (
                <DropdownMenuItem onClick={() => actions.onArchive(invoice.id)}>
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => actions.onDuplicate(invoice.id)}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onDelete(invoice.id)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
