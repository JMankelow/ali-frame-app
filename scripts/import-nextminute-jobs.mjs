// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Imports / updates jobs from the NextMinute "Jobs" export (Jobs (3).xlsx).
//   node scripts/import-nextminute-jobs.mjs "<path to xlsx>"            -> dry run (nothing written)
//   node scripts/import-nextminute-jobs.mjs "<path to xlsx>" --apply    -> writes
// Rules:
//  * "JOB-12221" -> job number 12221. Rows marked "(Deleted)" are skipped.
//  * Jobs already in the app are UPDATED (status/type from NextMinute unless someone changed that status in the app in the last 30 days;
//    address, lead source, description, sales rep only filled where blank). Their title, supplier, install days, price type, costing etc. are never touched.
//  * Jobs not in the app are CREATED, with their customer (matched by exact name or created).
//  * Closed-out jobs (Completed / No Go / Declined) and anything older than the app's current range go in as inactive (archived) — nothing is deleted.
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { readSheet } from "./lib/readXlsx.mjs";

const file = process.argv[2];
const apply = process.argv.includes("--apply");
if (!file) throw new Error("Pass the path to the xlsx file");

const STATUS_FIX = {
  "commerical quote sent": "Commercial Quote Sent",
  "commerical acceptance": "Commercial Acceptance",
  "maintainence": "Maintenance",
  "followed up done after quote sent": "Followed Up After Quote Sent",
  "tentative sales booking awaiting confirmation": "Tentative Sales Booking Awaiting",
  "to quote off measurements": "To Quote off Measurements",
  "gone to supplier for requote": "Gone to Supplier for Requote",
  "quote sent to supplier": "Quote Sent to Supplier",
  "complete": "Completed",
  "(not assigned)": "New",
  "install date confirmed": "Installation Date Confirmed",
};
const CLOSED = new Set(["Completed", "Declined/No Go", "No Go"]);
const LEADS = new Set(["Phone Call", "Website", "Walk in", "Word of Mouth", "Supplier", "Social Media", "Web Search - Google Ads", "Returning Customer", "Email Enquiry", "Rylock Lead", "Vision Lead", "NZ Windows Lead", "Counties Lead"]);
const BRAND_LEAD = { "rylock lead": "Rylock Lead", "vision lead": "Vision Lead", "nz windows": "NZ Windows Lead", "counties": "Counties Lead" };
// NextMinute staff initials -> app user name (sales rep on new jobs only)
const REPS = { DB: "Dwayne Bond", KT: "Kere Taaka Tekaute", JM: "Jo Mankelow", TK: "Tristam Kingi" };
const OLDEST_ACTIVE = 10228; // lowest job number currently in the app

const clip = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const rows = readSheet(file, { sheet: 1, headerRow: 0 }).rows;

const skipped = { deleted: 0, badNumber: 0, duplicate: 0 };
const seen = new Set();
const recs = [];
for (const r of rows) {
  const n = clip(r.Number).replace(/^JOB-/i, "");
  if (!/^\d+$/.test(n)) { skipped.badNumber++; continue; }
  if (/deleted/i.test(String(r.Status)) || /deleted/i.test(String(r.Type))) { skipped.deleted++; continue; }
  if (seen.has(n)) { skipped.duplicate++; continue; }
  seen.add(n);
  const rawStatus = clip(r.Status);
  const status = STATUS_FIX[rawStatus.toLowerCase()] ?? rawStatus ?? "New";
  const type = /commercial/i.test(String(r.Type)) ? "COMMERCIAL" : "RESIDENTIAL";
  const typeText = clip(r.Type).toLowerCase();
  let lead = LEADS.has(clip(r.Priority)) ? clip(r.Priority) : null;
  for (const [k, v] of Object.entries(BRAND_LEAD)) if (typeText.includes(k)) lead = v;
  const initials = clip(r["Assigned To"]).split(/[,\s]+/)[0]?.toUpperCase();
  const address = String(r.Address ?? "").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !/^new zealand$/i.test(s)).join(", ").slice(0, 300) || null;
  const title = clip(r.Title) || clip(r.Customer) || `Job ${n}`;
  recs.push({
    number: n,
    title: title.slice(0, 200),
    customer: clip(r.Customer) || title,
    address,
    type,
    status: status || "New",
    lead,
    rep: REPS[initials] ?? null,
    description: String(r.Description ?? "").replace(/\r/g, "").trim().slice(0, 6000) || null,
    archived: CLOSED.has(status) || Number(n) < OLDEST_ACTIVE,
  });
}

const p = new PrismaClient();
try {
  const existing = new Map((await p.job.findMany({ select: { number: true, status: true, type: true, address: true, leadSource: true, description: true, assignedUserId: true, archived: true } })).map((j) => [j.number, j]));
  const users = new Map((await p.user.findMany({ select: { id: true, name: true } })).map((u) => [u.name, u.id]));
  const recent = new Set(
    (await p.auditLog.findMany({ where: { entityType: "Job", action: "job_updated", createdAt: { gte: new Date(Date.now() - 30 * 864e5) } }, select: { entityId: true, metadata: true } }))
      .filter((a) => a.metadata && a.metadata.statusTo).map((a) => a.entityId),
  );

  // Never close out (or archive) a job that still has bookings coming up on the calendar.
  const upcoming = new Set((await p.jobScheduledTask.findMany({ where: { scheduledDate: { gte: new Date(new Date().toISOString().slice(0, 10)) }, status: { not: "Cancelled" } }, select: { jobNumber: true } })).map((t) => t.jobNumber));

  const toCreate = recs.filter((r) => !existing.has(r.number));
  const toUpdate = recs.filter((r) => existing.has(r.number));
  const unknownStatus = {};
  const KNOWN = new Set(["New", "In Progress", "Completed", "Quote Sent", "Quote Sent to Supplier", "Quote Accepted", "Measure & Quoted Booked", "Check Measure Required", "Final Check Measure Complete", "Joinery Ordered", "Deposit Invoice Sent", "Installation Date Confirmed", "Commercial Acceptance", "Remedial Work Required", "Chargeable Maintenance", "Maintenance", "Tentative Sales Booking Awaiting", "Gone to Supplier for Requote", "To Quote off Measurements", "Followed Up After Quote Sent", "Commercial Quote Sent", "Follow-up Call Required", "Thinker", "Declined/No Go", "No Go"]);
  for (const r of recs) if (!KNOWN.has(r.status)) unknownStatus[r.status] = (unknownStatus[r.status] || 0) + 1;

  // plan updates
  const updates = [];
  for (const r of toUpdate) {
    const j = existing.get(r.number);
    const data = {};
    if (r.status !== j.status && !recent.has(r.number) && !(CLOSED.has(r.status) && upcoming.has(r.number))) data.status = r.status;
    if (r.type !== j.type) data.type = r.type;
    if (!j.address && r.address) data.address = r.address;
    if (!j.leadSource && r.lead) data.leadSource = r.lead;
    if (!j.description && r.description) data.description = r.description;
    if (!j.assignedUserId && r.rep && users.get(r.rep)) data.assignedUserId = users.get(r.rep);
    const finalStatus = data.status ?? j.status;
    if (!j.archived && CLOSED.has(finalStatus) && !upcoming.has(r.number)) data.archived = true;
    if (Object.keys(data).length) updates.push({ number: r.number, data });
  }

  const customers = new Set(recs.map((r) => r.customer.toLowerCase()));
  console.log(JSON.stringify({
    fileRows: rows.length, skipped, usable: recs.length, alreadyInApp: toUpdate.length, toCreate: toCreate.length,
    createActive: toCreate.filter((r) => !r.archived).length, createInactive: toCreate.filter((r) => r.archived).length,
    updatesPlanned: updates.length, statusChanges: updates.filter((u) => u.data.status).length, keptOpenBecauseBookingsComingUp: toUpdate.filter((r) => CLOSED.has(r.status) && upcoming.has(r.number)).length, keptAppStatusBecauseEditedRecently: toUpdate.filter((r) => recent.has(r.number) && r.status !== existing.get(r.number).status).length,
    distinctCustomers: customers.size, unknownStatus,
  }, null, 1));
  console.log("sample updates:", JSON.stringify(updates.slice(0, 5)));
  if (!apply) { console.log("\nDRY RUN — nothing written. Re-run with --apply."); process.exit(0); }

  // ---- customers: match existing by exact (case-insensitive) name, create the rest ----
  const clientIds = new Map();
  for (const c of await p.client.findMany({ select: { id: true, name: true } })) { const k = c.name.trim().toLowerCase(); if (!clientIds.has(k)) clientIds.set(k, c.id); }
  const newClients = [];
  for (const r of toCreate) {
    const k = r.customer.toLowerCase();
    if (!clientIds.has(k)) { const id = randomUUID(); clientIds.set(k, id); newClients.push({ id, name: r.customer.slice(0, 200), address: r.address }); }
  }
  for (let i = 0; i < newClients.length; i += 500) await p.client.createMany({ data: newClients.slice(i, i + 500) });
  console.log("customers created:", newClients.length);

  // ---- jobs: ordered by number via createdAt so the list reads newest-number-first ----
  const base = Date.UTC(2026, 0, 1);
  const jobData = toCreate.map((r) => ({
    number: r.number, title: r.title, description: r.description, address: r.address, clientId: clientIds.get(r.customer.toLowerCase()),
    type: r.type, status: r.status, leadSource: r.lead, assignedUserId: r.rep ? users.get(r.rep) ?? null : null, archived: r.archived,
    createdAt: new Date(base + Number(r.number) * 60_000),
  }));
  for (let i = 0; i < jobData.length; i += 500) await p.job.createMany({ data: jobData.slice(i, i + 500), skipDuplicates: true });
  console.log("jobs created:", jobData.length);

  let n = 0;
  for (const u of updates) { await p.job.update({ where: { number: u.number }, data: u.data }); n++; }
  console.log("jobs updated:", n);

  const admin = await p.user.findFirst({ where: { email: "jo@aliframe.co.nz" }, select: { id: true } });
  if (admin) await p.auditLog.create({ data: { userId: admin.id, action: "jobs_imported_nextminute", entityType: "Import", entityId: "Jobs (3).xlsx", metadata: { created: jobData.length, updated: n, customersCreated: newClients.length, skipped } } });
} catch (e) {
  console.log("ERR", String(e.message).split("\n").filter(Boolean).slice(-2).join(" "));
} finally {
  await p.$disconnect();
}
