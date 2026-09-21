import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getInstallerStats } from "../performance/stats";
import { AssessmentForm } from "../performance/AssessmentForm";

export default async function SeniorPerformancePage() {
  const user = await requireUser();

  const [allStats, jobs] = await Promise.all([
    getInstallerStats(),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);

  const seniorIds = new Set(
    (await prisma.user.findMany({ where: { role: "SENIOR_INSTALLER" }, select: { id: true } })).map((u) => u.id)
  );
  const stats = allStats.filter((s) => seniorIds.has(s.userId));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Senior Performance</h2>
          <div className="subtitle">Same performance data as the Performance tab, filtered to Senior Installers.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Senior Installer</th>
              <th>Jobs</th>
              <th>Remedials</th>
              <th>Remedial %</th>
              <th>Historical Remedials (2026 Job Tracking import)</th>
              <th>Historical Remedial Cost</th>
              <th>Avg Quality Score</th>
              <th>Assessments</th>
              <th>Last Assessed</th>
              <th>Calculated Score (1-5)</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.userId}>
                <td>{s.name}</td>
                <td>{s.jobsCount}</td>
                <td>{s.remedialCount}</td>
                <td>{(s.remedialPercentage * 100).toFixed(0)}%</td>
                <td>{s.historicalRemedialCount}</td>
                <td>{s.historicalRemedialCost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}</td>
                <td>{s.avgQualityScore ? s.avgQualityScore.toFixed(1) : "—"}</td>
                <td>{s.assessmentCount}</td>
                <td>{s.latestAssessmentAt ? s.latestAssessmentAt.toLocaleDateString("en-NZ") : "Never"}</td>
                <td>
                  <span className={`status ${s.calculatedScore >= 4 ? "green" : s.calculatedScore >= 3 ? "blue" : "orange"}`}>
                    {s.calculatedScore}
                  </span>
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={10} className="hint">
                  No Senior Installer accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="hint" style={{ marginTop: 10 }}>
          &quot;Jobs&quot; and &quot;Remedial %&quot; only count jobs assigned through the app going forward — the
          2026 Job Tracking spreadsheet didn&apos;t record who did every job, only who was responsible on jobs with a
          remedial, so those are shown separately as a real count, not folded into a misleading percentage.
        </div>
      </div>

      <AssessmentForm installers={stats.map((s) => ({ id: s.userId, name: s.name }))} jobs={jobs} currentUserId={user.id} />
    </div>
  );
}
