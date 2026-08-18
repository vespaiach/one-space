import { relations } from "drizzle-orm";
import { forcedResetAuthorizations, passwordResetTokens, sessions } from "./auth";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  forcedResetAuthorizations: many(forcedResetAuthorizations),
}));