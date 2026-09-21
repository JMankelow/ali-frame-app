import "server-only";
import { prisma } from "@/lib/prisma";

export interface InstallerStats {
  userId: string;
  name: string;
  jobsCount: number;
  remedialCount: number;
  remedialPercentage: number;
  avgQualityScore: number | null;
  assessmentCount: number;
  latestAssessmentAt: Date | null;
  calculatedScore: number;
  // Remedials named against this installer in the imported Job Tracking
  // spreadsheet — real, but NOT a percentage: the sheet never recorded who
  // did every job, only who was responsible when a remedial happened, so
  // there's no honest total-jobs denominator for these historical rows.
  historicalRemedialCount: number;
  // Sum of JobCosting.remedialCost for those same historical rows — the
  // real dollar figure from the Margin/Remedial columns of the import.
  historicalRemedialCost: number;
}

/**
 * Auto-calculated 1-5 score, blending real data already in the app:
 *   - 60% the average Quality Score (1-5) from InstallerAssessment records
 *     (Jo's real Job Checklist / 360 Review forms), defaulting to 3
 *     ("Satisfactory"/"Competent" on her rating scale) if none exist yet.
 *   - 40% a remedial-rate score: 5 minus (remedial % of jobs * 5), floored
 *     at 1 — fewer remedials per job worked = higher score.
 * Rounded to the nearest whole number, clamped 1-5. This is a first-pass
 * formula — the weighting is easy to adjust in one place once Jo has real
 * assessment data to compare it against.
 */
function calculateScore(avgQualityScore: number | null, remedialPercentage: number): number {
  const qualityComponent = avgQualityScore ?? 3;
  const remedialComponent = Math.max(1, 5 - remedialPercentage * 5);
  const blended = qualityComponent * 0.6 + remedialComponent * 0.4;
  return Math.min(5, Math.max(1, Math.round(blended)));
}

export async function getInstallerStats(): Promise<InstallerStats[]> {
  const installers = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["SENIOR_INSTALLER", "CREW_MOBILE"] } },
    orderBy: { name: "asc" },
  });

  const stats = await Promise.all(
    installers.map(async (installer) => {
      const [jobsCount, remedialCount, assessments, historicalRemedials] = await Promise.all([
        prisma.job.count({ where: { assignedUserId: installer.id } }),
        prisma.remedialItem.count({ where: { job: { assignedUserId: installer.id } } }),
        prisma.installerAssessment.findMany({
          where: { revieweeId: installer.id, qualityScore: { not: null } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.jobCosting.findMany({
          where: { remedialSeniorName: { equals: installer.name, mode: "insensitive" } },
          select: { remedialCost: true },
        }),
      ]);
      const historicalRemedialCount = historicalRemedials.length;
      const historicalRemedialCost = historicalRemedials.reduce((sum, r) => sum + (r.remedialCost ?? 0), 0);

      const remedialPercentage = jobsCount > 0 ? remedialCount / jobsCount : 0;
      const avgQualityScore =
        assessments.length > 0
          ? assessments.reduce((sum, a) => sum + (a.qualityScore ?? 0), 0) / assessments.length
          : null;

      return {
        userId: installer.id,
        name: installer.name,
        jobsCount,
        remedialCount,
        remedialPercentage,
        avgQualityScore,
        assessmentCount: assessments.length,
        latestAssessmentAt: assessments[0]?.createdAt ?? null,
        calculatedScore: calculateScore(avgQualityScore, remedialPercentage),
        historicalRemedialCount,
        historicalRemedialCost,
      };
    })
  );

  return stats;
}
