import { NextResponse, type NextRequest } from "next/server";

// This is a cheap, Edge-safe first filter only: "is there a session cookie at
// all?" It cannot check whether the cookie is still valid (expired, revoked,
// wrong role) because that requires a database lookup, and Edge middleware
// can't safely run Prisma. The REAL check happens per-request in Node runtime
// via requireUser()/requireRole() in src/lib/session.ts, called at the top of
// every protected Server Action, route handler, and (app) layout/page. Treat
// this middleware as a UX redirect, not the security boundary.
const SESSION_COOKIE = "af_session";

export function proxy(req: NextRequest) {
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/jobs/:path*", "/leads/:path*", "/users/:path*", "/settings/:path*"],
};
