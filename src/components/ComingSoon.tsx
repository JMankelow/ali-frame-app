const PROTOTYPE_URL = "https://claude.ai/code/artifact/c92f8bb2-9536-4b09-8104-2c8cd55ffb78";

export function ComingSoon({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{title}</h2>
          <div className="subtitle">Not migrated to the real app yet — still using the prototype for this tool.</div>
        </div>
      </div>
      <div className="card">
        <div className="label">Coming soon</div>
        <p style={{ marginTop: 8, color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
          {hint ?? `${title} hasn't been rebuilt as a real, shared feature yet.`} In the meantime, keep using it in
          the prototype below — nothing here has been lost, it just isn't backed by the live database yet.
        </p>
        <div className="actions" style={{ marginTop: 14 }}>
          <a href={PROTOTYPE_URL} target="_blank" rel="noopener noreferrer" className="btn primary">
            Open in prototype ↗
          </a>
        </div>
      </div>
    </div>
  );
}
