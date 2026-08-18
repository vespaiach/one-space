import type { Database } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

export type AuditEventInput = {
  category: "security" | "administration" | "operations";
  action: string;
  outcome: "succeeded" | "rejected" | "conflict" | "degraded" | "failed";
  actorId?: string;
  targetId?: string;
  reasonCode?: string;
  occurredAt?: Date;
};

export function projectAuditEvent(event: typeof auditEvents.$inferSelect) {
  return {
    id: event.id,
    category: event.category,
    action: event.action,
    outcome: event.outcome,
    actorId: event.actorId,
    targetId: event.targetId,
    reasonCode: event.reasonCode,
    occurredAt: event.occurredAt.toISOString(),
  };
}

export async function recordAuditEvent(database: Database, input: AuditEventInput) {
  const [event] = await database
    .insert(auditEvents)
    .values({
      category: input.category,
      action: input.action,
      outcome: input.outcome,
      actorId: input.actorId,
      targetId: input.targetId,
      reasonCode: input.reasonCode,
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning();
  if (!event) throw new Error("Audit event was not persisted");
  return projectAuditEvent(event);
}