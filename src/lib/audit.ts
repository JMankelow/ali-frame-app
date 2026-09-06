import "server-only";
import { prisma } from "@/lib/prisma";
import { getRequestIp } from "@/lib/session";

interface AuditParams {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an audit trail entry. Never throws — an audit-log failure must
 * not be allowed to block the underlying request/action.
 */
export async function logAudit({ userId, action, entityType, entityId, metadata }: AuditParams) {
  try {
    const ip = await getRequestIp();
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entityType,
        entityId,
        metadata: metadata as never,
        ip,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
