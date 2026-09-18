import { NextRequest, NextResponse } from "next/server";
import { handleXeroCallback } from "@/lib/xero";
import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/session";

// Xero redirects the browser here after the user approves access on Xero's
// own consent screen — that consent screen is the real security boundary,
// the same as any OAuth callback. /api/xero/connect is still gated to the
// Master User so only they can start a new connection in the first place.
export async function GET(req: NextRequest) {
  try {
    const { tenantName } = await handleXeroCallback(req.url);
    const user = await getSessionUser();
    await logAudit({ userId: user?.id ?? null, action: "xero_connected", entityType: "XeroConnection", metadata: { tenantName } });
    return NextResponse.redirect(new URL("/sync/xero?connected=1", req.url));
  } catch (err) {
    console.error("Xero callback failed", err);
    return NextResponse.redirect(new URL("/sync/xero?error=1", req.url));
  }
}
