import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { logInvoiceEvent } from "./invoice-events";

function makeAdmin({ insertError = null as object | null } = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const from = vi.fn().mockReturnValue({ insert });
  vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);
  return { from, insert };
}

beforeEach(() => vi.clearAllMocks());

describe("logInvoiceEvent", () => {
  it("inserts an invoice_events row with the supplied invoice_id, user_id, and event_type", async () => {
    const { from, insert } = makeAdmin();
    await logInvoiceEvent({
      invoiceId: "inv-1",
      userId: "user-1",
      eventType: "marked_as_sent",
    });
    expect(from).toHaveBeenCalledWith("invoice_events");
    expect(insert).toHaveBeenCalledWith({
      invoice_id: "inv-1",
      user_id: "user-1",
      event_type: "marked_as_sent",
    });
  });

  it("does not throw when the insert fails (errors are logged, not propagated)", async () => {
    makeAdmin({ insertError: { message: "boom" } });
    await expect(
      logInvoiceEvent({ invoiceId: "inv-1", userId: "user-1", eventType: "marked_as_paid" }),
    ).resolves.toBeUndefined();
  });

  it("does not throw when createAdminClient itself blows up", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("no service role key");
    });
    await expect(
      logInvoiceEvent({ invoiceId: "inv-1", userId: "user-1", eventType: "marked_as_overdue" }),
    ).resolves.toBeUndefined();
  });
});
