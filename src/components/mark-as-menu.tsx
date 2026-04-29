"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MarkAsMenuProps {
  invoiceId: string;
  status: string;
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onMarkOverdue: (id: string) => void;
  busy?: boolean;
}

// payment_detected is a transient on-chain state; treat it like pending for
// the purposes of this menu so the owner can still override either way.
const UNPAID_STATES = new Set(["pending", "payment_detected"]);

export function MarkAsMenu({
  invoiceId,
  status,
  onMarkPaid,
  onMarkUnpaid,
  onMarkOverdue,
  busy,
}: MarkAsMenuProps) {
  const isUnpaid = UNPAID_STATES.has(status);
  const isPaid = status === "paid";
  const isOverdue = status === "overdue";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            id={`mark-as-menu--trigger-${invoiceId}`}
            variant="outline"
            disabled={busy}
          >
            Mark as
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {!isPaid && (
          <DropdownMenuItem
            id={`mark-as-menu--paid-${invoiceId}`}
            onClick={() => onMarkPaid(invoiceId)}
          >
            Paid
          </DropdownMenuItem>
        )}
        {!isUnpaid && (
          <DropdownMenuItem
            id={`mark-as-menu--unpaid-${invoiceId}`}
            onClick={() => onMarkUnpaid(invoiceId)}
          >
            Unpaid
          </DropdownMenuItem>
        )}
        {!isOverdue && (
          <DropdownMenuItem
            id={`mark-as-menu--overdue-${invoiceId}`}
            onClick={() => onMarkOverdue(invoiceId)}
          >
            Overdue
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
