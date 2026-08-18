import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import { getEmailCapability } from "@/lib/email/smtp";
import { evaluateHealth } from "@/lib/health/status";

export async function GET(): Promise<Response> {
  const config = readRuntimeConfig();
  const health = await evaluateHealth({
    database: async () => {
      await db.execute(sql`select 1`);
      return true;
    },
    email: async () => getEmailCapability() === "ok",
    avatarStorage: async () => {
      await access(config.avatarStoragePath, constants.R_OK | constants.W_OK);
      return true;
    },
  });
  return Response.json(health, {
    status: health.status === "unhealthy" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}