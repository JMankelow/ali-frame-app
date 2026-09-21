import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getInstallerStats } from "./stats";
import { AssessmentForm } from "./AssessmentForm";

export default async function PerformancePage() {
  const user = await requireUser();

  const [stats, jobs] = await Promise.all([
    getInstallerStats(),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Performance</h2>
          <div className="subtitle">
            Every installer&apos;s auto-calculated score, remedial rate and assessment history. Reminders go out every
            3 months if no assessment has been done.
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Installer</th>
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
                  No installers (Senior Installer / Crew Mobile role) found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="hint" style={{ marginTop: 10 }}>
          Calculated Score = 60% average Quality Score from assessments (defaults to 3 if none exist) + 40% a
          remedial-rate score (5 minus remedial % of jobs × 5, floored at 1). Rounded 1-5. &quot;Jobs&quot; and
          &quot;Remedial %&quot; only count jobs assigned through the app going forward — the 2026 Job Tracking
          spreadsheet didn&apos;t record who did every job, only who was responsible on the 18 that had a remedial,
          so those are shown separately as a real count, not folded into a misleading percentage.
        </div>
      </div>

      <AssessmentForm installers={stats.map((s) => ({ id: s.userId, name: s.name }))} jobs={jobs} currentUserId={user.id} />
    </div>
  );
}
