import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResendSend = vi.fn();
const mockGetResend = vi.fn();
vi.mock("./client", () => ({
  getResend: () => mockGetResend(),
  getFromAddress: () => "Paybitty <test@example.com>",
  getAppUrl: () => "https://app.test",
}));

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: (row: unknown) => mockInsert(table, row),
      update: (row: unknown) => mockUpdate(table, row),
    }),
  }),
}));

import { sendInvoicePublishedEmail } from "./send";

const baseArgs = {
  to: "client@example.com",
  userId: "user-123",
  senderName: "Charles",
  clientName: "Ada",
  invoiceId: "inv-1",
  invoiceNumber: "INV-001",
  totalFiat: 500,
  currency: "USD",
  accessCode: "SECRET42",
  dueDateDisplay: "July 10, 2026",
};

beforeEach(() => {
  vi.clearAllMocks();

  // Default insert chain: returns { data: { id: "evt-1" } }
  mockInsert.mockReturnValue({
    select: () => ({
      single: () => Promise.resolve({ data: { id: "evt-1" }, error: null }),
    }),
  });

  // Default update chain: succeeds
  mockUpdate.mockReturnValue({
    eq: () => Promise.resolve({ data: null, error: null }),
  });

  // Default getResend returns a Resend-like client
  mockGetResend.mockReturnValue({ emails: { send: mockResendSend } });

  // Default Resend success
  mockResendSend.mockResolvedValue({ data: { id: "resend-msg-1" }, error: null });
});

describe("safeSend (via sendInvoicePublishedEmail)", () => {
  it("inserts a queued email_events row then marks it sent with the resend message id on success", async () => {
    await sendInvoicePublishedEmail(baseArgs);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const [insertedTable, insertedRow] = mockInsert.mock.calls[0];
    expect(insertedTable).toBe("email_events");
    expect(insertedRow).toMatchObject({
      invoice_id: "inv-1",
      user_id: "user-123",
      email_type: "invoice_published",
      recipient: "client@example.com",
      status: "queued",
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const [updatedTable, updatedRow] = mockUpdate.mock.calls[0];
    expect(updatedTable).toBe("email_events");
    expect(updatedRow).toMatchObject({
      status: "sent",
      resend_message_id: "resend-msg-1",
    });
  });

  it("marks the row skipped_no_api_key and skips Resend when RESEND_API_KEY is missing", async () => {
    mockGetResend.mockReturnValueOnce(null);

    await sendInvoicePublishedEmail(baseArgs);

    expect(mockResendSend).not.toHaveBeenCalled();
    const [, insertedRow] = mockInsert.mock.calls[0];
    expect(insertedRow.status).toBe("queued");

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const [, updatedRow] = mockUpdate.mock.calls[0];
    expect(updatedRow.status).toBe("skipped_no_api_key");
  });

  it("marks the row failed and captures the error message when Resend returns an error", async () => {
    mockResendSend.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "Recipient blocked" },
    });

    await sendInvoicePublishedEmail(baseArgs);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const [, updatedRow] = mockUpdate.mock.calls[0];
    expect(updatedRow.status).toBe("failed");
    expect(String(updatedRow.error_message)).toMatch(/Recipient blocked/);
  });

  it("does not throw when the email_events insert itself errors", async () => {
    mockInsert.mockReturnValueOnce({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: { message: "db down" } }),
      }),
    });

    await expect(sendInvoicePublishedEmail(baseArgs)).resolves.toBeUndefined();
  });
});
