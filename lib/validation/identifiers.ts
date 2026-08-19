const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type AddProjectMemberIdentifiers = {
  projectId: string;
  userId: string;
};

export type AddProjectMemberInputResult =
  | { success: true; data: AddProjectMemberIdentifiers }
  | {
      success: false;
      fieldErrors: { projectId?: string[]; userId?: string[] };
    };

export function parseCanonicalUuid(value: unknown): string | null {
  return typeof value === "string" && canonicalUuid.test(value) ? value : null;
}

export function validateAddProjectMemberInput(formData: FormData): AddProjectMemberInputResult {
  const projectId = parseCanonicalUuid(formData.get("projectId"));
  const userId = parseCanonicalUuid(formData.get("userId"));
  const fieldErrors: { projectId?: string[]; userId?: string[] } = {};

  if (!projectId) fieldErrors.projectId = ["Choose a valid Project."];
  if (!userId) fieldErrors.userId = ["Choose a valid user."];

  if (!projectId || !userId) return { success: false, fieldErrors };
  return { success: true, data: { projectId, userId } };
}