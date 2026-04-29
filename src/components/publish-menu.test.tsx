import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PublishMenu } from "./publish-menu";

const onSendEmail = vi.fn();
const onMarkSent = vi.fn();
const onDownloadAndMarkSent = vi.fn();
const onPublishOnly = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

function open(triggerLabel = /publish/i) {
  fireEvent.click(screen.getByRole("button", { name: triggerLabel }));
}

describe("PublishMenu — draft, no email yet attempted", () => {
  beforeEach(() => {
    render(
      <PublishMenu
        invoiceId="inv-1"
        isDraft
        emailAttemptedAt={null}
        clientEmail="ada@example.com"
        onSendEmail={onSendEmail}
        onMarkSent={onMarkSent}
        onDownloadAndMarkSent={onDownloadAndMarkSent}
        onPublishOnly={onPublishOnly}
      />
    );
    open();
  });

  it("shows all four options", () => {
    expect(screen.getByRole("menuitem", { name: /send now via email/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /download and mark as sent/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^mark as sent$/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /publish only/i })).toBeInTheDocument();
  });

  it("invokes onSendEmail when 'Send now via email' is clicked", async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: /send now via email/i }));
    await waitFor(() => expect(onSendEmail).toHaveBeenCalledWith("inv-1"));
  });

  it("invokes onDownloadAndMarkSent when 'Download and mark as sent' is clicked", async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: /download and mark as sent/i }));
    await waitFor(() => expect(onDownloadAndMarkSent).toHaveBeenCalledWith("inv-1"));
  });

  it("invokes onMarkSent when 'Mark as sent' is clicked", async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: /^mark as sent$/i }));
    await waitFor(() => expect(onMarkSent).toHaveBeenCalledWith("inv-1"));
  });

  it("invokes onPublishOnly when 'Publish only' is clicked", async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: /publish only/i }));
    await waitFor(() => expect(onPublishOnly).toHaveBeenCalledWith("inv-1"));
  });
});

describe("PublishMenu — already-published, not yet sent", () => {
  beforeEach(() => {
    render(
      <PublishMenu
        invoiceId="inv-2"
        isDraft={false}
        emailAttemptedAt={null}
        clientEmail="ada@example.com"
        onSendEmail={onSendEmail}
        onMarkSent={onMarkSent}
        onDownloadAndMarkSent={onDownloadAndMarkSent}
        onPublishOnly={onPublishOnly}
      />
    );
    open(/send/i);
  });

  it("shows three options (no 'Publish only')", () => {
    expect(screen.getByRole("menuitem", { name: /send now via email/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /download and mark as sent/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^mark as sent$/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /publish only/i })).not.toBeInTheDocument();
  });
});

describe("PublishMenu — manually-marked-sent (sent_at set, no email yet)", () => {
  beforeEach(() => {
    render(
      <PublishMenu
        invoiceId="inv-manual"
        isDraft={false}
        emailAttemptedAt={null}
        sentAt="2026-04-28T10:00:00Z"
        sendMethod="manual"
        clientEmail="ada@example.com"
        onSendEmail={onSendEmail}
        onMarkSent={onMarkSent}
        onDownloadAndMarkSent={onDownloadAndMarkSent}
        onPublishOnly={onPublishOnly}
      />
    );
    open(/send/i);
  });

  it("shows only 'Send now via email' (manual options are no-ops once sent_at is set)", () => {
    expect(screen.getByRole("menuitem", { name: /send now via email/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /download and mark as sent/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^mark as sent$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /publish only/i })).not.toBeInTheDocument();
  });

  it("'Send now via email' is enabled (email_attempted_at NULL)", () => {
    const item = screen.getByRole("menuitem", { name: /send now via email/i });
    expect(item).not.toHaveAttribute("data-disabled");
  });
});

describe("PublishMenu — gating after email attempt", () => {
  it("disables 'Send now via email' once email_attempted_at is set", () => {
    render(
      <PublishMenu
        invoiceId="inv-3"
        isDraft={false}
        emailAttemptedAt="2026-04-28T10:00:00Z"
        clientEmail="ada@example.com"
        onSendEmail={onSendEmail}
        onMarkSent={onMarkSent}
        onDownloadAndMarkSent={onDownloadAndMarkSent}
        onPublishOnly={onPublishOnly}
      />
    );
    open(/send/i);
    const item = screen.getByRole("menuitem", { name: /send now via email/i });
    expect(item).toHaveAttribute("data-disabled");
  });

  it("disables 'Send now via email' when client_email is blank (no recipient)", () => {
    render(
      <PublishMenu
        invoiceId="inv-4"
        isDraft
        emailAttemptedAt={null}
        clientEmail=""
        onSendEmail={onSendEmail}
        onMarkSent={onMarkSent}
        onDownloadAndMarkSent={onDownloadAndMarkSent}
        onPublishOnly={onPublishOnly}
      />
    );
    open();
    const item = screen.getByRole("menuitem", { name: /send now via email/i });
    expect(item).toHaveAttribute("data-disabled");
  });

  it("keeps 'Send now via email' enabled after manual mark-as-sent (email_attempted_at still NULL)", () => {
    render(
      <PublishMenu
        invoiceId="inv-5"
        isDraft={false}
        emailAttemptedAt={null}
        sentAt="2026-04-28T10:00:00Z"
        sendMethod="manual"
        clientEmail="ada@example.com"
        onSendEmail={onSendEmail}
        onMarkSent={onMarkSent}
        onDownloadAndMarkSent={onDownloadAndMarkSent}
        onPublishOnly={onPublishOnly}
      />
    );
    open(/send/i);
    const item = screen.getByRole("menuitem", { name: /send now via email/i });
    expect(item).not.toHaveAttribute("data-disabled");
  });
});
