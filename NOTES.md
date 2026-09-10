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

## Current state (as of this note)

**Done — the auth/security library layer** (`src/lib/`), all committed:
- `password.ts` — Argon2id hashing (`@node-rs/argon2`), 12-char minimum.
- `rateLimit.ts` — login lockout after 5 failed attempts in 15 min, keyed on **both** the
  submitted email and the source IP (so neither a distributed attack on one account nor a
  spray across many accounts from one IP gets through).
- `twoFactor.ts` + `email.ts` — 6-digit, single-use, 10-minute email codes sent via Resend,
  max 5 verify attempts per code, hashed at rest.
- `pendingLogin.ts` — a short-lived cookie/DB marker proving "password just verified" without
  granting a real session; `createSession()` is only ever called after 2FA succeeds. This is
  what makes "password → 2FA → session" actually enforced server-side, not just a UI step.
- `session.ts` — DB-backed sessions (`Session` table), cookie holds only an opaque random
  token, only its SHA-256 hash is stored server-side. `requireUser()` / `requireRole()` /
  `requireSuperUser()` are the real enforcement points — call these at the top of every
  Server Action / route handler that touches anything sensitive.
- `audit.ts` — `logAudit()`, writes to `AuditLog`. Never throws (a logging failure must not
  block the underlying action).
- `prisma/schema.prisma` — `User` (with `mustResetPassword`, see below), `Session`,
  `PendingLogin`, `LoginAttempt`, `TwoFactorCode`, `AuditLog`, `Client`, `Lead`, `Job`.

**Not started — everything else:**
- **No pages or routes exist at all.** `src/app/` is still the untouched `create-next-app`
  template. No `/setup`, `/login`, `/login/verify`, `/dashboard`, `/jobs`, `/leads`, `/users`,
  `/settings`. No `actions.ts` or `route.ts` files anywhere. The lib layer above is complete
  and coherent but currently unused by anything.
- No `src/middleware.ts` yet (planned: a cheap "cookie present → else redirect to /login" Edge
  check only; the *real* auth/role check happens per-request via `requireUser()`/`requireRole()`
  in Node runtime, since Edge middleware can't safely do a Prisma DB lookup).
- No UI/visual design ported over yet — the plan is to reuse the existing prototype's CSS
  custom properties (`--blue`, `--blueDark`, `--nav`, etc.) and layout so the look Jo already
  approved carries over unchanged.
- Not deployed anywhere: no GitHub remote configured, no `render.yaml`, no Render service or
  Postgres instance created, no `.env` even exists locally yet.

## Fixed this session (2026-09-10)

The project **could not build at all** before this: `package.json` had `@prisma/client
^7.10.0` against `prisma ^8.0.0-rc.12` — a mismatched major-version pair, and the installed
`prisma` CLI was a pre-release "Developer Platform" build with a completely different command
set (no `generate`/`migrate`/`validate`). Fixed by pinning both to `6.19.3` (same version the
JT Job Management System already uses successfully) and adding a `postinstall: prisma generate`
script so this can't silently regress after a fresh `npm install`. `npx tsc --noEmit` now
passes cleanly (exit 0).

Also added `User.mustResetPassword` (default `true`) per Jo's explicit requirement: **every**
account (not just the first admin) needs a forced first-time password set before anything
else. The intended flow, not yet built:
1. An admin (or the bootstrap `/setup` flow for the very first account) creates a `User` row
   with a temporary password and `mustResetPassword: true`.
2. On that user's first successful password check, they're forced to a "set your new
   password" step before proceeding — `mustResetPassword` gets flipped to `false` once they do.
3. From there it's the same flow as everyone else: password → email 2FA code → session.

One `npm audit` finding remains open: a high-severity advisory in `deepmerge-ts`, a transitive
dependency of the `prisma` CLI's own `@prisma/config` tooling (stack exhaustion on deeply
recursive merges). This affects the **CLI tooling only**, not the generated `@prisma/client`
runtime that ships in the deployed app, so it isn't a production attack surface — but
`npm audit fix --force` would downgrade `prisma` to `6.12.0`, an actual regression, so it was
left as-is rather than "fixed" blindly. Worth revisiting when a non-breaking patched release
of the CLI exists.

## Next steps, in order

1. **Local `.env`** — copy `.env.example` to `.env`. For local dev, `DATABASE_URL` can point
   at a local Postgres (or a free dev instance); `SETUP_TOKEN` can be any long random string;
   `RESEND_API_KEY`/`EMAIL_FROM` need a real Resend account (resend.com) — Jo doesn't have one
   yet, this is a manual sign-up step for her.
2. **`npx prisma db push`** (or a proper migration once schema stabilizes) to create the
   tables in that database.
3. Build `src/middleware.ts` + the actual pages: `/setup` (SETUP_TOKEN-gated bootstrap,
   mirrors the JT app's fixed first-run pattern — **never** let this be reachable without the
   token matching, that exact gap was a real account-takeover bug in the JT app), `/login` →
   `/login/verify` (2FA) → `/dashboard`, then `/jobs` and `/leads` as the first real
   database-backed features, per the agreed phasing (everything else — Site Measure, Quote
   Comparison, Prepare Price, Quote Wording, Check Measure tools — stays on the old prototype
   for now, reachable as "coming soon" placeholders in the same real app shell).
4. Only once the above works end-to-end locally: new GitHub repo, new Render Web Service +
   new Render Postgres (same region, **internal** connection string, Starter tier or above so
   backups actually exist), env vars set in the Render dashboard only.

## Verification checklist before calling any of this "live"

- [ ] Bootstrap admin via `/setup?token=...` works, and is provably unreachable without the
      correct token.
- [ ] Wrong password 5× locks out with a generic message (never "no account with that email").
- [ ] Correct password → 2FA email arrives → wrong code a few times is rejected → correct code
      → session cookie set. Confirm cookie is `HttpOnly` + `Secure` (prod) + `SameSite=Lax` in
      devtools.
- [ ] A brand-new user with `mustResetPassword: true` is forced through the password-reset
      step before reaching anything else, on their very first login only.
- [ ] A role-gated action is rejected **server-side** even when called directly (not just
      hidden in the UI) — test as a non-privileged user.
- [ ] `.env` was never committed; the app only reads secrets from `process.env`.
- [ ] `AuditLog` rows appear for login success/failure, 2FA success/failure, Job/Lead CRUD.
- [ ] Postgres is confirmed persistent (not SQLite-on-ephemeral-disk), lockout confirmed
      working, 2FA confirmed working, backups enabled on the Render Postgres plan tier.
