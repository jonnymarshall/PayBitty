import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoicesPage from "./page";

const MOCK_INVOICES = [
  {
    id: "1",
    invoice_number: "INV-001",
    client_name: "Acme Corp",
    total_fiat: 2500,
    currency: "USD",
    status: "pending",
    created_at: "2026-04-01T00:00:00Z",
    due_date: "2026-04-30",
  },
  {
    id: "2",
    invoice_number: "INV-002",
    client_name: "Globex",
    total_fiat: 500,
    currency: "USD",
    status: "paid",
    created_at: "2026-04-02T00:00:00Z",
    due_date: null,
  },
];

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "u1", email: "test@example.com" } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: MOCK_INVOICES }),
    })),
  }),
}));

describe("InvoicesPage", () => {
  it("shows due date with 'Due' prefix when due_date is present", async () => {
    render(await InvoicesPage());
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
  });

  it("shows a dash when invoice has no due_date", async () => {
    render(await InvoicesPage());
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("does not show raw creation date as the date column", async () => {
    render(await InvoicesPage());
    // created_at "2026-04-01" should not appear as the displayed date
    expect(screen.queryByText("4/1/2026")).not.toBeInTheDocument();
    expect(screen.queryByText("04/01/2026")).not.toBeInTheDocument();
  });
});
