import { index, pgEnum, pgTable, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const rateLimitScope = pgEnum("rate_limit_scope", [
  "login_source",
  "invite_actor",
  "invite_recipient",
  "reset_recipient",
  "reset_source",
  "token_validation_source",
]);

export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: rateLimitScope("scope").notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("rate_limit_events_lookup_idx").on(table.scope, table.keyHash, table.occurredAt)],
);

export const rateLimitStates = pgTable(
  "rate_limit_states",
  {
    scope: rateLimitScope("scope").notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    limitedUntil: timestamp("limited_until", { withTimezone: true }).notNull(),
    eventEmittedAt: timestamp("event_emitted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.keyHash], name: "rate_limit_states_pk" })],
);