import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";

type EmailType = "invoice_published" | "payment_detected" | "payment_confirmed";
type EmailEventStatus = "queued" | "sent" | "failed" | "skipped_no_api_key";

interface EmailEventRow {
  id: string;
  email_type: EmailType;
  recipient: string;
  status: EmailEventStatus;
  error_message: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<EmailType, string> = {
  invoice_published: "Invoice published",
  payment_detected: "Payment detected",
  payment_confirmed: "Payment confirmed",
};

const STATUS_LABEL: Record<EmailEventStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
  skipped_no_api_key: "Skipped",
};

const STATUS_CLASSES: Record<EmailEventStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  sent: "bg-green-500/10 text-green-600 dark:text-green-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  skipped_no_api_key: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

export async function EmailActivityCard({ invoiceId }: { invoiceId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_events")
    .select("id, email_type, recipient, status, error_message, created_at")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  const events = (data ?? []) as EmailEventRow[];
  if (events.length === 0) return null;

  return (
    <section id="invoice-detail--email-activity" className="space-y-3">
      <h2
        id="invoice-detail--email-activity-heading"
        className="text-xs font-semibold text-muted-foreground uppercase tracking-widest"
      >
        Email Activity
      </h2>
      <ul
        id="invoice-detail--email-activity-list"
        className="rounded-lg border border-border divide-y divide-border"
      >
        {events.map((evt) => (
          <li
            key={evt.id}
            className="proxy-id--invoice-detail--email-activity-row px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{TYPE_LABEL[evt.email_type]}</p>
                <p className="text-xs text-muted-foreground truncate">{evt.recipient}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_CLASSES[evt.status]}`}
                >
                  {STATUS_LABEL[evt.status]}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(evt.created_at), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
            {evt.status === "failed" && evt.error_message && (
              <p className="proxy-id--invoice-detail--email-activity-error mt-1.5 text-xs text-red-600 dark:text-red-400 break-words">
                {evt.error_message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
