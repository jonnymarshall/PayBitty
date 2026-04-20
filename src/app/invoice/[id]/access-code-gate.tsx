"use client";

import { useActionState } from "react";
import { verifyAccessCode, type AccessCodeState } from "./actions";

interface Props {
  invoiceId: string;
}

const initialState: AccessCodeState = { error: undefined };

export function AccessCodeGate({ invoiceId }: Props) {
  const boundAction = verifyAccessCode.bind(null, invoiceId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <main id="access-gate--main" className="flex min-h-screen items-center justify-center p-6">
      <div id="access-gate--card" className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 id="access-gate--heading" className="text-xl font-semibold">Enter access code</h1>
          <p id="access-gate--subheading" className="text-sm text-muted-foreground">
            This invoice is protected. Enter the code provided by the sender.
          </p>
        </div>

        <form id="access-gate--form" action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="access_code" className="text-sm font-medium">
              Access code
            </label>
            <input
              id="access_code"
              name="access_code"
              type="text"
              autoComplete="off"
              autoFocus
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {state?.error && (
              <p id="access-gate--error" className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <button
            id="access-gate--submit"
            type="submit"
            disabled={pending}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
