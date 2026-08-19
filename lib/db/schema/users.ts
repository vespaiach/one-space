import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "member"]);
export const userStatus = pgEnum("user_status", ["active", "suspended"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("member"),
    status: userStatus("status").notNull().default("active"),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 50 }),
    slackHandle: varchar("slack_handle", { length: 80 }),
    avatarKey: text("avatar_key"),
    forcePasswordReset: boolean("force_password_reset").notNull().default(false),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_status_idx").on(table.role, table.status),
    check("users_failed_login_attempts_nonnegative", sql`${table.failedLoginAttempts} >= 0`),
  ],
);