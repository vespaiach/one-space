"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthorizationError, requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { validateProjectFields } from "@/lib/projects/validation";

type CreateProjectResult = { error: "forbidden" } | { fieldErrors: Partial<Record<string, string>> } | null;

export async function createProject(
  _prevState: CreateProjectResult,
  formData: FormData,
): Promise<CreateProjectResult> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === "forbidden") {
      return { error: "forbidden" };
    }
    throw error;
  }

  const name = String(formData.get("name") ?? "").trim();
  const key = String(formData.get("key") ?? "")
    .trim()
    .toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim() || undefined;

  const fieldErrors = validateProjectFields({ name, key, description, color, startDate, endDate });

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.key, key));
  if (existing.length > 0) {
    return { fieldErrors: { key: "This key is already in use. Choose a different one." } };
  }

  await db.insert(projects).values({
    key,
    name,
    description,
    color,
    startDate,
    endDate: endDate ?? null,
    createdBy: admin.userId,
  });

  revalidatePath("/projects");
  redirect("/projects");
}