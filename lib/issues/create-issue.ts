import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database, Transaction } from "@/lib/db";
import { issueLabels, issues, labels, projectMemberships } from "@/lib/db/schema";
import type { IssuePriority, IssueStatus } from "@/lib/issues/validation";
import { validateIssueFields, validateLabelName } from "@/lib/issues/validation";

const LABEL_COLOR_CYCLE = ["design", "bug", "content", "research", "infra", "a11y"] as const;

type CreateIssueInput = {
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  labelIds?: string[];
  newLabelNames?: string[];
};

type CreateIssueOptions = {
  beforeLabelInsert?: () => Promise<void>;
};

type CreateIssueFieldErrors = Partial<
  Record<"title" | "description" | "status" | "priority" | "labels", string>
>;

type CreateIssueOutcome =
  | { error: "forbidden" }
  | { fieldErrors: CreateIssueFieldErrors }
  | { issueId: string; assigneeCleared: boolean };

async function hasActiveMembership(
  database: Database | Transaction,
  projectId: string,
  userId: string,
): Promise<boolean> {
  const [membership] = await database
    .select({ id: projectMemberships.id })
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
        isNull(projectMemberships.removedAt),
      ),
    )
    .limit(1);
  return Boolean(membership);
}

async function resolveOrCreateLabel(
  database: Database | Transaction,
  projectId: string,
  userId: string,
  rawName: string,
  labelCount: number,
  beforeLabelInsert?: () => Promise<void>,
): Promise<string> {
  const name = rawName.trim();
  const color = LABEL_COLOR_CYCLE[labelCount % LABEL_COLOR_CYCLE.length];

  if (beforeLabelInsert) await beforeLabelInsert();

  const [inserted] = await database
    .insert(labels)
    .values({ projectId, name, color, createdBy: userId })
    .onConflictDoNothing()
    .returning({ id: labels.id });
  if (inserted) return inserted.id;

  const [existing] = await database
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.projectId, projectId), sql`lower(${labels.name}) = lower(${name})`))
    .limit(1);
  if (!existing) throw new Error(`Failed to resolve or create label "${name}"`);
  return existing.id;
}

export async function createIssue(
  database: Database,
  input: CreateIssueInput,
  options: CreateIssueOptions = {},
): Promise<CreateIssueOutcome> {
  const isMember = await hasActiveMembership(database, input.projectId, input.userId);
  if (!isMember) {
    return { error: "forbidden" };
  }

  const fieldErrors = validateIssueFields({
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
  });
  const newLabelNames = input.newLabelNames ?? [];
  for (const rawName of newLabelNames) {
    const labelError = validateLabelName(rawName);
    if (labelError) {
      fieldErrors.labels = labelError;
      break;
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let assigneeId: string | null = null;
  let assigneeCleared = false;
  if (input.assigneeId) {
    const isActiveAssignee = await hasActiveMembership(database, input.projectId, input.assigneeId);
    if (isActiveAssignee) {
      assigneeId = input.assigneeId;
    } else {
      assigneeCleared = true;
    }
  }

  const issueId = await database.transaction(async (tx) => {
    const resolvedLabelIds = [...(input.labelIds ?? [])];
    let labelCount = resolvedLabelIds.length;
    for (const rawName of newLabelNames) {
      const labelId = await resolveOrCreateLabel(
        tx,
        input.projectId,
        input.userId,
        rawName,
        labelCount,
        options.beforeLabelInsert,
      );
      resolvedLabelIds.push(labelId);
      labelCount += 1;
    }

    const [issue] = await tx
      .insert(issues)
      .values({
        projectId: input.projectId,
        title: input.title.trim(),
        createdBy: input.userId,
        description: input.description ? input.description : null,
        assigneeId,
        ...(input.status !== undefined ? { status: input.status as IssueStatus } : {}),
        ...(input.priority !== undefined ? { priority: input.priority as IssuePriority } : {}),
      })
      .returning({ id: issues.id });

    if (resolvedLabelIds.length > 0) {
      await tx
        .insert(issueLabels)
        .values(resolvedLabelIds.map((labelId) => ({ issueId: issue.id, labelId })));
    }

    return issue.id;
  });

  return { issueId, assigneeCleared };
}