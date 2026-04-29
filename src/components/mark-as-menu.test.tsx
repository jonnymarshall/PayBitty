import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkAsMenu } from "./mark-as-menu";

const onMarkPaid = vi.fn();
const onMarkUnpaid = vi.fn();
const onMarkOverdue = vi.fn();

beforeEach(() => vi.clearAllMocks());

function open(invoiceId = "inv-1") {
  fireEvent.click(screen.getByRole("button", { name: /mark as/i }));
  return invoiceId;
}

describe("MarkAsMenu", () => {
  it("on a pending invoice: shows Paid + Overdue, hides Unpaid (already in unpaid state)", () => {
    render(
      <MarkAsMenu
        invoiceId="inv-1"
        status="pending"
        onMarkPaid={onMarkPaid}
        onMarkUnpaid={onMarkUnpaid}
        onMarkOverdue={onMarkOverdue}
      />,
    );
    open();
    expect(screen.getByRole("menuitem", { name: /^paid$/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^overdue$/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^unpaid$/i })).not.toBeInTheDocument();
  });

  it("on a paid invoice: shows Unpaid + Overdue, hides Paid", () => {
    render(
      <MarkAsMenu
        invoiceId="inv-1"
        status="paid"
        onMarkPaid={onMarkPaid}
        onMarkUnpaid={onMarkUnpaid}
        onMarkOverdue={onMarkOverdue}
      />,
    );
    open();
    expect(screen.getByRole("menuitem", { name: /^unpaid$/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^overdue$/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^paid$/i })).not.toBeInTheDocument();
  });

  it("on an overdue invoice: shows Paid + Unpaid, hides Overdue", () => {
    render(
      <MarkAsMenu
        invoiceId="inv-1"
        status="overdue"
        onMarkPaid={onMarkPaid}
        onMarkUnpaid={onMarkUnpaid}
        onMarkOverdue={onMarkOverdue}
      />,
    );
    open();
    expect(screen.getByRole("menuitem", { name: /^paid$/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^unpaid$/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^overdue$/i })).not.toBeInTheDocument();
  });

  it("on payment_detected (transient on-chain state): treats it like pending — shows Paid + Overdue, hides Unpaid", () => {
    render(
      <MarkAsMenu
        invoiceId="inv-1"
        status="payment_detected"
        onMarkPaid={onMarkPaid}
        onMarkUnpaid={onMarkUnpaid}
        onMarkOverdue={onMarkOverdue}
      />,
    );
    open();
    expect(screen.getByRole("menuitem", { name: /^paid$/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^overdue$/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^unpaid$/i })).not.toBeInTheDocument();
  });

  it("invokes the right handler with the invoice id", () => {
    render(
      <MarkAsMenu
        invoiceId="inv-99"
        status="pending"
        onMarkPaid={onMarkPaid}
        onMarkUnpaid={onMarkUnpaid}
        onMarkOverdue={onMarkOverdue}
      />,
    );
    open();
    fireEvent.click(screen.getByRole("menuitem", { name: /^paid$/i }));
    expect(onMarkPaid).toHaveBeenCalledWith("inv-99");
    expect(onMarkUnpaid).not.toHaveBeenCalled();
    expect(onMarkOverdue).not.toHaveBeenCalled();
  });

  it("trigger is disabled when busy is true", () => {
    render(
      <MarkAsMenu
        invoiceId="inv-1"
        status="pending"
        busy
        onMarkPaid={onMarkPaid}
        onMarkUnpaid={onMarkUnpaid}
        onMarkOverdue={onMarkOverdue}
      />,
    );
    expect(screen.getByRole("button", { name: /mark as/i })).toBeDisabled();
  });
});
