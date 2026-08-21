import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const issueStatus = pgEnum("issue_status", ["backlog", "todo", "in_progress", "done", "canceled"]);
export const issuePriority = pgEnum("issue_priority", ["none", "low", "medium", "high", "urgent"]);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: issueStatus("status").notNull().default("backlog"),
    priority: issuePriority("priority").notNull().default("none"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("issues_project_status_idx").on(table.projectId, table.status),
    index("issues_assignee_idx").on(table.assigneeId),
  ],
);