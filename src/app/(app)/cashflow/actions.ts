// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const money = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const dateOf = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00.000Z`) : null;
};

function back(formData: FormData): never {
  const month = String(formData.get("month") ?? "");
  redirect(`/cashflow?tab=ledger${/^\d{4}-\d{2}$/.test(month) ? `&month=${month}` : ""}`);
}

/** Add a line (or save changes to one): type it into the month, the balances and summaries recalculate. */
export async function saveCashflowEntry(formData: FormData) {
  const user = await requireSuperUser();
  const id = String(formData.get("id") ?? "").trim();
  const date = dateOf(formData.get("date"));
  const details = String(formData.get("details") ?? "").trim().slice(0, 300);
  const debit = money(formData.get("debit"));
  const credit = money(formData.get("credit"));
  if (!date || !details || (debit === 0 && credit === 0)) back(formData); // needs a date, a description and an amount

  const data = {
    date: date!,
    details,
    debit,
    credit,
    category: String(formData.get("category") ?? "").trim().slice(0, 60) || null,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 500) || null,
  };
  if (id) await prisma.cashflowEntry.update({ where: { id }, data });
  else await prisma.cashflowEntry.create({ data });

  await logAudit({ userId: user.id, action: id ? "cashflow_entry_updated" : "cashflow_entry_added", entityType: "CashflowEntry", entityId: id || undefined, metadata: { details, debit, credit } });
  revalidatePath("/cashflow");
  back(formData);
}

export async function deleteCashflowEntry(formData: FormData) {
  const user = await requireSuperUser();
  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    await prisma.cashflowEntry.delete({ where: { id } }).catch(() => undefined);
    await logAudit({ userId: user.id, action: "cashflow_entry_deleted", entityType: "CashflowEntry", entityId: id });
    revalidatePath("/cashflow");
  }
  back(formData);
}

export async function toggleCashflowDone(formData: FormData) {
  await requireSuperUser();
  const id = String(formData.get("id") ?? "").trim();
  const e = id ? await prisma.cashflowEntry.findUnique({ where: { id } }) : null;
  if (e) {
    await prisma.cashflowEntry.update({ where: { id }, data: { done: !e.done } });
    revalidatePath("/cashflow");
  }
  back(formData);
}

const SETTING_KEYS = ["openingBalance", "openingDate", "forecastStart", "limitTemporary", "limitTemporaryUntil", "limitNormal", "warningBuffer"] as const;

/** Roll forward: update the actual bank balance/date and the limits. */
export async function saveCashflowSettings(formData: FormData) {
  const user = await requireSuperUser();
  for (const key of SETTING_KEYS) {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) continue;
    const isDate = key === "openingDate" || key === "forecastStart" || key === "limitTemporaryUntil";
    if (isDate ? !/^\d{4}-\d{2}-\d{2}$/.test(raw) : Number.isNaN(Number(raw.replace(/[$,\s]/g, "")))) continue;
    const value = isDate ? raw : String(Number(raw.replace(/[$,\s]/g, "")));
    await prisma.cashflowSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await logAudit({ userId: user.id, action: "cashflow_settings_updated", entityType: "Cashflow" });
  revalidatePath("/cashflow");
  redirect("/cashflow?tab=settings");
}
