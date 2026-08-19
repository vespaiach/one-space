"use server";

import { revalidatePath } from "next/cache";
import { recordProjectMembershipAddFailure } from "@/lib/audit/events";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  type AddProjectMemberErrorCode,
  addProjectMember as commitProjectMembership,
} from "@/lib/projects/add-project-member";
import { validateAddProjectMemberInput } from "@/lib/validation/identifiers";

export type AddProjectMemberState =
  | { status: "idle" }
  | { status: "success"; membershipId: string; message: string }
  | {
      status: "error";
      code: "invalid_input" | "unauthenticated" | "forbidden" | AddProjectMemberErrorCode;
      message: string;
      fieldErrors?: { projectId?: string[]; userId?: string[] };
    };

const errorMessages: Record<AddProjectMemberErrorCode, string> = {
  conflict: "Account access changed. Refresh the page and try again.",
  project_not_found: "The Project could not be found.",
  user_not_found: "The selected user could not be found.",
  user_ineligible: "The selected user is not eligible for Project membership.",
  already_member: "The selected user is already a Project member.",
  unexpected: "The member could not be added. Try again.",
};

export async function addProjectMember(
  _previousState: AddProjectMemberState,
  formData: FormData,
): Promise<AddProjectMemberState> {
  const session = await getCurrentSession();
  if (!session) {
    return { status: "error", code: "unauthenticated", message: "Sign in and try again." };
  }
  if (session.role !== "admin") {
    return { status: "error", code: "forbidden", message: "Admin access is required." };
  }

  const validation = validateAddProjectMemberInput(formData);
  if (!validation.success) {
    return {
      status: "error",
      code: "invalid_input",
      message: "Choose a valid Project and user.",
      fieldErrors: validation.fieldErrors,
    };
  }

  const result = await commitProjectMembership(db, {
    actorUserId: session.userId,
    projectId: validation.data.projectId,
    userId: validation.data.userId,
  });
  if (result.status === "error") {
    if (result.code === "unexpected") {
      await recordProjectMembershipAddFailure(db, {
        actorId: session.userId,
        targetId: validation.data.userId,
      });
    }
    return { status: "error", code: result.code, message: errorMessages[result.code] };
  }

  revalidatePath(`/projects/${result.projectKey}/settings/members`);
  revalidatePath(`/projects/${result.projectKey}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return {
    status: "success",
    membershipId: result.membershipId,
    message: `${result.userName} was added to ${result.projectName}.`,
  };
}