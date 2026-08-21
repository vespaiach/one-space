export const ISSUE_STATUSES = ["backlog", "todo", "in_progress", "done", "canceled"] as const;
export const ISSUE_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

type FieldErrors = Partial<Record<"title" | "description" | "status" | "priority" | "labels", string>>;

export function validateIssueFields(input: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    errors.title = "Title is required";
  } else if (trimmedTitle.length > 255) {
    errors.title = "Title must be 255 characters or fewer";
  }

  if (input.description && input.description.length > 10000) {
    errors.description = "Description must be 10 000 characters or fewer";
  }

  if (input.status !== undefined && !(ISSUE_STATUSES as readonly string[]).includes(input.status)) {
    errors.status = "Select a valid status";
  }

  if (input.priority !== undefined && !(ISSUE_PRIORITIES as readonly string[]).includes(input.priority)) {
    errors.priority = "Select a valid priority";
  }

  return errors;
}

export function validateLabelName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Label name is required";
  if (trimmed.length > 50) return "Label name must be 50 characters or fewer";
  return undefined;
}