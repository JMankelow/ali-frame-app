// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { prisma } from "@/lib/prisma";
import { sendHtmlEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { taskStatusHex } from "@/lib/statusColors";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const origin = () => (process.env.APP_URL || "https://ali-frame-app.onrender.com").replace(/\/$/, "");
const dayLong = (d: Date) => d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const nice = (t?: string | null) => (t ? new Date(`2000-01-01T${t}:00`).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" }).replace(" am", " am").replace(" pm", " pm") : "");

const TYPE_COLOUR: Record<string, string> = { Installation: "#0057b8", "Sales Measure": "#16a34a", "Check Measure": "#0d9488", Remedial: "#c62828" };

function whenText(t: { scheduledDate: Date; endDate: Date | null; startTime: string | null; endTime: string | null }) {
  const start = dayLong(t.scheduledDate);
  const multi = t.endDate && t.endDate.getTime() !== t.scheduledDate.getTime();
  const time = t.startTime ? `${nice(t.startTime)}${t.endTime ? ` – ${nice(t.endTime)}` : ""}` : "";
  if (multi) return { line: `${start} to ${dayLong(t.endDate!)}`, sub: time ? `Starting ${time}` : "All day" };
  return { line: start, sub: time || "All day" };
}

/** A calendar file so the booking can be dropped straight into Outlook / the phone calendar. */
function ics(t: { id: string; type: string; scheduledDate: Date; endDate: Date | null; startTime: string | null; endTime: string | null }, summary: string, where: string, description: string) {
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const fold = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ali-Frame//Job Management//EN", "BEGIN:VEVENT", `UID:${t.id}@ali-frame-app`, `DTSTAMP:${stamp}`];
  if (t.startTime) {
    const hm = (x: string) => x.replace(":", "") + "00";
    const endTime = t.endTime ?? (t.endDate ? "17:00" : String(Math.min(Number(t.startTime.slice(0, 2)) + 1, 23)).padStart(2, "0") + t.startTime.slice(2));
    lines.push(`DTSTART;TZID=Pacific/Auckland:${ymd(t.scheduledDate)}T${hm(t.startTime)}`, `DTEND;TZID=Pacific/Auckland:${ymd(t.endDate ?? t.scheduledDate)}T${hm(endTime)}`);
  } else {
    const endExclusive = new Date((t.endDate ?? t.scheduledDate).getTime() + 86400000);
    lines.push(`DTSTART;VALUE=DATE:${ymd(t.scheduledDate)}`, `DTEND;VALUE=DATE:${ymd(endExclusive)}`);
  }
  lines.push(`SUMMARY:${fold(summary)}`, `LOCATION:${fold(where)}`, `DESCRIPTION:${fold(description)}`, "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Emails a booking to each person it's allocated to, at their Ali-Frame email: Ali-Frame colours + logo, the job, when,
 * where, who else is on it, and a button into the app. `onlyUserIds` limits it to people newly added to an existing booking.
 * Never throws — a failed email must not undo a saved booking.
 */
export async function emailBookingToCrew(taskId: string, bookedBy: { id: string; name: string; email: string }, onlyUserIds?: string[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  try {
    const t = await prisma.jobScheduledTask.findUnique({
      where: { id: taskId },
      include: { assignees: { select: { id: true, name: true, email: true, isActive: true } }, job: { select: { number: true, title: true, address: true, phone: true, client: { select: { name: true, phone: true } } } } },
    });
    if (!t) return { sent, failed };
    const people = t.assignees.filter((a) => a.isActive && a.email && !a.email.endsWith(".local") && (!onlyUserIds || onlyUserIds.includes(a.id)));
    if (people.length === 0) return { sent, failed };

    const client = t.job.client?.name ?? t.job.title;
    const phone = t.job.client?.phone ?? t.job.phone ?? "";
    const when = whenText(t);
    const colour = TYPE_COLOUR[t.type] ?? "#0057b8";
    const statusColour = taskStatusHex(t.status) ?? colour;
    const team = t.assignees.map((a) => a.name).join(", ");
    const jobUrl = `${origin()}/jobs/${t.job.number}`;
    const mapUrl = t.job.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.job.address)}` : "";
    const subject = `Booked: ${t.type} — ${t.job.number} ${client} (${t.scheduledDate.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })})`;

    const row = (label: string, value: string) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;width:108px;vertical-align:top;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#64748b;font-weight:600">${label}</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:15px;color:#111827">${value}</td></tr>`;

    for (const p of people) {
      const first = p.name.split(/\s+/)[0];
      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f7fb">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',Calibri,Arial,Helvetica,sans-serif">
  <tr><td style="background:#000000;padding:20px 28px"><img src="${origin()}/aliframe-logo.png" alt="Ali-Frame" width="190" style="display:block;border:0;height:auto"></td></tr>
  <tr><td style="background:#00aeef;height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
  <tr><td style="padding:26px 28px 6px">
    <div style="font-size:13px;color:#64748b">Hi ${esc(first)},</div>
    <div style="font-size:22px;font-weight:600;color:#0f172a;margin:6px 0 4px">You've been booked in</div>
    <div style="font-size:14px;color:#475467">${esc(bookedBy.name)} has put this on the calendar for you.</div>
  </td></tr>
  <tr><td style="padding:14px 28px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-left:6px solid ${statusColour};border-radius:10px"><tr><td style="padding:14px 18px">
      <span style="display:inline-block;background:${colour};color:#ffffff;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase">${esc(t.type)}</span>
      <div style="font-size:18px;font-weight:600;color:#0f172a;margin-top:10px">${esc(when.line)}</div>
      <div style="font-size:15px;color:#475467;margin-top:2px">${esc(when.sub)}</div>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:8px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Job", `<strong>${esc(t.job.number)}</strong> — ${esc(client)}`)}
    ${t.job.address ? row("Where", `${esc(t.job.address)}${mapUrl ? ` &nbsp;<a href="${mapUrl}" style="color:#0057b8;font-size:13px">Map</a>` : ""}`) : ""}
    ${phone ? row("Customer", `${esc(client)} · <a href="tel:${esc(phone.replace(/[^+\d]/g, ""))}" style="color:#0057b8">${esc(phone)}</a>`) : ""}
    ${row("Team", esc(team))}
    ${t.notes ? row("Notes", esc(t.notes).replace(/\n/g, "<br>")) : ""}
  </table></td></tr>
  <tr><td align="center" style="padding:22px 28px 8px"><a href="${jobUrl}" style="display:inline-block;background:#0057b8;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;padding:13px 28px">Open the job</a></td></tr>
  <tr><td align="center" style="padding:0 28px 24px;font-size:12px;color:#64748b">The calendar file attached adds this to your phone or Outlook calendar.</td></tr>
  <tr><td style="background:#000000;padding:16px 28px;font-size:12px;color:#8ba3c7">Ali-Frame Windows &amp; Doors · 34A Allens Road, East Tamaki · 0800 254 372 · <a href="https://www.aliframe.co.nz" style="color:#00aeef;text-decoration:none">aliframe.co.nz</a><br><span style="color:#64748b">You got this because you were allocated to this booking in the Ali-Frame job app.</span></td></tr>
</table></td></tr></table></body></html>`;

      const text = `Hi ${first},\n\n${bookedBy.name} has booked you in.\n\n${t.type}\n${when.line} — ${when.sub}\nJob ${t.job.number} — ${client}\n${t.job.address ? `Where: ${t.job.address}\n` : ""}${phone ? `Customer phone: ${phone}\n` : ""}Team: ${team}\n${t.notes ? `Notes: ${t.notes}\n` : ""}\nOpen the job: ${jobUrl}\n\nAli-Frame Windows & Doors`;
      try {
        await sendHtmlEmail({
          to: p.email,
          subject,
          html,
          text,
          replyTo: bookedBy.email,
          attachments: [{ filename: `booking-${t.job.number}.ics`, content: Buffer.from(ics(t, `${t.type} — ${t.job.number} ${client}`, t.job.address ?? "", `Ali-Frame booking. Open the job: ${jobUrl}`)) }],
        });
        sent += 1;
      } catch (e) {
        failed += 1;
        console.error("[booking-email] could not email", p.email, e);
      }
    }
    await logAudit({ userId: bookedBy.id, action: "booking_emailed_to_crew", entityType: "Job", entityId: t.job.number, metadata: { type: t.type, sent, failed, to: people.map((p) => p.name) } });
  } catch (e) {
    console.error("[booking-email] failed", e);
  }
  return { sent, failed };
}
