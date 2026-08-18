import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditCategory = pgEnum("audit_category", ["security", "administration", "operations"]);
export const auditOutcome = pgEnum("audit_outcome", [
  "succeeded",
  "rejected",
  "conflict",
  "degraded",
  "failed",
]);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: auditCategory("category").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    outcome: auditOutcome("outcome").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "restrict" }),
    targetId: uuid("target_id").references(() => users.id, { onDelete: "restrict" }),
    reasonCode: varchar("reason_code", { length: 80 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_occurred_at_idx").on(table.occurredAt)],
);