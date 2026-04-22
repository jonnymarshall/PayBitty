"use client";

import { useState } from "react";
import { PaymentWatcher } from "./payment-watcher";
import type { Invoice } from "@/lib/invoice-public";

interface Props {
  invoiceId: string;
  btcAddress: string;
  initialStatus: Invoice["status"];
}

export function PaymentWatcherUncontrolled({ invoiceId, btcAddress, initialStatus }: Props) {
  const [status, setStatus] = useState<Invoice["status"]>(initialStatus);
  return (
    <PaymentWatcher
      invoiceId={invoiceId}
      btcAddress={btcAddress}
      status={status}
      onStatusChange={setStatus}
    />
  );
}
