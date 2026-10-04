"use client";

import { useMemo, useRef, useState } from "react";

export interface ContactOption {
  name: string;
  email: string;
}

/** Type-to-search picker over every contact in the system — not filtered to
 * a specific supplier, so any contact can be found and tested. */
export function ContactPicker({
  contacts,
  value,
  onChange,
  placeholder = "Search all contacts by name, company or email...",
}: {
  contacts: ContactOption[];
  value: string;
  onChange: (email: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = contacts.find((c) => c.email === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? contacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) : contacts;
    return list.slice(0, 50);
  }, [contacts, query]);

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className="jobPicker" onBlur={handleBlur}>
      <input
        type="text"
        value={open ? query : selected ? `${selected.name} (${selected.email})` : ""}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {open && (
        <div className="jobPickerResults">
          {filtered.length === 0 && <div className="jobPickerEmpty">No contacts match.</div>}
          {filtered.map((c) => (
            <button
              key={c.email}
              type="button"
              className="jobPickerResult"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(c.email);
                setOpen(false);
                setQuery("");
              }}
            >
              {c.name} ({c.email})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
