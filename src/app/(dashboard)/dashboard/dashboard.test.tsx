import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

const MOCK_INVOICES = [
  { id: "1", client_name: "Acme Corp", total_fiat: 2500, currency: "USD", status: "pending", created_at: "2026-04-01" },
  { id: "2", client_name: "Globex", total_fiat: 500, currency: "USD", status: "paid", created_at: "2026-04-02" },
  { id: "3", client_name: "Initech", total_fiat: 750, currency: "USD", status: "draft", created_at: "2026-04-03" },
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
      order: vi.fn().mockResolvedValue({ data: MOCK_INVOICES, error: null }),
    })),
  }),
}));

describe("DashboardPage", () => {
  it("renders the invoices heading", async () => {
    render(await DashboardPage());
    expect(screen.getByRole("heading", { name: /invoices/i })).toBeInTheDocument();
  });

  it("shows a New Invoice link", async () => {
    render(await DashboardPage());
    expect(screen.getByRole("link", { name: /new invoice/i })).toBeInTheDocument();
  });

  it("renders a row for each invoice with client name and total", async () => {
    render(await DashboardPage());
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("Initech")).toBeInTheDocument();
  });

  it("displays the correct status badge for each invoice", async () => {
    render(await DashboardPage());
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("shows empty state when there are no invoices", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    render(await DashboardPage());
    expect(screen.getByText(/no invoices yet/i)).toBeInTheDocument();
  });
});
