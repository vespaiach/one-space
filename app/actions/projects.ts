"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthorizationError, requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { projectMemberships, projects, users } from "@/lib/db/schema";
import { validateProjectFields } from "@/lib/projects/validation";

type CreateProjectResult = { error: "forbidden" } | { fieldErrors: Partial<Record<string, string>> } | null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const rawMemberIds = formData.getAll("memberIds[]").map(String);
  const candidateMemberIds = rawMemberIds.filter((id) => UUID_REGEX.test(id) && id !== admin.userId);

  const fieldErrors = validateProjectFields({ name, key, description, color, startDate, endDate });

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.key, key));
  if (existing.length > 0) {
    return { fieldErrors: { key: "This key is already in use. Choose a different one." } };
  }

  const validUsers =
    candidateMemberIds.length > 0
      ? await db.select({ id: users.id }).from(users).where(inArray(users.id, candidateMemberIds))
      : [];
  const validMemberIds = validUsers.map((u) => u.id);

  await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        key,
        name,
        description,
        color,
        startDate,
        endDate: endDate ?? null,
        createdBy: admin.userId,
      })
      .returning({ id: projects.id });

    await tx.insert(projectMemberships).values([
      { projectId: project.id, userId: admin.userId, addedByUserId: admin.userId },
      ...validMemberIds.map((userId) => ({
        projectId: project.id,
        userId,
        addedByUserId: admin.userId,
      })),
    ]);
  });

  revalidatePath("/projects");
  redirect("/projects");
}