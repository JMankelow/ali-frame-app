import "server-only";
import { Resend } from "resend";

let resendClient: Resend | null = null;

export interface Signer {
  name: string;
  title?: string | null;
  phone?: string | null;
  /** "Ph" for a desk phone, "Mobile" for a mobile. */
  phoneLabel?: string;
}

// Signature details exactly as they appear in each person's current Outlook signature.
const SIGNER_PROFILES: Record<string, Signer> = {
  "jo@aliframe.co.nz": { name: "Joanne Mankelow", title: "Change & Innovation Director", phone: "021 658 448" },
  "tanya@aliframe.co.nz": { name: "Tanya Cleghorn", title: "Operations", phone: "027 231 8160" },
  "dwayne@aliframe.co.nz": { name: "Dwayne Bond", title: "Sales Manager", phone: "021 369 008", phoneLabel: "Mobile" },
};
export function profileSigner(email: string): Signer | null {
  return SIGNER_PROFILES[email.trim().toLowerCase()] ?? null;
}

const SIG_LINKS = {
  facebook: "https://www.facebook.com/aliframes/",
  instagram: "https://www.instagram.com/aliframewindowsdoors/",
  google: "https://www.google.com/search?q=ali+frame",
};

function escapeHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Plain text -> simple HTML followed by the Ali-Frame signature, laid out like the Outlook one:
 * name / title / phone / address / "Follow us on [icons] or write a [G] review" / banner.
 * If the text ends with a sign-off naming the sender, that name line is dropped so it isn't repeated.
 * The plain-text version is always sent as well.
 */
function brandedHtml(text: string, signer?: Signer): string {
  const origin = (process.env.APP_URL || "https://ali-frame-app.onrender.com").replace(/\/$/, "");
  let message = text.trimEnd();
  if (signer) {
    // The signature block below says who it's from, so a typed "Kind regards, <name>" at the end is dropped entirely.
    message = message.replace(/\n*\s*(?:kind regards|best regards|warm regards|regards|many thanks|thanks|cheers)[,!.]?[ \t]*(?:\n[ \t]*[^\n]{1,60})?\s*$/i, "").trimEnd();
  }
  const body = escapeHtml(message)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0057b8">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const grey = "color:#6b7280";
  const icon = (file: string, href: string, alt: string, w: number, h: number) =>
    `<a href="${href}"><img src="${origin}/email/${file}" alt="${alt}" width="${w}" height="${h}" style="border:0;vertical-align:middle;margin:0 3px"></a>`;
  const person = signer
    ? `<strong>${escapeHtml(signer.name)}</strong><br>${signer.title ? `${escapeHtml(signer.title)}<br>` : ""}${signer.phone ? `${signer.phoneLabel ?? "Ph"}: ${escapeHtml(signer.phone)}<br>` : ""}`
    : "";
  return (
    `<div style="font-family:Calibri,Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.5">${body}` +
    `<div style="${grey};font-size:13px;margin-top:18px">${person}34A Allens Road, East Tamaki<br>PO Box 259092, Botany, Auckland 2163<br>` +
    `Follow us on ${icon("facebook.png", SIG_LINKS.facebook, "Facebook", 19, 20)}${icon("instagram.png", SIG_LINKS.instagram, "Instagram", 20, 18)} or write a ${icon("google.png", SIG_LINKS.google, "Google", 20, 18)} review</div>` +
    `<a href="https://www.aliframe.co.nz"><img src="${origin}/email/aliframe-banner.png" alt="Ali-Frame Windows &amp; Doors — 0800 254 372 | www.aliframe.co.nz" width="622" style="display:block;border:0;max-width:100%;height:auto;margin-top:16px"></a></div>`
  );
}

/** Every outgoing email goes through here so it always carries the branded HTML version. */
function sendMail(payload: Record<string, unknown>, signer?: Signer) {
  if (typeof payload.text === "string" && !payload.html) payload.html = brandedHtml(payload.text, signer);
  return getResend().emails.send(payload as never);
}

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendTwoFactorCodeEmail(to: string, code: string) {
  const from = process.env.EMAIL_FROM;

  // Local-dev convenience only: if Resend isn't configured yet, print the
  // code instead of emailing it, so the full login flow can be built and
  // tested before Jo has signed up for a Resend account. This path is only
  // ever reachable when RESEND_API_KEY/EMAIL_FROM are unset; production must
  // have both set (Render env vars), or sendTwoFactorCodeEmail throws below —
  // there is no way to silently skip sending a real code once those are set.
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] 2FA code for ${to}: ${code}`);
    return;
  }

  const result = await sendMail({
    from,
    to,
    subject: `Your Ali-Frame login code: ${code}`,
    text:
      `Your Ali-Frame Job Management sign-in code is: ${code}\n\n` +
      `This code expires in 10 minutes and can only be used once. ` +
      `If you did not try to sign in, you can ignore this email.`,
  });

  // The Resend SDK does NOT throw on a rejected send (e.g. sandbox-mode
  // restrictions, invalid recipient) — it returns { data: null, error }.
  // Without this check, a 2FA email can silently fail to send while the app
  // behaves as if it succeeded, leaving the user stuck with no way to sign in.
  if (result.error) {
    throw new Error(`Failed to send 2FA email: ${result.error.message}`);
  }
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

/** Sends an already-designed HTML email (with a plain-text twin) from the app's sender address. */
export async function sendHtmlEmail(params: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string; attachments?: EmailAttachment[] }) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    console.log(`[DEV ONLY — no email sent] "${params.subject}" would go to ${params.to}`);
    return;
  }
  const result = await sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
  });
  if (result.error) throw new Error(`Failed to send email: ${result.error.message}`);
}

export async function sendSiteMeasureEmail(params: {
  to: string;
  jobNumber: string;
  jobTitle: string;
  fromName: string;
  pageCount: number;
  attachments: EmailAttachment[];
  /** Optional template-based wording; falls back to the standard request if blank. */
  subject?: string;
  body?: string;
}) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(
      `[DEV ONLY — no email sent] Site measure sheet for ${params.jobNumber} would go to ${params.to} ` +
        `with ${params.attachments.length} attachment(s)`
    );
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: params.subject || `Site Measure Sheet — ${params.jobNumber} ${params.jobTitle}`,
    text: params.body
      ? params.body.includes(params.fromName)
        ? params.body
        : `${params.body}\n\n${params.fromName}`
      : `Hi,\n\n` +
      `Please find attached the measure for ${params.jobNumber} ${params.jobTitle}.\n\n` +
      `Could you kindly provide a quote based on the attached details.\n\n` +
      `If you have any questions or need further information, feel free to get in touch.\n\n` +
      `${params.fromName}`,
    attachments: params.attachments,
  });

  if (result.error) {
    throw new Error(`Failed to send site measure email: ${result.error.message}`);
  }
}

export async function sendCheckMeasureBookingEmail(params: {
  to: string;
  jobNumber: string;
  clientName: string;
  dates: string[];
  fromName: string;
}) {
  const from = process.env.EMAIL_FROM;
  const body =
    `Hi,\n\n` +
    `We are ready to book your final check measure for ${params.jobNumber} ${params.clientName}.\n\n` +
    `We have availability on the following dates:\n${params.dates.map((d) => `- ${d}`).join("\n")}\n\n` +
    `Let me know which one suits and a suitable time.\n\n` +
    `${params.fromName}`;

  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] Check measure booking email for ${params.jobNumber} would go to ${params.to}:\n${body}`);
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: `Book Your Final Check Measure — ${params.jobNumber}`,
    text: body,
  });

  if (result.error) {
    throw new Error(`Failed to send check measure booking email: ${result.error.message}`);
  }
}

export async function sendRepricingEmail(params: {
  to: string;
  jobNumber: string;
  subject: string;
  text: string;
  attachments: EmailAttachment[];
}) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] Repricing email for ${params.jobNumber} would go to ${params.to}`);
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    attachments: params.attachments,
  });

  if (result.error) {
    throw new Error(`Failed to send repricing email: ${result.error.message}`);
  }
}

export async function sendPlainNotificationEmail(params: {
  to: string | string[];
  subject: string;
  text: string;
  /** Replies go to this address (the staff member who sent it) instead of the no-reply sender. */
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Sender details for the signature block. */
  signer?: Signer;
}) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] "${params.subject}" would go to ${params.to}`);
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
  }, params.signer);
  if (result.error) {
    throw new Error(`Failed to send notification email: ${result.error.message}`);
  }
}

export async function sendVehicleMechanicEmail(params: { to: string; vehicleName: string; fromName: string; message: string }) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] Mechanic booking request for ${params.vehicleName} would go to ${params.to}`);
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: `Service Booking Request — ${params.vehicleName}`,
    text: `${params.message}\n\nSent by ${params.fromName}, Ali-Frame Windows & Doors.`,
  });

  if (result.error) {
    throw new Error(`Failed to send mechanic booking email: ${result.error.message}`);
  }
}

export async function sendVehicleChecklistEmail(params: {
  to: string;
  vehicleName: string;
  items: string[];
  dueDate: Date;
  checklistUrl: string;
}) {
  const from = process.env.EMAIL_FROM;
  const dueDateStr = params.dueDate.toLocaleDateString("en-NZ");
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] Vehicle checklist for ${params.vehicleName} would go to ${params.to}, due ${dueDateStr}`);
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: `Vehicle Checklist Due — ${params.vehicleName} (by ${dueDateStr})`,
    text:
      `Please complete the vehicle checklist for ${params.vehicleName} by ${dueDateStr}.\n\n` +
      `Items to check:\n${params.items.map((i) => `- ${i}`).join("\n")}\n\n` +
      `Complete it here: ${params.checklistUrl}`,
  });

  if (result.error) {
    throw new Error(`Failed to send vehicle checklist email: ${result.error.message}`);
  }
}

export async function sendVehicleChecklistOverdueAlert(params: {
  to: string[];
  vehicleName: string;
  assignedName: string;
  dueDate: Date;
}) {
  const from = process.env.EMAIL_FROM;
  const dueDateStr = params.dueDate.toLocaleDateString("en-NZ");
  if (!process.env.RESEND_API_KEY || !from || params.to.length === 0) {
    if (process.env.NODE_ENV === "production" && params.to.length > 0) {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] Overdue checklist alert for ${params.vehicleName} (${params.assignedName}) would go to ${params.to.join(", ")}`);
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: `Overdue: Vehicle Checklist — ${params.vehicleName}`,
    text:
      `The vehicle checklist for ${params.vehicleName}, assigned to ${params.assignedName}, was due ${dueDateStr} ` +
      `and has not been completed.`,
  });

  if (result.error) {
    throw new Error(`Failed to send overdue checklist alert: ${result.error.message}`);
  }
}

export async function sendInviteEmail(params: { to: string; name: string; link: string; invitedBy: string }) {
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY / EMAIL_FROM must be set in production");
    }
    console.log(`[DEV ONLY — no email sent] Invite for ${params.to} (link not logged)`);
    return;
  }

  const result = await sendMail({
    from,
    to: params.to,
    subject: "Your Ali-Frame Job Management login",
    text:
      `Hi ${params.name},\n\n` +
      `${params.invitedBy} has set you up on the Ali-Frame Job Management System.\n\n` +
      `Use this link to choose your own password (it works once and expires in 72 hours):\n${params.link}\n\n` +
      `After that, sign in at ${new URL(params.link).origin}/login with this email address and your new password. ` +
      `You'll also be sent a 6-digit code by email each time you sign in.\n\n` +
      `If you weren't expecting this, ignore it — nothing happens unless the link is used.`,
  });

  if (result.error) {
    throw new Error(`Failed to send invite email: ${result.error.message}`);
  }
}
