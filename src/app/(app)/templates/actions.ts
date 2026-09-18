"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface TemplateFormState {
  error?: string;
}

export async function createEmailTemplate(_prevState: TemplateFormState, formData: FormData): Promise<TemplateFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!name) return { error: "Give the template a name." };
  if (!subject) return { error: "Add a subject line." };
  if (!body) return { error: "Add the email body." };

  await prisma.emailTemplate.create({ data: { name, subject, body, createdById: user.id } });
  await logAudit({ userId: user.id, action: "email_template_created", entityType: "EmailTemplate", metadata: { name } });
  revalidatePath("/templates");
  return {};
}

export async function updateEmailTemplate(id: string, _prevState: TemplateFormState, formData: FormData): Promise<TemplateFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!name) return { error: "Give the template a name." };
  if (!subject) return { error: "Add a subject line." };
  if (!body) return { error: "Add the email body." };

  await prisma.emailTemplate.update({ where: { id }, data: { name, subject, body } });
  await logAudit({ userId: user.id, action: "email_template_updated", entityType: "EmailTemplate", entityId: id });
  revalidatePath("/templates");
  return {};
}

export async function deleteEmailTemplate(id: string) {
  const user = await requireUser();
  await prisma.emailTemplate.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "email_template_deleted", entityType: "EmailTemplate", entityId: id });
  revalidatePath("/templates");
}
