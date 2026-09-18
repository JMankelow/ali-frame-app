# Ali-Frame Job Management System — build notes / handoff

Read this before touching the project. It replaces re-discovering state via git log.

## 2026-09-18 sprint, continued — nav redesign, backup, security audit

While Jo was away, shipped: (1) the two-tier top nav from her Endeavour Group reference screenshot
— a blue utility bar (logo, Sync Xero/Simpro/EROAD + Email Triage placeholder buttons, tasks bell,
user badge, sign out) with a black section-tab row below it (`TopTabs.tsx`); the sidebar now only
shows the selected section's items instead of the whole tree. (2) Whole nav **groups** (e.g. Check
Measures) are now pinnable too, not just individual pages — pins to the group's first sub-page.
(3) A real **Backup Data** feature (`/backup`, Master User only): "Run Backup Now" plus a daily
`/api/cron/backup` route generate a JSON snapshot of all business data (jobs, clients, leads,
notes, timesheets, vehicles, assets, installer assessments, etc) into R2, keeping the most recent
60. Deliberately excludes password hashes/sessions/2FA codes so a downloaded backup file can never
be used to sign in as anyone — this is a convenience export, not a replacement for Render's own
Postgres backups. (4) A quarterly **installer 360-review reminder** (`/api/cron/installer-reviews`)
— finds any installer whose last self- or HR-assessment is 90+ days old (or who's never had one)
and creates a Notes/Tasks reminder for them plus one for every Admin/Management user, deduped so
it won't repeat daily once a reminder is already open.

**There are now three cron endpoints waiting on the one Render Cron Job setup Jo still needs to
do** — see updated item 1 below (was just vehicle checklists, now also backup and installer
reviews).

**Ran the security audit Jo asked for**, against her checklist. Findings: session/cookie handling,
2FA, login lockout/no-enumeration, secrets management, R2 presigned URLs, and the schema (no
bank/IRD/DOB fields) all PASS. Two real gaps found:
- **Fixed already**: `timesheets/actions.ts` let any signed-in user submit an entry with a spoofed
  `staffUserId` to log hours as a coworker, and "Approve" only checked `isSuperUser` rather than a
  real role. Now restricted (server-side and in the UI) to Admin/Management, Office/Scheduling, or
  the Master User — installers can only log and see their own hours.
- **Needs Jo's call, not fixed yet**: `requireRole()` exists but isn't used anywhere else — actions
  like `archiveJob`/`reactivateJob`, `markLeadConverted`, and `markPurchaseOrderReceived` are
  callable by any signed-in account regardless of role. This may be fine (small team, everyone
  trusted) or may not be — flagging rather than guessing, since narrowing it wrong could lock
  someone out of something they're meant to do. Also confirms the **User Access permission
  matrix** (`src/lib/permissions.ts` — `hasSectionAccess()`) still isn't wired into any page, same
  as last known state; the schema field (`User.permissions`) is ready whenever that UI gets built.

## 2026-09-18 sprint — rapid feature build, open items

Jo pushed hard to get real features live fast. Shipped this session: full nav/login redesign
matching the prototype, Notes (backlog tracker, seeded with everything outstanding), Quote
Wording, Job detail hub pages (`/jobs/[number]`), searchable JobPicker (replacing plain
`<select>`s), and Timesheets / Purchase Orders / Remedial / Acceptances / Assets / Vehicles /
Vehicle Checklists — all real, DB-backed, pushed straight to production as built.

**Open items, in order Jo should address them:**
1. **Render Cron Jobs — three endpoints now waiting on this, all using the same secret.** Set
   `CRON_SECRET` (any long random value) as an env var on the web service, then add three
   **Render Cron Jobs** (a separate resource type from the web service), each running daily:
   - `curl -f "$APP_URL/api/cron/vehicle-checklists?secret=$CRON_SECRET"` — vehicle checklist
     overdue alerts.
   - `curl -f "$APP_URL/api/cron/backup?secret=$CRON_SECRET"` — daily business-data backup to R2.
   - `curl -f "$APP_URL/api/cron/installer-reviews?secret=$CRON_SECRET"` — quarterly 360-review
     reminders (safe to run daily; it only creates a reminder when one is actually due).
   All three already exist and work when hit manually — nothing is scheduled yet.
2. **Vehicle WOF/Rego/Service due dates are NOT populated.** Jo sent an EROAD `ServiceReport.csv`
   (service history, not future due dates) — some vehicles' last-known WOF was over a year ago
   (e.g. QKJ425, last WOF 21/08/2025). Rather than guess a renewal cycle (NZ WOF rules differ by
   vehicle age) and risk telling her a vehicle is compliant when it isn't, this was left for Jo to
   confirm: either give exact due dates from EROAD, or confirm a rule to calculate them from last-known
   dates. Don't populate `Vehicle.wofDueDate`/`regoDueDate`/`serviceDueDate` without that.
3. **Job Tracking import** — Jo's real spreadsheet (`Ali Frame - Job Tracking - Version 2.xlsx`,
   276 residential jobs with quoted/actual costs for scaffolding/materials/install/labour/margin,
   supplier POs, remedial data) is ready to import, but needs: (a) confirmation on creating a
   `Client` per customer, (b) new costing fields added to `Job` (quoted vs actual per category) —
   not in the schema yet, (c) confirmation on importing "Complete" jobs only vs. everything.
4. **Staff roles** — Tanya=Management, Renae=Operations, Dwayne=Sales & Accounts,
   Tristam=Sales Management confirmed. Kere's role(s) still ambiguous ("HR and Field Manager" /
   "Commercial Manager" — one person with two roles, or two people?) — confirm before creating
   the account. Jo explicitly said **do not send any invites yet** — accounts get created but
   invitations/temp passwords are shared with staff in stages, on her signal.
5. **Xero integration** (Accounts tab: AP/AR, P&L, Budget vs Actual FY2027, Balance Sheet,
   Cashflow) — blocked on Jo creating a Xero Developer app (developer.xero.com) for a Client
   ID/Secret. Nothing built yet.
6. **Site App Pro integration** — blocked on Jo finding actual API/developer credentials in her
   Site App Pro account (the link she gave was just the dashboard URL, not API docs).
7. **EROAD integration** — EROAD does have a third-party API, but access is account-manager-
   gated, not self-serve. Jo needs to ask her EROAD account manager for API access.

See `/notes` in the live app for the full running backlog (seeded with every remaining
prototype feature — Estimates, Calendar, Invoices, Costing & Margin, WIP Report, Cashflow,
Reports, Crew Mobile View, Security/Backup/Templates settings, Quote Register/Comparison/Prepare
Price, QA Documentation, etc.) — check that before re-deriving what's left from scratch.

**A real staff payroll export (`staff-detailed-table-*.xlsx`) was shared during this session** —
it contains IRD tax numbers, bank account numbers, dates of birth and salary rates. None of that
was imported or stored anywhere in this app — only names and roles (given separately, in chat)
are used for account creation. Do not import payroll-file fields beyond name/role/email into
this app without Jo explicitly asking for that specific field.

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

## File storage switched from SharePoint to Cloudflare R2 (2026-09-13)

Spent a long session trying to wire up SharePoint/Microsoft Graph (`Sites.Selected` permission
model) for file storage. Got as far as an Azure AD app registration + admin consent, but the
final step — granting the app access to the specific SharePoint site via Graph Explorer — kept
failing with a 403 (`insufficient privileges, or you need to consent to one of the permissions
on the Modify Permissions tab`), and no code for it was ever written. **Abandoned that approach**
in favor of **Cloudflare R2** (S3-compatible object storage, `@aws-sdk/client-s3` +
`@aws-sdk/s3-request-presigner`) — far less integration surface: no Azure AD, no admin consent,
no per-site permission grants, just an account ID + access key + secret + bucket name as env
vars. The Azure app registration Jo created can be deleted/ignored; nothing depends on it.

**Built and deployed on this pass:**
- `src/lib/storage.ts` — R2 client (S3-compatible, `region: "auto"`,
  `endpoint: https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`). Files never pass through our
  server: `getUploadUrl()`/`getDownloadUrl()` hand back short-lived (5 min) presigned URLs the
  browser PUTs/GETs directly against R2. `getObjectBuffer()` reads bytes server-side only for
  attaching a file to an outgoing email (Site Measure sheets).
- `FileAsset` Prisma model — metadata only (job, file name/type, uploader, size, R2 storage key);
  pushed to the real production database with `prisma db push` (additive, no data touched).
- `/files` — list all files (job/type/uploader/date), upload form (job + type + file picker),
  download (fresh presigned URL per click, logged to `AuditLog`), delete (removes from R2 + DB).
  Upload is a 2-step flow: `requestUpload()` (server checks the job exists, hands back a
  presigned PUT URL) → browser PUTs the bytes straight to R2 → `confirmUpload()` (server records
  the `FileAsset` row). Gated by `requireUser()` only, same as Jobs/Leads for now.
- `/site-measure` — ported the prototype's Site Measure tool **field-for-field**: job select →
  "Open Template" → pen colors (Red/Black/Blue/Green/Yellow) → per-page header fields (date,
  customer, phone, email, site address, notes, hardware, cladding, colour, access equipment,
  rubbish removal) pre-filled from the job/client → 4 openings per page, each with its own
  freehand sketch canvas (Pointer Events, not separate mouse/touch handlers like the prototype —
  simpler and covers touch too) + all the Yes/No and dropdown fields (fall protection, location,
  glazing type, restrictor stays, glass, architraves, facings, scribers, silicone, head flashing,
  sill tray) + an extra notes textarea. "+ Add New Page" adds another page. **Real** difference
  from the prototype (which only faked sending): "Save Sheet & Email to Supplier" uploads every
  opening that actually has a sketch on it to R2 as a `FileAsset` (type "Site Measure"), then
  emails those sketches as real attachments via Resend to the job's actual supplier contact
  (`src/lib/supplierContacts.ts`, ported from the prototype's `SUPPLIER_CONTACTS`). The recipient
  is only ever looked up from that contact list for the job's own supplier — the email action
  never takes an arbitrary address from the caller, so it can't become an open relay.
  **Known simplification** (flagged, not hidden): each page has a fixed 4 openings; the
  prototype's "+ Add Item" (more than 4 per page) wasn't ported — straightforward to add if Jo
  wants it, just add another page instead for now.
- Nav updated: Site Measure and Files links added to the sidebar between Leads and Users.

**Verified in this session** (temporary test user + test job/client, both deleted afterward):
logged in, opened the Site Measure template for a test job, confirmed pre-filled customer/phone/
address, drew freehand strokes in two pen colors and confirmed they render correctly, confirmed
the "draw at least one opening first" validation, and confirmed both `/site-measure` and `/files`
fail **gracefully** (clear error message, not a crash) when R2 isn't configured yet — found and
fixed a real bug in the process (see below). **Not yet verified:** an actual successful upload to
a real R2 bucket, or an actual delivered email with attachments — both need Jo's real R2
credentials first (see below), since there's no way to test those without them.

**Bug found and fixed during this verification:** `files/actions.ts` exported the `FILE_TYPES`
constant alongside its server actions — Next.js rejects this ("a 'use server' file can only
export async functions, found object"), which broke every page that imports anything from that
file (crashed with a full-page error). Fixed by moving `FILE_TYPES` into its own
`files/fileTypes.ts` (no `"use server"`), matching the existing `passwordPolicy.ts`/`password.ts`
split for the same class of problem. **If a new `"use server"` action file ever needs to export a
plain constant, split it into a sibling file the same way rather than exporting it directly.**

### What's needed from Jo to make file storage actually work

1. Go to **dash.cloudflare.com** → **R2 Object Storage** (sign up if not already using R2 — a
   Cloudflare account with just DNS on it doesn't automatically have R2 enabled).
2. Create a bucket, e.g. named `ali-frame-files`.
3. Create an **API token** scoped to R2 (Object Read & Write permission, ideally scoped to just
   that bucket) — this gives an Access Key ID + Secret Access Key.
4. Find the **Account ID** (shown on the R2 overview page / in the dashboard URL — a 32-character
   hex string, not an email or account name).
5. Set these as **Render environment variables** on the `ali-frame-app` web service (Render
   dashboard → Environment, never committed to git): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. (Also add them to the local `.env` for local testing
   — see `.env.example` for the exact names.)

Once those four are set, `/files` and `/site-measure` should work end-to-end for real — nothing
else in the code needs to change.

## Current state (as of 2026-09-13)

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
- Everything beyond Jobs/Leads/Users/Site Measure/Files (Quote Comparison, Prepare Price, Quote
  Wording, Check Measure tools, Cashflow, Reports…) — stays on the old HTML prototype for now,
  linked from the sidebar as "Other tools (prototype)".
- Site Measure and Files are code-complete and deployed but **not yet verified against real R2
  storage** — see "File storage switched from SharePoint to Cloudflare R2" above for exactly what
  Jo needs to set up before they'll actually work.

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
