"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function acceptQuote(id: string) {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return;

  // Server-side enforced, not just a hidden button: an expired quote can
  // never be accepted, no matter how the request reaches this action.
  if (quote.expiryDate && quote.expiryDate < new Date()) {
    throw new Error(`Quote ${quote.quoteNumber} expired on ${quote.expiryDate.toLocaleDateString("en-NZ")} and can no longer be accepted.`);
  }

  await prisma.quote.update({ where: { id }, data: { status: "Accepted", acceptedAt: new Date() } });
  await logAudit({ userId: user.id, action: "quote_accepted", entityType: "Quote", entityId: id });
  revalidatePath("/quotes");
}
