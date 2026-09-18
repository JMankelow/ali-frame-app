import "server-only";
import { Resend } from "resend";

let resendClient: Resend | null = null;

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

  const result = await getResend().emails.send({
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

export async function sendSiteMeasureEmail(params: {
  to: string;
  jobNumber: string;
  jobTitle: string;
  fromName: string;
  pageCount: number;
  attachments: EmailAttachment[];
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

  const result = await getResend().emails.send({
    from,
    to: params.to,
    subject: `Site Measure Sheet — ${params.jobNumber} ${params.jobTitle}`,
    text:
      `Attached is the completed ${params.pageCount}-page Ali-Frame Measure Sheet for ` +
      `job ${params.jobNumber} (${params.jobTitle}), sent by ${params.fromName}.\n\n` +
      `Please get in touch if anything on the sketches or opening details needs clarifying.`,
    attachments: params.attachments,
  });

  if (result.error) {
    throw new Error(`Failed to send site measure email: ${result.error.message}`);
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

  const result = await getResend().emails.send({
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

  const result = await getResend().emails.send({
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
