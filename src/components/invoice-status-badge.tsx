const styles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/15 text-yellow-400",
  payment_detected: "bg-blue-500/15 text-blue-400",
  paid: "bg-green-500/15 text-green-400",
  overdue: "bg-primary/15 text-primary",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}
