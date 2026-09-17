"use client";

import { useMemo, useRef, useState } from "react";

export interface JobPickerOption {
  number: string;
  title: string;
}

/** Type-to-search job picker — a plain <select> gets unusable once there are more than a
 * handful of jobs, so this filters as you type instead of listing every job at once. */
export function JobPicker({
  jobs,
  value,
  onChange,
  placeholder = "Search by job number or title...",
}: {
  jobs: JobPickerOption[];
  value: string;
  onChange: (jobNumber: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = jobs.find((j) => j.number === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? jobs.filter((j) => j.number.toLowerCase().includes(q) || j.title.toLowerCase().includes(q))
      : jobs;
    return list.slice(0, 50);
  }, [jobs, query]);

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
        value={open ? query : selected ? `${selected.number} - ${selected.title}` : ""}
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
          {filtered.length === 0 && <div className="jobPickerEmpty">No jobs match.</div>}
          {filtered.map((j) => (
            <button
              key={j.number}
              type="button"
              className="jobPickerResult"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(j.number);
                setOpen(false);
                setQuery("");
              }}
            >
              {j.number} - {j.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
