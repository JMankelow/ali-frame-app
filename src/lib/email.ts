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
  if (!from) throw new Error("EMAIL_FROM is not set");

  await getResend().emails.send({
    from,
    to,
    subject: `Your Ali-Frame login code: ${code}`,
    text:
      `Your Ali-Frame Job Management sign-in code is: ${code}\n\n` +
      `This code expires in 10 minutes and can only be used once. ` +
      `If you did not try to sign in, you can ignore this email.`,
  });
}
