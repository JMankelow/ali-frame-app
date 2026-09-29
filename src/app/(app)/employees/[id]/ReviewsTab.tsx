import { AssessmentForm } from "../../performance/AssessmentForm";
import type { JobPickerOption } from "@/components/JobPicker";

export interface ReviewRow {
  id: string;
  reviewerName: string;
  jobNumber: string | null;
  reviewPeriod: string | null;
  overallResult: string | null;
  qualityScore: number | null;
  keyWins: string | null;
  keyIssues: string | null;
  actionsRequired: string | null;
  createdAt: string;
}

export function ReviewsTab({
  employeeId,
  employeeName,
  reviews,
  jobs,
  currentUserId,
}: {
  employeeId: string;
  employeeName: string;
  reviews: ReviewRow[];
  jobs: JobPickerOption[];
  currentUserId: string;
}) {
  return (
    <div>
      <div className="card">
        <div className="label">Review History</div>
        {reviews.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>
            No reviews recorded yet for {employeeName}.
          </div>
        ) : (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reviewer</th>
                <th>Job / Period</th>
                <th>Result</th>
                <th>Quality Score</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleDateString("en-NZ")}</td>
                  <td>{r.reviewerName}</td>
                  <td>{r.jobNumber ?? r.reviewPeriod ?? "—"}</td>
                  <td>{r.overallResult ?? "—"}</td>
                  <td>{r.qualityScore ?? "—"}</td>
                  <td style={{ maxWidth: 260 }}>
                    {r.keyWins && <div>Wins: {r.keyWins}</div>}
                    {r.keyIssues && <div>Issues: {r.keyIssues}</div>}
                    {r.actionsRequired && <div>Actions: {r.actionsRequired}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <AssessmentForm installers={[{ id: employeeId, name: employeeName }]} jobs={jobs} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
