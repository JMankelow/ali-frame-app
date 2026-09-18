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
      const [jobsCount, remedialCount, assessments] = await Promise.all([
        prisma.job.count({ where: { assignedUserId: installer.id } }),
        prisma.remedialItem.count({ where: { job: { assignedUserId: installer.id } } }),
        prisma.installerAssessment.findMany({
          where: { revieweeId: installer.id, qualityScore: { not: null } },
          orderBy: { createdAt: "desc" },
        }),
      ]);

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
      };
    })
  );

  return stats;
}
