import { and, eq, gt, isNull } from "drizzle-orm";
import { createOpaqueToken, hashToken } from "@/lib/crypto/credentials";
import type { Database } from "@/lib/db";
import { forcedResetAuthorizations, sessions, users } from "@/lib/db/schema";

export type SessionContext = {
  sessionId: string;
  userId: string;
  role: "admin" | "member";
  status: "active";
  expiresAt: Date;
};

export type ForcedResetContext = {
  authorizationId: string;
  userId: string;
  role: "member";
  status: "active";
  expiresAt: Date;
};

export async function createSession(
  database: Database,
  userId: string,
  rememberMe: boolean,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = createOpaqueToken();
  const expiresAt = new Date(now.getTime() + (rememberMe ? 21 * 24 : 2) * 60 * 60 * 1000);
  await database.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt, createdAt: now });
  return { token, expiresAt };
}

export async function findSession(
  database: Database,
  token: string,
  now: Date = new Date(),
): Promise<SessionContext | null> {
  const [row] = await database
    .select({
      sessionId: sessions.id,
      userId: users.id,
      role: users.role,
      status: users.status,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        eq(users.status, "active"),
        eq(users.forcePasswordReset, false),
      ),
    )
    .limit(1);
  return row ? { ...row, status: "active" } : null;
}

export async function revokeSession(
  database: Database,
  token: string,
  now: Date = new Date(),
): Promise<void> {
  await database
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt)));
}

export async function revokeAllSessions(
  database: Database,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  await database
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export async function createForcedResetAuthorization(
  database: Database,
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = createOpaqueToken();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  await database.insert(forcedResetAuthorizations).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    createdAt: now,
  });
  return { token, expiresAt };
}

export async function findForcedResetAuthorization(
  database: Database,
  token: string,
  now: Date = new Date(),
): Promise<ForcedResetContext | null> {
  const [row] = await database
    .select({
      authorizationId: forcedResetAuthorizations.id,
      userId: users.id,
      role: users.role,
      status: users.status,
      expiresAt: forcedResetAuthorizations.expiresAt,
    })
    .from(forcedResetAuthorizations)
    .innerJoin(users, eq(forcedResetAuthorizations.userId, users.id))
    .where(
      and(
        eq(forcedResetAuthorizations.tokenHash, hashToken(token)),
        isNull(forcedResetAuthorizations.consumedAt),
        isNull(forcedResetAuthorizations.revokedAt),
        gt(forcedResetAuthorizations.expiresAt, now),
        eq(users.role, "member"),
        eq(users.status, "active"),
        eq(users.forcePasswordReset, true),
      ),
    )
    .limit(1);
  return row?.role === "member" && row.status === "active"
    ? { ...row, role: "member", status: "active" }
    : null;
}