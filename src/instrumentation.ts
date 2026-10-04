// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Records every unhandled server error (page, server action, route handler) in the ErrorLog table,
// keyed by the same digest the error page shows as "Reference". That lets the real cause be looked
// up from a reference code without digging through host logs. Only the path (no query string, no
// request body, no cookies/headers) and a truncated message/stack are stored.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const e = err as { digest?: string; message?: string; stack?: string; name?: string };
    await prisma.errorLog.create({
      data: {
        digest: e.digest ?? null,
        path: String(request.path ?? "").split("?")[0].slice(0, 300),
        method: request.method,
        routeType: context.routeType,
        errorName: e.name ?? null,
        message: String(e.message ?? "").slice(0, 600),
        stack: String(e.stack ?? "").slice(0, 2500),
      },
    });
  } catch {
    // Never let error logging itself break a request.
  }
}
