"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface LeaveFormState {
  error?: string;
}

const LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Public Holiday", "Bereavement Leave"];

export async function createStaffLeave(_prevState: LeaveFormState, formData: FormData): Promise<LeaveFormState> {
  const user = await requireUser();

  const type = String(formData.get("type") ?? "").trim();
  const fromDateRaw = String(formData.get("fromDate") ?? "").trim();
  const toDateRaw = String(formData.get("toDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const staffIds = formData.getAll("staffIds").map((v) => String(v)).filter(Boolean);

  if (!LEAVE_TYPES.includes(type)) return { error: "Pick a valid leave type." };
  if (!fromDateRaw) return { error: "A from date is required." };
  if (staffIds.length === 0) return { error: "Pick at least one person." };
  if (toDateRaw && toDateRaw < fromDateRaw) return { error: "To date can't be before the from date." };

  const leave = await prisma.staffLeave.create({
    data: {
      type,
      fromDate: new Date(fromDateRaw),
      toDate: toDateRaw ? new Date(toDateRaw) : null,
      notes: notes || null,
      createdById: user.id,
      staff: { connect: staffIds.map((id) => ({ id })) },
    },
    include: { staff: true },
  });

  await logAudit({
    userId: user.id,
    action: "staff_leave_created",
    entityType: "StaffLeave",
    entityId: leave.id,
    metadata: { type, fromDate: fromDateRaw, staff: leave.staff.map((s) => s.name) },
  });
  revalidatePath("/calendar");
  return {};
}
