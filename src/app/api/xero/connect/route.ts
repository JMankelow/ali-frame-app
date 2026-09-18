import { NextResponse } from "next/server";
import { requireSuperUser } from "@/lib/session";
import { buildXeroConsentUrl } from "@/lib/xero";

export async function GET() {
  await requireSuperUser();
  const consentUrl = await buildXeroConsentUrl();
  return NextResponse.redirect(consentUrl);
}
