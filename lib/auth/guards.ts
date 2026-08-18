import { getCurrentForcedReset, getCurrentSession } from "@/lib/auth/session";
import type { ForcedResetContext, SessionContext } from "@/lib/db/queries/sessions";

export class AuthorizationError extends Error {
  constructor(public readonly code: "unauthorized" | "forbidden") {
    super(code);
    this.name = "AuthorizationError";
  }
}

export async function requireSession(context?: SessionContext | null): Promise<SessionContext> {
  const current = context === undefined ? await getCurrentSession() : context;
  if (!current) throw new AuthorizationError("unauthorized");
  return current;
}

export async function requireAdmin(
  context?: SessionContext | null,
): Promise<SessionContext & { role: "admin" }> {
  const current = await requireSession(context);
  if (current.role !== "admin") throw new AuthorizationError("forbidden");
  return { ...current, role: "admin" };
}

export async function requireForcedReset(context?: ForcedResetContext | null): Promise<ForcedResetContext> {
  const current = context === undefined ? await getCurrentForcedReset() : context;
  if (!current) throw new AuthorizationError("unauthorized");
  return current;
}