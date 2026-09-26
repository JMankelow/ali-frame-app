export interface ChecklistItem {
  label: string;
  done: boolean;
  detail?: string;
}

export function JobChecklistSection({ items }: { items: ChecklistItem[] }) {
  const outstanding = items.filter((i) => !i.done).length;

  return (
    <div className="card">
      <div className="label">Job Checklist</div>
      <div className="hint" style={{ marginTop: 4 }}>
        {outstanding === 0
          ? "Everything below is done."
          : `${outstanding} step${outstanding === 1 ? "" : "s"} still outstanding.`}
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 6,
              background: item.done ? "#f0fdf4" : "#fff7ed",
              border: `1px solid ${item.done ? "#bbf7d0" : "#fed7aa"}`,
            }}
          >
            <span className={`status ${item.done ? "green" : "orange"}`}>{item.done ? "Done" : "Outstanding"}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{item.label}</div>
              {item.detail && <div className="hint">{item.detail}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
