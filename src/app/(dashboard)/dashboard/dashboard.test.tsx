import { describe, it, expect, vi } from "vitest";
import DashboardPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }),
}));

describe("DashboardPage", () => {
  it("redirects to /invoices", async () => {
    const { redirect } = await import("next/navigation");
    expect(() => DashboardPage()).toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/invoices");
  });
});
