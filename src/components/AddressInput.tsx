// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useEffect, useRef, useState } from "react";
import { searchAddresses, type AddressHit } from "@/app/(app)/jobs/addressActions";

/** A text box that suggests New Zealand addresses as you type; typing the whole address by hand always works too. */
export function AddressInput({
  name,
  id,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Start typing the address…",
}: {
  name: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const text = controlled ? value : inner;
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [open, setOpen] = useState(false);
  const picked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (picked.current) {
      picked.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 4) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        setHits(await searchAddresses(text));
      } catch {
        setHits([]);
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text]);

  const set = (v: string) => {
    if (!controlled) setInner(v);
    onChange?.(v);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        name={name}
        value={text}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          set(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: "100%" }}
      />
      {open && hits.length > 0 && (
        <div style={{ position: "absolute", zIndex: 25, left: 0, right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 20px rgba(15,23,42,.12)", maxHeight: 260, overflowY: "auto" }}>
          {hits.map((h) => (
            <button
              key={h.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                picked.current = true;
                set(h.label);
                setHits([]);
                setOpen(false);
              }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14 }}
            >
              {h.label}
            </button>
          ))}
          <div className="hint" style={{ padding: "4px 12px 6px" }}>Pick one, or just keep typing your own.</div>
        </div>
      )}
    </div>
  );
}
