import { asc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { labels } from "@/lib/db/schema";

export type LabelOption = { id: string; name: string; color: string };

export async function listLabelsForProject(database: Database, projectId: string): Promise<LabelOption[]> {
  return database
    .select({ id: labels.id, name: labels.name, color: labels.color })
    .from(labels)
    .where(eq(labels.projectId, projectId))
    .orderBy(asc(labels.name));
}