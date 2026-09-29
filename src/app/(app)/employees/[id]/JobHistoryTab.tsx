import Link from "next/link";

export interface JobHistoryRow {
  jobNumber: string;
  clientName: string;
  role: string;
  date: string | null;
  status: string;
}

export function JobHistoryTab({ rows }: { rows: JobHistoryRow[] }) {
  return (
    <div className="card">
      <div className="label">Job History</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Every job this person is assigned to (as sales owner) or has a booking against (as installer).
      </div>
      {rows.length === 0 ? (
        <div className="hint" style={{ marginTop: 8 }}>
          No jobs linked to this person yet.
        </div>
      ) : (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Job</th>
              <th>Client</th>
              <th>Role</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <Link href={`/jobs/${r.jobNumber}`} style={{ color: "var(--blueDark)", fontWeight: 700, textDecoration: "none" }}>
                    {r.jobNumber}
                  </Link>
                </td>
                <td>{r.clientName}</td>
                <td>{r.role}</td>
                <td>{r.date ? new Date(r.date).toLocaleDateString("en-NZ") : "—"}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
