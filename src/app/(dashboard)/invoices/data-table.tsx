"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { bulkArchive, bulkDelete, bulkMarkPaid } from "./bulk-actions";
import { buildColumns, InvoiceRow } from "./columns";

interface Props {
  data: InvoiceRow[];
}

export function InvoiceDataTable({ data }: Props) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([
    { id: "status", value: ["draft", "pending", "payment_detected", "paid", "overdue"] },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [showArchived, setShowArchived] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const columns = React.useMemo(
    () =>
      buildColumns({
        onArchive: async (id) => {
          setPending(true);
          try {
            await bulkArchive([id]);
            router.refresh();
          } finally {
            setPending(false);
          }
        },
        onMarkPaid: async (id) => {
          setPending(true);
          try {
            await bulkMarkPaid([id]);
            router.refresh();
          } finally {
            setPending(false);
          }
        },
        onDelete: async (id) => {
          if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
          setPending(true);
          try {
            await bulkDelete([id]);
            router.refresh();
          } finally {
            setPending(false);
          }
        },
      }),
    [router]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedIds = Object.keys(rowSelection);
  const hasSelection = selectedIds.length > 0;

  // Keep the status filter in sync with the archive toggle
  React.useEffect(() => {
    const statusValues = showArchived
      ? ["draft", "pending", "payment_detected", "paid", "overdue", "archived"]
      : ["draft", "pending", "payment_detected", "paid", "overdue"];
    table.getColumn("status")?.setFilterValue(statusValues);
  }, [showArchived, table]);

  async function handleBulkArchive() {
    setPending(true);
    try {
      await bulkArchive(selectedIds);
      setRowSelection({});
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleBulkMarkPaid() {
    setPending(true);
    try {
      await bulkMarkPaid(selectedIds);
      setRowSelection({});
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleBulkDelete() {
    setPending(true);
    try {
      await bulkDelete(selectedIds);
      setRowSelection({});
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div id="invoice-data-table">
      {/* Toolbar */}
      <div className="flex items-center gap-2 py-4">
        <Input
          id="invoice-data-table--filter"
          placeholder="Filter by client..."
          value={(table.getColumn("client_name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("client_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />

        {/* Bulk actions dropdown — always visible, disabled when no selection */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                id="invoice-data-table--bulk-actions"
                variant="outline"
                disabled={!hasSelection || pending}
              >
                Bulk actions {hasSelection && `(${selectedIds.length})`}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleBulkArchive}>Archive</DropdownMenuItem>
            <DropdownMenuItem onClick={handleBulkMarkPaid}>Mark as paid</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Show archived toggle */}
        <Button
          id="invoice-data-table--archive-toggle"
          variant="outline"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="ml-auto">
                Columns
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline delete confirmation */}
      {confirmDelete && (
        <div
          id="invoice-data-table--confirm-delete"
          className="mb-4 flex items-center gap-3 rounded-md border border-destructive bg-card px-4 py-3"
        >
          <p className="flex-1 text-sm">
            Delete {selectedIds.length} invoice{selectedIds.length !== 1 ? "s" : ""}? This
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={pending}
          >
            Confirm
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
