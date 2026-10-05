// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { prisma } from "@/lib/prisma";
import { sendPlainNotificationEmail } from "@/lib/email";
import { appUrl } from "@/lib/invite";

/** Emails people whose self assessment is still outstanding and due within 2 days (or overdue). At most once every 3 days each. */
export async function remindPendingSelfAssessments(): Promise<{ reminded: number }> {
  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 86400000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
  const pending = await prisma.review360.findMany({
    where: {
      status: "Self-assessment pending",
      selfDueDate: { lte: soon },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: threeDaysAgo } }],
    },
    include: { employee: { include: { employeeDetail: true } } },
  });
  let reminded = 0;
  for (const r of pending) {
    const u = r.employee;
    if (!u.isActive || u.email.endsWith(".local")) continue;
    const to = u.employeeDetail?.inviteTo === "personal" && u.employeeDetail.personalEmail ? u.employeeDetail.personalEmail : u.email;
    const overdue = r.selfDueDate && r.selfDueDate < now;
    await sendPlainNotificationEmail({
      to,
      subject: overdue ? "Reminder: your self assessment is overdue" : "Reminder: your self assessment is due soon",
      text: `Hi ${u.name.split(" ")[0]},\n\nYour self assessment${r.selfDueDate ? ` was due ${r.selfDueDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long" })}` : " is waiting"}. It only takes a few minutes and you can save it and come back.\n\n${appUrl()}/reviews/${r.id}/self`,
    }).catch(() => undefined);
    await prisma.review360.update({ where: { id: r.id }, data: { lastReminderAt: now } });
    reminded += 1;
  }
  return { reminded };
}
