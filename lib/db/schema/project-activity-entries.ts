import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { projectMemberships } from "./project-memberships";
import { projects } from "./projects";
import { users } from "./users";

export const projectActivityEventType = pgEnum("project_activity_event_type", ["member_added"]);

export const projectActivityEntries = pgTable(
  "project_activity_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    eventType: projectActivityEventType("event_type").notNull(),
    subjectUserId: uuid("subject_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    projectMembershipId: uuid("project_membership_id")
      .notNull()
      .references(() => projectMemberships.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_activity_entries_event_membership_unique").on(
      table.eventType,
      table.projectMembershipId,
    ),
    index("project_activity_entries_project_created_id_idx").on(
      table.projectId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);