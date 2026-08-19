import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { auditEvents, users } from "@/lib/db/schema";
import { normalizeName, normalizePhoneNumber, normalizeSlackHandle } from "@/lib/validation/profile";
import { processAvatar } from "./processor";
import { deleteAvatar, writeAvatarCandidate } from "./storage";

type ProfileAvatarInput = {
  storagePath: string;
  actor: { userId: string; role: "admin" | "member" };
  targetUserId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  slackHandle: string;
  avatarAction: "keep" | "replace" | "remove";
  avatar?: { bytes: Buffer; contentType: string };
  now?: Date;
  fileOperations?: {
    writeCandidate: typeof writeAvatarCandidate;
    deleteFile: typeof deleteAvatar;
  };
};

export async function updateProfileWithAvatar(database: Database, input: ProfileAvatarInput) {
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const slackHandle = normalizeSlackHandle(input.slackHandle);
  if (!firstName.ok) return { status: "invalid" as const, field: "firstName" as const };
  if (!lastName.ok) return { status: "invalid" as const, field: "lastName" as const };
  if (!phoneNumber.ok) return { status: "invalid" as const, field: "phoneNumber" as const };
  if (!slackHandle.ok) return { status: "invalid" as const, field: "slackHandle" as const };
  if (input.avatarAction === "replace" && !input.avatar) return { status: "invalid-avatar" as const };

  const [initialTarget] = await database
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, input.targetUserId))
    .limit(1);
  const initiallyAuthorized =
    initialTarget?.role === "member" &&
    initialTarget.status === "active" &&
    (initialTarget.id === input.actor.userId || input.actor.role === "admin");
  if (!initiallyAuthorized) return { status: "forbidden" as const };

  const processed =
    input.avatarAction === "replace" && input.avatar
      ? await processAvatar(input.avatar.bytes, input.avatar.contentType)
      : null;
  const fileOperations = input.fileOperations ?? {
    writeCandidate: writeAvatarCandidate,
    deleteFile: deleteAvatar,
  };
  const candidateKey = processed
    ? await fileOperations.writeCandidate(input.storagePath, processed.bytes, processed.extension)
    : null;
  let previousKey: string | null = null;
  try {
    const result = await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`account:${input.targetUserId}`}, 0))`,
      );
      const [target] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, input.targetUserId))
        .for("update")
        .limit(1);
      const authorized =
        target?.role === "member" &&
        target.status === "active" &&
        (target.id === input.actor.userId || input.actor.role === "admin");
      if (!target || !authorized) return { status: "forbidden" as const };
      previousKey = target.avatarKey;
      const avatarKey =
        input.avatarAction === "replace"
          ? candidateKey
          : input.avatarAction === "remove"
            ? null
            : target.avatarKey;
      const now = input.now ?? new Date();
      await transaction
        .update(users)
        .set({
          firstName: firstName.value,
          lastName: lastName.value,
          phoneNumber: phoneNumber.value,
          slackHandle: slackHandle.value,
          avatarKey,
          updatedAt: now,
        })
        .where(eq(users.id, target.id));
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
    if (result.status !== "updated" && candidateKey) {
      await fileOperations.deleteFile(input.storagePath, candidateKey);
    }
    if (
      result.status === "updated" &&
      previousKey &&
      previousKey !== candidateKey &&
      input.avatarAction !== "keep"
    ) {
      try {
        await fileOperations.deleteFile(input.storagePath, previousKey);
      } catch {
        await database
          .insert(auditEvents)
          .values({
            category: "operations",
            action: "avatar.cleanup",
            outcome: "failed",
            actorId: input.actor.userId,
            targetId: input.targetUserId,
            reasonCode: "old_file_cleanup_failed",
            occurredAt: input.now ?? new Date(),
          })
          .catch(() => undefined);
      }
    }
    return result;
  } catch (error) {
    if (candidateKey) await fileOperations.deleteFile(input.storagePath, candidateKey).catch(() => undefined);
    throw error;
  }
}