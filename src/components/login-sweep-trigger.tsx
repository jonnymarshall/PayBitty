"use client";

import { useEffect } from "react";
import { runLoginSweep } from "@/app/(dashboard)/sweep-action";

const SESSION_KEY = "paybitty.sweep.done";

export function LoginSweepTrigger() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    void runLoginSweep().catch((err) => {
      console.error("[login-sweep] failed", err);
    });
  }, []);

  return null;
}
