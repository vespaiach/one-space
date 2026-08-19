import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { AuthorizationError, requireSession } from "@/lib/auth/guards";
import { avatarResponseHeaders } from "@/lib/avatar/http";
import { resolveAvatarPath } from "@/lib/avatar/storage";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import { auditEvents, users } from "@/lib/db/schema";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unavailable(): Response {
  return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new Response(null, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    }
    throw error;
  }
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return unavailable();
  const [user] = await db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, id)).limit(1);
  if (!user?.avatarKey) return unavailable();
  const config = readRuntimeConfig();
  try {
    const path = resolveAvatarPath(config.avatarStoragePath, user.avatarKey);
    const bytes = await readFile(path);
    const contentType = user.avatarKey.endsWith(".jpg") ? "image/jpeg" : "image/png";
    return new Response(new Uint8Array(bytes), { headers: avatarResponseHeaders(contentType) });
  } catch {
    await db
      .insert(auditEvents)
      .values({
        category: "operations",
        action: "avatar.read",
        outcome: "degraded",
        targetId: id,
        reasonCode: "referenced_file_unavailable",
      })
      .catch(() => undefined);
    return unavailable();
  }
}