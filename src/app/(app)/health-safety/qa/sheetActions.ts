// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getDownloadUrl } from "@/lib/storage";
import {
  COM_SECTIONS, RES_CHECKS, RES_FINAL, RES_REMEDIAL, checkKey, emptyComItem, emptyCommercial, emptyResidential, emptyResItem, emptyQa, itemProblems, residentialProblems,
  type CommercialData, type ComItem, type ResidentialData, type ResItem, type Result, type Stamped, type YesNo,
} from "@/lib/qaSheets";

export interface SheetState {
  error?: string;
  saved?: string;
  problems?: string[];
}

const today = () => new Date().toISOString().slice(0, 10);

/** Only senior leaders (super users and management) can tick off commercial QA checks and sign items off. */
export async function canSignQa(user: SessionUser): Promise<boolean> {
  return user.isSuperUser || user.role === "ADMIN_MANAGEMENT";
}
const canEdit = (user: SessionUser, createdById: string) => !isInstallerProfile(user) || user.id === createdById;

/** Pick the type and the job → creates a draft sheet and opens it. Open to installers. */
export async function createQaSheet(formData: FormData) {
  const user = await requireUser();
  const kind = String(formData.get("kind") ?? "") === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL";
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const job = jobNumber ? await prisma.job.findUnique({ where: { number: jobNumber }, select: { number: true } }) : null;
  if (!job) redirect("/health-safety/qa?error=job");

  // "How many items?" (and optional names/window codes) builds the sheet with that many items from the start.
  const count = Math.min(60, Math.max(1, Math.floor(Number(formData.get("itemCount")) || 1)));
  const labels = String(formData.get("itemLabels") ?? "").split(/\r?\n/).map((l) => l.trim().slice(0, 120)).filter(Boolean).slice(0, 60);
  const total = Math.max(count, labels.length);
  const data = kind === "COMMERCIAL" ? emptyCommercial(today()) : emptyResidential(today());
  data.items = Array.from({ length: total }, (_, i) => {
    const label = labels[i] ?? "";
    if (kind === "COMMERCIAL") return { ...emptyComItem(), n: String(i + 1), code: label };
    return { ...emptyResItem(), label };
  }) as never;
  const sheet = await prisma.qaCheckSheet.create({ data: { kind, jobNumber, data: data as never, createdById: user.id } });
  await logAudit({ userId: user.id, action: "qa_sheet_created", entityType: "QaCheckSheet", entityId: sheet.id, metadata: { kind, jobNumber } });
  redirect(`/health-safety/qa/sheet/${sheet.id}`);
}

/** Registers photos already uploaded to the job and hands back their ids + preview URLs, so they can be attached to a check section. */
export async function registerQaSheetPhotos(sheetId: string, storageKeys: string[]): Promise<{ error?: string; photos?: { id: string; url: string }[] }> {
  const user = await requireUser();
  const sheet = await prisma.qaCheckSheet.findUnique({ where: { id: sheetId } });
  if (!sheet || !canEdit(user, sheet.createdById)) return { error: "Sheet not found." };
  const keys = (Array.isArray(storageKeys) ? storageKeys : []).map(String).slice(0, 40);
  const files = await prisma.fileAsset.findMany({ where: { jobNumber: sheet.jobNumber, storageKey: { in: keys }, mimeType: { startsWith: "image/" } } });
  const photos = await Promise.all(files.map(async (f) => ({ id: f.id, url: await getDownloadUrl(f.storageKey, f.fileName).catch(() => "") })));
  return { photos };
}

// ---------- sanitising ----------

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
/** Keeps a label + description only for photos that are really on the sheet. */
function cleanMeta(raw: unknown, ids: string[]) {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, { label?: unknown; description?: unknown }>;
  return Object.fromEntries(ids.map((id) => [id, { label: clip(src[id]?.label, 120), description: clip(src[id]?.description, 1500) }]));
}
const isoOrEmpty = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");

async function validPhotoIds(jobNumber: string, ids: unknown): Promise<string[]> {
  const want = (Array.isArray(ids) ? ids : []).map(String).slice(0, 40);
  if (!want.length) return [];
  const found = await prisma.fileAsset.findMany({ where: { id: { in: want }, jobNumber, mimeType: { startsWith: "image/" } }, select: { id: true } });
  const ok = new Set(found.map((f) => f.id));
  return want.filter((id) => ok.has(id));
}

async function cleanResidential(jobNumber: string, raw: Record<string, unknown>): Promise<ResidentialData> {
  const out: ResidentialData = { date: isoOrEmpty(raw.date) || today(), items: [] };
  const rawItems = (Array.isArray(raw.items) ? raw.items : []).slice(0, 60) as Record<string, unknown>[];
  for (const ri of rawItems) {
    const it: ResItem = { ...emptyResItem(), id: clip(ri.id, 20) || Math.random().toString(36).slice(2, 10), label: clip(ri.label, 120) };
    const rawAns = (ri.answers && typeof ri.answers === "object" ? ri.answers : {}) as Record<string, { a?: string; reason?: string }>;
    for (const key of [...RES_CHECKS.map(([n]) => `q${n}`), `q${RES_FINAL[0]}`, `q${RES_REMEDIAL[0]}`]) {
      const x = rawAns[key];
      it.answers[key] = { a: x?.a === "Yes" || x?.a === "No" ? x.a : "", reason: clip(x?.reason, 500) } as YesNo;
    }
    it.photoFileIds = await validPhotoIds(jobNumber, ri.photoFileIds);
    it.photoMeta = cleanMeta(ri.photoMeta, it.photoFileIds);
    it.teamLeaderId = clip(ri.teamLeaderId, 40);
    it.teamLeaderName = clip(ri.teamLeaderName, 120);
    it.confirmed = ri.confirmed === true;
    out.items.push(it);
  }
  if (out.items.length === 0) out.items.push(emptyResItem());
  return out;
}

async function cleanCommercial(jobNumber: string, raw: Record<string, unknown>, existing: CommercialData | null, user: SessionUser, senior: boolean): Promise<CommercialData> {
  const out: CommercialData = { date: isoOrEmpty(raw.date) || today(), installers: clip(raw.installers, 300), items: [] };
  const now = new Date().toISOString();
  const rawItems = (Array.isArray(raw.items) ? raw.items : []).slice(0, 60) as Record<string, unknown>[];

  for (const ri of rawItems) {
    const id = clip(ri.id, 20) || Math.random().toString(36).slice(2, 10);
    const old: ComItem | undefined = existing?.items.find((x) => x.id === id);
    const item: ComItem = { id, n: clip(ri.n, 20), code: clip(ri.code, 60), loc: clip(ri.loc, 120), qa: emptyQa() };
    const rq = (ri.qa && typeof ri.qa === "object" ? ri.qa : {}) as Record<string, unknown>;
    const rChecks = (rq.checks && typeof rq.checks === "object" ? rq.checks : {}) as Record<string, Partial<Stamped>>;
    const rPhotos = (rq.photos && typeof rq.photos === "object" ? rq.photos : {}) as Record<string, unknown>;
    const rNotes = (rq.notes && typeof rq.notes === "object" ? rq.notes : {}) as Record<string, unknown>;

    const rMeta = rq.photoMeta;
    for (const s of COM_SECTIONS) {
      // photos + notes can be added by anyone on the job
      item.qa.photos[s.id] = await validPhotoIds(jobNumber, rPhotos[s.id]);
      Object.assign(item.qa.photoMeta, cleanMeta(rMeta, item.qa.photos[s.id]));
      item.qa.notes[s.id] = clip(rNotes[s.id], 2000);
      // checks: only a senior leader can change them, and the server stamps who/when
      s.checks.forEach((_, i) => {
        const k = checkKey(s.id, i);
        const prev: Stamped = old?.qa.checks[k] ?? { r: "", note: "", by: "", at: "" };
        const next = rChecks[k];
        const r: Result = next?.r === "Pass" || next?.r === "Fail" || next?.r === "NA" ? next.r : "";
        const note = clip(next?.note, 1000);
        if (senior && (r !== prev.r || note !== prev.note)) item.qa.checks[k] = { r, note, by: r ? user.name : "", at: r ? now : "" };
        else item.qa.checks[k] = prev;
      });
    }
    const rtl = (rq.tl && typeof rq.tl === "object" ? rq.tl : {}) as Record<string, unknown>;
    const prevTl = old?.qa.tl ?? emptyQa().tl;
    const sig = typeof rtl.sig === "string" && rtl.sig.startsWith("data:image/png;base64,") && rtl.sig.length < 400_000 ? rtl.sig : "";
    const nextTl = { ...prevTl, name: clip(rtl.name, 120), date: isoOrEmpty(rtl.date), comments: clip(rtl.comments, 1000), sig };
    const tlChanged = nextTl.name !== prevTl.name || nextTl.date !== prevTl.date || nextTl.sig !== prevTl.sig || nextTl.comments !== prevTl.comments;
    if (senior && tlChanged) item.qa.tl = { ...nextTl, by: user.name, at: now };
    else item.qa.tl = prevTl;
    out.items.push(item);
  }
  if (out.items.length === 0) out.items.push(...emptyCommercial(out.date).items);
  return out;
}

/** Saves the sheet. "complete" finishes it once everything required is filled in. */
export async function saveQaSheet(sheetId: string, _prev: SheetState, formData: FormData): Promise<SheetState> {
  const user = await requireUser();
  const sheet = await prisma.qaCheckSheet.findUnique({ where: { id: sheetId } });
  if (!sheet || !canEdit(user, sheet.createdById)) return { error: "Sheet not found." };
  if (sheet.status === "Complete") return { error: "This sheet is complete — it can't be changed." };

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Couldn't read the form — please try again." };
  }
  const complete = formData.get("intent") === "complete";

  let data: ResidentialData | CommercialData;
  let problems: string[] = [];
  if (sheet.kind === "RESIDENTIAL") {
    data = await cleanResidential(sheet.jobNumber, raw);
    problems = residentialProblems(data);
  } else {
    const senior = await canSignQa(user);
    data = await cleanCommercial(sheet.jobNumber, raw, sheet.data as unknown as CommercialData, user, senior);
    problems = data.items.flatMap((it, i) => itemProblems(it).map((p) => `Item ${it.n || i + 1}: ${p}`));
    if (complete && !senior) return { error: "Only a senior leader can complete a commercial QA sheet." };
  }

  if (complete && problems.length) return { error: `${problems.length} thing${problems.length === 1 ? " is" : "s are"} still missing before this can be completed.`, problems: problems.slice(0, 12) };

  await prisma.qaCheckSheet.update({ where: { id: sheetId }, data: { data: data as never, status: complete ? "Complete" : "Draft", completedAt: complete ? new Date() : null } });
  await logAudit({ userId: user.id, action: complete ? "qa_sheet_completed" : "qa_sheet_saved", entityType: "QaCheckSheet", entityId: sheetId, metadata: { kind: sheet.kind } });
  revalidatePath(`/health-safety/qa/sheet/${sheetId}`);
  revalidatePath("/health-safety/qa");
  return { saved: complete ? "Sheet completed." : "Saved." };
}
