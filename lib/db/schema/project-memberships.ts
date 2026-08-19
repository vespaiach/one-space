import { sql } from "drizzle-orm";
import { check, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const projectMemberships = pgTable(
  "project_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    addedByUserId: uuid("added_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    removedByUserId: uuid("removed_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("project_memberships_one_active_per_user")
      .on(table.projectId, table.userId)
      .where(sql`${table.removedAt} is null`),
    index("project_memberships_user_removed_idx").on(table.userId, table.removedAt),
    index("project_memberships_project_removed_added_idx").on(
      table.projectId,
      table.removedAt,
      table.addedAt,
    ),
    check(
      "project_memberships_removal_pair",
      sql`(${table.removedAt} is null and ${table.removedByUserId} is null) or (${table.removedAt} is not null and ${table.removedByUserId} is not null)`,
    ),
  ],
);