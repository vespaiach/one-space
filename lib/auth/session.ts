import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  findSession as _findSession,
  type ForcedResetContext,
  findForcedResetAuthorization,
  type SessionContext,
} from "@/lib/db/queries/sessions";

const findSession = cache(async (token: string, now: Date = new Date()): Promise<SessionContext | null> => {
  return _findSession(db, token, now);
});

export async function getCurrentSession(now: Date = new Date()): Promise<SessionContext | null> {
  const token = (await cookies()).get("session")?.value;
  return token ? findSession(token, now) : null;
}

export async function getCurrentForcedReset(now: Date = new Date()): Promise<ForcedResetContext | null> {
  const token = (await cookies()).get("forced_reset")?.value;
  return token ? findForcedResetAuthorization(db, token, now) : null;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function setForcedResetCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set("forced_reset", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/change-password",
    expires: expiresAt,
  });
}

export async function clearAuthenticationCookies(): Promise<void> {
  const cookieStore = await cookies();
  for (const name of ["session", "forced_reset", "invitation_flow", "password_reset_flow"]) {
    cookieStore.delete(name);
  }
}