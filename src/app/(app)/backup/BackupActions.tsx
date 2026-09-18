"use client";

import { useState, useTransition } from "react";
import { runBackupNow } from "./actions";

export function BackupActions() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleRun() {
    setMessage("");
    startTransition(async () => {
      await runBackupNow();
      setMessage("Backup created.");
    });
  }

  return (
    <div className="topbar">
      <button className="btn light" onClick={handleRun} disabled={pending}>
        {pending ? "Running…" : "Run Backup Now"}
      </button>
      {message && <span className="hint">{message}</span>}
    </div>
  );
}
