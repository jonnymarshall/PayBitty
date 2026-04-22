import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InvoiceActions } from "./invoice-actions";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

vi.mock("../actions", () => ({
  publishInvoice: vi.fn().mockResolvedValue(undefined),
  markPaid: vi.fn().mockResolvedValue(undefined),
  markOverdue: vi.fn().mockResolvedValue(undefined),
  markUnpaid: vi.fn().mockResolvedValue(undefined),
  deleteDraft: vi.fn().mockResolvedValue(undefined),
  duplicateInvoice: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../bulk-actions", () => ({
  bulkArchive: vi.fn().mockResolvedValue(undefined),
  bulkUnarchive: vi.fn().mockResolvedValue(undefined),
  bulkDelete: vi.fn().mockResolvedValue(undefined),
}));

import { publishInvoice, markPaid, duplicateInvoice, deleteDraft } from "../actions";
import { bulkArchive, bulkUnarchive, bulkDelete } from "../bulk-actions";

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { origin: "https://example.test" },
  });
});

describe("InvoiceActions — draft status", () => {
  const draft = { id: "inv-d", status: "draft" };

  it("renders Edit draft, Mark as sent, Duplicate, Delete buttons", () => {
    render(<InvoiceActions invoice={draft} />);
    expect(screen.getByRole("link", { name: /edit draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark as sent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("does not render non-draft-only actions (Mark as paid, View public invoice, Archive, Unarchive)", () => {
    render(<InvoiceActions invoice={draft} />);
    expect(screen.queryByRole("button", { name: /^mark as paid$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view public invoice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^archive$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unarchive/i })).not.toBeInTheDocument();
  });

  it("calls publishInvoice when Mark as sent is clicked", async () => {
    render(<InvoiceActions invoice={draft} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as sent/i }));
    await waitFor(() => expect(publishInvoice).toHaveBeenCalledWith("inv-d"));
  });

  it("calls duplicateInvoice when Duplicate is clicked", async () => {
    render(<InvoiceActions invoice={draft} />);
    fireEvent.click(screen.getByRole("button", { name: /duplicate/i }));
    await waitFor(() => expect(duplicateInvoice).toHaveBeenCalledWith("inv-d"));
  });

  it("calls deleteDraft when Delete is clicked on a draft", async () => {
    render(<InvoiceActions invoice={draft} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(deleteDraft).toHaveBeenCalledWith("inv-d"));
  });
});

describe("InvoiceActions — pending status", () => {
  const pending = { id: "inv-p", status: "pending" };

  it("renders View public invoice, Mark as paid, Archive, Duplicate, Delete (no Copy public link — already on the Share section)", () => {
    render(<InvoiceActions invoice={pending} />);
    expect(screen.getByRole("link", { name: /view public invoice/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy public link/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark as paid/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^archive$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("does not render draft-only actions (Edit draft, Mark as sent) or Unarchive", () => {
    render(<InvoiceActions invoice={pending} />);
    expect(screen.queryByRole("link", { name: /edit draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark as sent/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unarchive/i })).not.toBeInTheDocument();
  });

  it("View public invoice link points to /invoice/<id> and opens in a new tab", () => {
    render(<InvoiceActions invoice={pending} />);
    const link = screen.getByRole("link", { name: /view public invoice/i });
    expect(link).toHaveAttribute("href", "/invoice/inv-p");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("calls markPaid when Mark as paid is clicked", async () => {
    render(<InvoiceActions invoice={pending} />);
    fireEvent.click(screen.getByRole("button", { name: /mark as paid/i }));
    await waitFor(() => expect(markPaid).toHaveBeenCalledWith("inv-p"));
  });

  it("calls bulkArchive when Archive is clicked", async () => {
    render(<InvoiceActions invoice={pending} />);
    fireEvent.click(screen.getByRole("button", { name: /^archive$/i }));
    await waitFor(() => expect(bulkArchive).toHaveBeenCalledWith(["inv-p"]));
  });

  it("calls bulkDelete when Delete is clicked on a non-draft", async () => {
    render(<InvoiceActions invoice={pending} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(bulkDelete).toHaveBeenCalledWith(["inv-p"]));
  });
});

describe("InvoiceActions — archived status", () => {
  const archived = { id: "inv-a", status: "archived" };

  it("renders Unarchive (not Archive) and does not render Mark as paid", () => {
    render(<InvoiceActions invoice={archived} />);
    expect(screen.getByRole("button", { name: /unarchive/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^archive$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^mark as paid$/i })).not.toBeInTheDocument();
  });

  it("calls bulkUnarchive when Unarchive is clicked", async () => {
    render(<InvoiceActions invoice={archived} />);
    fireEvent.click(screen.getByRole("button", { name: /unarchive/i }));
    await waitFor(() => expect(bulkUnarchive).toHaveBeenCalledWith(["inv-a"]));
  });

  it("still renders View public invoice, Duplicate, Delete for archived", () => {
    render(<InvoiceActions invoice={archived} />);
    expect(screen.getByRole("link", { name: /view public invoice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });
});

describe("InvoiceActions — paid status", () => {
  const paid = { id: "inv-paid", status: "paid" };

  it("does not render Mark as paid (already paid)", () => {
    render(<InvoiceActions invoice={paid} />);
    expect(screen.queryByRole("button", { name: /^mark as paid$/i })).not.toBeInTheDocument();
  });

  it("still renders View public invoice, Archive, Duplicate, Delete", () => {
    render(<InvoiceActions invoice={paid} />);
    expect(screen.getByRole("link", { name: /view public invoice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^archive$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });
});
