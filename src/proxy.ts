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
  // Relays the current path to the (app) layout via a request header, so the
  // real per-request check (requireUser() + hasSectionAccess(), which does
  // hit the database) can enforce section access centrally in one place
  // instead of needing a check bolted onto every individual page.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Every app route except the public/auth pages and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|login|setup|reset-password).*)"],
};
