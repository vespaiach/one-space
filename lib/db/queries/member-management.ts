import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { auditEvents, forcedResetAuthorizations, sessions, users } from "@/lib/db/schema";

type MemberTransition = "suspend" | "reinstate" | "force-reset" | "promote";

async function transitionMember(
  database: Database,
  actorId: string,
  targetUserId: string,
  transition: MemberTransition,
  now: Date = new Date(),
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`account:${targetUserId}`}, 0))`,
    );
    const [target] = await transaction
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, targetUserId))
      .for("update")
      .limit(1);
    const eligible =
      target?.role === "member" &&
      ((transition === "suspend" && target.status === "active") ||
        (transition === "reinstate" && target.status === "suspended") ||
        transition === "force-reset" ||
        (transition === "promote" && target.status === "active"));
    if (!eligible || !target) return { status: "conflict" as const };

    if (transition === "suspend") {
      await transaction
        .update(users)
        .set({ status: "suspended", updatedAt: now })
        .where(eq(users.id, target.id));
      await transaction
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, target.id), isNull(sessions.revokedAt)));
      await transaction
        .update(forcedResetAuthorizations)
        .set({ revokedAt: now })
        .where(
          and(eq(forcedResetAuthorizations.userId, target.id), isNull(forcedResetAuthorizations.revokedAt)),
        );
    } else if (transition === "reinstate") {
      await transaction
        .update(users)
        .set({ status: "active", updatedAt: now })
        .where(eq(users.id, target.id));
    } else if (transition === "force-reset") {
      await transaction
        .update(users)
        .set({ forcePasswordReset: true, updatedAt: now })
        .where(eq(users.id, target.id));
      await transaction
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, target.id), isNull(sessions.revokedAt)));
      await transaction
        .update(forcedResetAuthorizations)
        .set({ revokedAt: now })
        .where(
          and(eq(forcedResetAuthorizations.userId, target.id), isNull(forcedResetAuthorizations.revokedAt)),
        );
    } else {
      await transaction.update(users).set({ role: "admin", updatedAt: now }).where(eq(users.id, target.id));
    }

    await transaction.insert(auditEvents).values({
      category: "administration",
      action: `member.${transition}`,
      outcome: "succeeded",
      actorId,
      targetId: target.id,
      occurredAt: now,
    });
    return { status: "updated" as const };
  });
}

export function suspendMember(database: Database, actorId: string, targetUserId: string, now?: Date) {
  return transitionMember(database, actorId, targetUserId, "suspend", now);
}

export function reinstateMember(database: Database, actorId: string, targetUserId: string, now?: Date) {
  return transitionMember(database, actorId, targetUserId, "reinstate", now);
}

export function forceMemberPasswordReset(
  database: Database,
  actorId: string,
  targetUserId: string,
  now?: Date,
) {
  return transitionMember(database, actorId, targetUserId, "force-reset", now);
}

export function promoteMember(database: Database, actorId: string, targetUserId: string, now?: Date) {
  return transitionMember(database, actorId, targetUserId, "promote", now);
}