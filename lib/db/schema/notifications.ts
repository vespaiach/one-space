import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { projectMemberships } from "./project-memberships";
import { projects } from "./projects";
import { users } from "./users";

export const notificationKind = pgEnum("notification_kind", ["project_member_added"]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    kind: notificationKind("kind").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    projectMembershipId: uuid("project_membership_id")
      .notNull()
      .references(() => projectMemberships.id, { onDelete: "restrict" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notifications_kind_membership_unique").on(table.kind, table.projectMembershipId),
    index("notifications_recipient_read_created_idx").on(
      table.recipientUserId,
      table.readAt,
      table.createdAt.desc(),
    ),
  ],
);