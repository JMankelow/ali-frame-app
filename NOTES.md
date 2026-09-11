# Ali-Frame Job Management System — build notes / handoff

Read this before touching the project. It replaces re-discovering state via git log.

## What this project is

A real, secure, multi-user backend for the Ali-Frame Job Management System, replacing the
old single-file HTML prototype (`ali_frame_job_management_system_v21.html` in the parent
folder), which only ever wrote to `localStorage` and could never be shared between staff.
Destined for Render, with a Postgres database, for real use by Dwayne, Tanya, Renae, Tristam
and Jo. Security is the top priority on this build (see `feedback_security_checklist_every_app`
memory / `JTBC Documents\Security\SECURITY_CHECKLIST.md` — apply that checklist to everything
here, don't wait to be asked).

## Verified end-to-end against the real Render Postgres database (2026-09-11)

Jo created a real `ali-frame-db` Postgres instance on Render (JT Business account, Singapore
region, Starter tier). `npx prisma db push` created all tables. Ran the whole flow live:

- `/setup?token=...` created Jo's real admin account (`jo@aliframe.co.nz`), then routed through
  2FA (console-logged code, since Resend isn't configured yet) before reaching `/dashboard`.
- Created a test staff account via `/users`, got a one-time temp password, signed out, signed
  in as that account — confirmed it was forced to `/reset-password` **after** 2FA succeeded,
  then landed on `/dashboard` normally.
- Confirmed the `/users` nav link is hidden for a non-super-user **and**, more importantly,
  that hitting `/users` directly while signed in as that account is rejected server-side
  (`requireSuperUser()` throws) — proves the real enforcement point works, not just the hidden
  link. (Currently surfaces as a raw Next.js dev error overlay, not a friendly "access denied"
  page — cosmetic issue to fix, not a security one; noted below.)
- Created a real Job and a real Lead through their pages, confirmed they show up immediately
  (real Postgres reads, not mocked data).
- Cleaned up: deleted the test Job/Lead/staff-user rows afterward so no fake data is sitting in
  the real database. **Flipped Jo's own account back to `mustResetPassword: true`** — I chose a
  placeholder password to run this test, so she is forced to set her own real password the next
  time she actually signs in. Nobody but her will ever know her real password.

Local `.env` now has the real `DATABASE_URL` (Render's *external* connection string — switch to
the *internal* one once the app itself is also deployed on Render) and a real `SETUP_TOKEN`.
`RESEND_API_KEY`/`EMAIL_FROM` are still blank (dev console-log fallback in use) — needed before
this can go further for real.

Also added `dev-launcher.bat` (committed) — running `next dev` from a short (8.3) Windows path
crashes with a libuv assertion (`fs-event.c` file-watcher bug); this batch file hardcodes the
real long path via `cd /d` so Turbopack's watcher never sees the short-path form. If you ever
see `Assertion failed: !_wcsnicmp(filename, dir, dirlen)`, this is why — always launch via this
script (or an equivalent that cd's to the real path) rather than passing a short path to `next
dev` directly.

**Known cosmetic issue to fix before real rollout:** unauthorized access (e.g. a non-super-user
hitting `/users`) currently throws a raw `AuthError` that Next.js renders as its dev error
overlay / a generic 500 in production. Works correctly as a security boundary, but should
redirect to a friendly "access denied" or back to `/dashboard` instead.

## Current state (as of 2026-09-11)

**Done — the auth/security library layer** (`src/lib/`):
- `password.ts` — Argon2id hashing (`@node-rs/argon2`). `passwordPolicy.ts` holds
  `MIN_PASSWORD_LENGTH`/`validatePasswordStrength` **separately**, deliberately with no argon2
  import, so client components can import the policy without pulling a native module into the
  browser bundle (this actually broke the build once — see "Fixed this session" below).
- `rateLimit.ts` — login lockout after 5 failed attempts in 15 min, keyed on **both** the
  submitted email and the source IP.
- `twoFactor.ts` + `email.ts` — 6-digit, single-use, 10-minute email codes sent via Resend, max
  5 verify attempts per code, hashed at rest. `email.ts` falls back to `console.log`-ing the
  code when `RESEND_API_KEY`/`EMAIL_FROM` aren't set **and `NODE_ENV !== "production"`** — dev
  convenience only; in production it throws instead of silently not sending.
- `pendingLogin.ts` — proves "password just verified" without granting a session;
  `createSession()` only ever runs after 2FA succeeds.
- `session.ts` — DB-backed sessions, cookie holds only an opaque token (hash stored, not the
  raw value). `requireUser()` / `requireRole()` / `requireSuperUser()` are the real
  enforcement points.
- `audit.ts` — `logAudit()`, never throws.
- `prisma/schema.prisma` — `User` (incl. `mustResetPassword`), `Session`, `PendingLogin`,
  `LoginAttempt`, `TwoFactorCode`, `AuditLog`, `Client`, `Lead`, `Job`.

**Done — real pages, wired to the above, `npm run build` passes clean:**
- `/setup?token=...` — one-time bootstrap admin (mirrors the JT app's fixed pattern: unreachable
  without `SETUP_TOKEN` matching, and only works once — checks `prisma.user.count()`). On
  success, routes through 2FA like anyone else (not straight to a session).
- `/login` → `/login/verify` (2FA, with resend) → either `/dashboard` (normal) or
  `/reset-password` (if `mustResetPassword`, forced there **after** 2FA succeeds, not before —
  so a stolen temp password alone still can't take over the account) → `/dashboard`.
- `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`, ran the codemod's manual
  equivalent) — cheap Edge "cookie present?" redirect only, not the real check.
- `(app)/layout.tsx` — the actual per-request auth gate (`getSessionUser()`, hits the DB),
  sidebar shell ported from the prototype's look (colors/cards/tables in `globals.css`), a link
  out to the still-published prototype artifact for tools not yet migrated.
- `(app)/dashboard`, `(app)/jobs` (list + add + archive), `(app)/leads` (list + add + mark
  converted), `(app)/users` (Master-User-only: create staff with a temp password shown once +
  `mustResetPassword: true`, deactivate/reactivate) — all real Prisma queries, all gated by
  `requireUser()`/`requireSuperUser()` server-side.
- Logout server action, clears the DB session row + cookie.

**Not started:**
- Everything beyond Jobs/Leads/Users (Site Measure, Quote Comparison, Prepare Price, Quote
  Wording, Check Measure tools, Files, Cashflow, Reports…) — stays on the old HTML prototype for
  now, linked from the sidebar as "Other tools (prototype)".
- **Not deployed anywhere yet.** No GitHub remote, no `render.yaml`, no Render Web Service (the
  Postgres database itself now exists and is verified working — see below).

**Verified working end-to-end against the real Render Postgres database** — see the section
above. This was the last open question and it's answered: the whole auth flow, Jobs, and Leads
all work against a live database, not just in theory.

## What's needed from Jo before this can go further

1. ~~A Postgres database~~ — **done**, `ali-frame-db` on Render, verified working.
2. **A Resend account** (resend.com) + API key + a verified "from" address — needed for real
   2FA emails. Not blocking for local testing (the dev console-log fallback covers that), but
   blocking for anything real.
3. **A new GitHub repo** for this project, to push to before setting up Render deployment.

## Fixed this session (2026-09-10 → 2026-09-11)

- **Prisma was completely broken** (`@prisma/client ^7.10.0` against a pre-release
  `prisma ^8.0.0-rc.12` CLI with no `generate`/`migrate`/`validate` commands). Pinned both to
  `6.19.3` (same version the JT Job Management System uses) + added `postinstall: prisma
  generate` so a fresh `npm install` can't silently regress this.
- **OneDrive sync dropped 4 stray empty `node_modules/@types/*` folders** (`aws-lambda`, `chai`,
  `deep-eql`, `ws` — none are real dependencies of this project) which broke `tsc`/`next build`
  a week after the fact with no code change involved. Deleted them; if this happens again,
  it's almost certainly the same OneDrive artifact, not a real regression — check for stray
  empty `@types/*` folders before assuming the code broke.
- **Client/server module boundary bug**: `SetupForm.tsx`/`ResetPasswordForm.tsx` (both `"use
  client"`) imported `MIN_PASSWORD_LENGTH` from `password.ts`, which also has `import
  "server-only"` and pulls in `@node-rs/argon2` — this dragged the native argon2 module into the
  client bundle and broke `next build` with "Export verify doesn't exist" (it was trying to
  resolve the browser build of the argon2 package). Fixed by splitting the length
  constant/validator into `passwordPolicy.ts` with zero server-only dependencies; `password.ts`
  now re-exports it for server-side callers. **If a new client component needs anything from a
  server-only lib file in future, split it the same way rather than importing across the
  boundary.**
- **Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`** (same API, renamed
  export/file) — migrated by hand (`git mv` wasn't available since the file wasn't committed
  yet; renamed + changed `export function middleware` → `export function proxy`). Build now has
  no deprecation warnings.
- One `npm audit` finding remains open: high-severity advisory in `deepmerge-ts`, a transitive
  dependency of the `prisma` CLI's own tooling only (not the runtime `@prisma/client` that
  ships in the app) — `npm audit fix --force` would downgrade `prisma` to `6.12.0`, an actual
  regression, so left as-is. Revisit when a non-breaking patched CLI release exists.

## Next steps, in order

1. Get the Postgres connection string + Resend key from Jo (see above).
2. `.env` locally, `npx prisma db push` to create the tables.
3. Manually walk the full flow once against the real database: `/setup?token=...` → 2FA (check
   the console log if Resend isn't wired up yet) → `/dashboard`; create a staff user from
   `/users`, sign out, sign in as them with the shown temp password, confirm they're forced to
   `/reset-password` before anything else, then land on `/dashboard` normally next time.
4. New GitHub repo, new Render Web Service + the Postgres from step 1 (same region, **internal**
   connection string once both are on Render), env vars set in the Render dashboard only.

## Verification checklist before calling any of this "live"

- [ ] Bootstrap admin via `/setup?token=...` works, and is provably unreachable without the
      correct token, and unreachable a second time once one admin exists.
- [ ] Wrong password 5× locks out with a generic message (never "no account with that email").
- [ ] Correct password → 2FA email arrives (or console-logs in dev) → wrong code a few times is
      rejected → correct code → session cookie set. Confirm cookie is `HttpOnly` + `Secure`
      (prod) + `SameSite=Lax` in devtools.
- [ ] A brand-new staff user (created via `/users`) is forced through `/reset-password` before
      reaching anything else, on their very first login only — and 2FA still happens on that
      first login too, before the reset step, not instead of it.
- [ ] A role-gated action (e.g. `/users`) is rejected **server-side** even when hit directly by
      a non-super-user, not just hidden in the sidebar.
- [ ] `.env` was never committed; the app only reads secrets from `process.env`.
- [ ] `AuditLog` rows appear for login success/failure, 2FA success/failure, Job/Lead CRUD, user
      create/deactivate.
- [ ] Postgres is confirmed persistent (not SQLite-on-ephemeral-disk), lockout confirmed
      working, 2FA confirmed working, backups enabled on the Render Postgres plan tier.
