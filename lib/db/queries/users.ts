import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { auditEvents, users } from "@/lib/db/schema";
import { normalizeName, normalizePhoneNumber, normalizeSlackHandle } from "@/lib/validation/profile";

export type UserView = Pick<
  typeof users.$inferSelect,
  "id" | "firstName" | "lastName" | "role" | "status" | "phoneNumber" | "slackHandle" | "avatarKey"
>;

const userView = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  status: users.status,
  phoneNumber: users.phoneNumber,
  slackHandle: users.slackHandle,
  avatarKey: users.avatarKey,
};

export async function listUsers(database: Database): Promise<UserView[]> {
  return database
    .select(userView)
    .from(users)
    .orderBy(asc(users.lastName), asc(users.firstName), asc(users.id));
}

export async function findUserById(database: Database, id: string): Promise<UserView | null> {
  const [user] = await database.select(userView).from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

type UpdateTextProfileInput = {
  actor: { userId: string; role: "admin" | "member" };
  targetUserId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  slackHandle: string;
  now?: Date;
};

export async function updateTextProfile(database: Database, input: UpdateTextProfileInput) {
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const slackHandle = normalizeSlackHandle(input.slackHandle);
  if (!firstName.ok) return { status: "invalid" as const, field: "firstName" as const };
  if (!lastName.ok) return { status: "invalid" as const, field: "lastName" as const };
  if (!phoneNumber.ok) return { status: "invalid" as const, field: "phoneNumber" as const };
  if (!slackHandle.ok) return { status: "invalid" as const, field: "slackHandle" as const };

  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`account:${input.targetUserId}`}, 0))`,
    );
    const [target] = await transaction
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, input.targetUserId))
      .for("update")
      .limit(1);
    const selfMember = target?.id === input.actor.userId && target.role === "member";
    const adminEditingMember = input.actor.role === "admin" && target?.role === "member";
    if (!target || target.status !== "active" || (!selfMember && !adminEditingMember)) {
      return { status: "forbidden" as const };
    }
    const now = input.now ?? new Date();
    await transaction
      .update(users)
      .set({
        firstName: firstName.value,
        lastName: lastName.value,
        phoneNumber: phoneNumber.value,
        slackHandle: slackHandle.value,
        updatedAt: now,
      })
      .where(and(eq(users.id, target.id), eq(users.role, "member"), eq(users.status, "active")));
    await transaction.insert(auditEvents).values({
      category: "administration",
      action: "profile.update",
      outcome: "succeeded",
      actorId: input.actor.userId,
      targetId: target.id,
      occurredAt: now,
    });
    return { status: "updated" as const };
  });
}