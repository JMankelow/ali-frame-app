import { requireSuperUser } from "@/lib/session";
import { listBackups } from "@/lib/backup";
import { BackupActions } from "./BackupActions";
import { BackupRow } from "./BackupRow";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function BackupPage() {
  await requireSuperUser();
  const backups = await listBackups();

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Backup Data</h2>
          <div className="subtitle">
            Downloadable snapshots of business data (jobs, clients, leads, notes, timesheets, vehicles, assets,
            performance reviews, etc). Runs automatically once a day; you can also run one on demand below.
          </div>
        </div>
      </div>

      <div className="notice">
        This export never includes password hashes, sessions, or 2FA codes — it cannot be used to sign in as
        anyone. Render&apos;s own database backups (on the paid Postgres plan) are the full disaster-recovery
        mechanism; this is a convenient, human-readable copy of the actual business records.
      </div>

      <BackupActions />

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Backup</th>
              <th>Created</th>
              <th>Size</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <BackupRow key={b.key} backupKey={b.key} created={b.lastModified.toLocaleString("en-NZ")} size={formatSize(b.size)} />
            ))}
            {backups.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">
                  No backups yet — click &quot;Run Backup Now&quot; above, or wait for tonight&apos;s automatic run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
