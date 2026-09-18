import "server-only";
import { prisma } from "@/lib/prisma";
import { getInstallerStats } from "./stats";

const REVIEW_INTERVAL_DAYS = 90;
const CLAUDE_USER_EMAIL = "claude@aliframe.local";

function selfReminderText(): string {
  return "Your quarterly performance self-assessment is due — please complete it under Human Resources > Performance.";
}

function managerReminderText(installerName: string): string {
  return `${installerName} is due for their quarterly 360 review — please complete the HR assessment under Human Resources > Performance.`;
}

function isOverdue(latestAssessmentAt: Date | null): boolean {
  if (!latestAssessmentAt) return true;
  const ageMs = Date.now() - latestAssessmentAt.getTime();
  return ageMs > REVIEW_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Creates a Notes/Tasks reminder for each installer whose last 360 review
 * (self or HR) is more than 90 days old, or who has never had one. Reuses
 * the existing Notes system rather than a new notification channel, so
 * reminders show up in the same Tasks tab/alert bell Jo already uses.
 *
 * Dedupes against an already-open reminder for the same installer so a
 * daily cron doesn't create a new note every run while one is still
 * unresolved.
 */
export async function checkOverdueInstallerAssessments(): Promise<{ remindersCreated: number }> {
  const [stats, claudeUser, managers] = await Promise.all([
    getInstallerStats(),
    prisma.user.findUnique({ where: { email: CLAUDE_USER_EMAIL }, select: { id: true } }),
    prisma.user.findMany({
      where: { isActive: true, OR: [{ role: "ADMIN_MANAGEMENT" }, { isSuperUser: true }] },
      select: { id: true },
    }),
  ]);

  if (!claudeUser) return { remindersCreated: 0 };

  const overdue = stats.filter((s) => isOverdue(s.latestAssessmentAt));
  let remindersCreated = 0;

  for (const installer of overdue) {
    const alreadyOpen = await prisma.note.findFirst({
      where: { assignedToId: installer.userId, text: selfReminderText(), status: { not: "Done" } },
    });
    if (alreadyOpen) continue;

    await prisma.note.create({
      data: { authorId: claudeUser.id, assignedToId: installer.userId, text: selfReminderText() },
    });

    await Promise.all(
      managers.map((m) =>
        prisma.note.create({
          data: { authorId: claudeUser.id, assignedToId: m.id, text: managerReminderText(installer.name) },
        })
      )
    );

    remindersCreated += 1;
  }

  return { remindersCreated };
}
