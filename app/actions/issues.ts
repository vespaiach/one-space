"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthorizationError, requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getProjectAccessByKey } from "@/lib/db/queries/projects";
import { createIssue as createIssueTransaction } from "@/lib/issues/create-issue";

export type CreateIssueResult =
  | { error: "forbidden" }
  | { error: "not_found" }
  | { fieldErrors: Partial<Record<"title" | "description" | "status" | "priority" | "labels", string>> }
  | null;

export async function createIssue(
  _prevState: CreateIssueResult,
  formData: FormData,
): Promise<CreateIssueResult> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "forbidden" };
    }
    throw error;
  }

  const projectKey = String(formData.get("projectKey") ?? "").trim();
  const project = await getProjectAccessByKey(db, session.userId, projectKey);
  if (!project) {
    return { error: "forbidden" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = formData.get("description") ? String(formData.get("description")) : undefined;
  const status = formData.get("status") ? String(formData.get("status")) : undefined;
  const priority = formData.get("priority") ? String(formData.get("priority")) : undefined;
  const rawAssigneeId = formData.get("assigneeId") ? String(formData.get("assigneeId")) : undefined;
  const assigneeId = rawAssigneeId === "me" ? session.userId : rawAssigneeId;
  const labelIds = formData.getAll("labelIds[]").map(String);
  const newLabelNames = formData.getAll("newLabelNames[]").map(String);

  const result = await createIssueTransaction(db, {
    projectId: project.id,
    userId: session.userId,
    title,
    description,
    status,
    priority,
    assigneeId,
    labelIds,
    newLabelNames,
  });

  if ("error" in result) {
    return { error: result.error };
  }
  if ("fieldErrors" in result) {
    return { fieldErrors: result.fieldErrors };
  }

  revalidatePath(`/projects/${projectKey}`);
  redirect(`/projects/${projectKey}${result.assigneeCleared ? "?assigneeCleared=1" : ""}`);
}