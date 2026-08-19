import { relations } from "drizzle-orm";
import { forcedResetAuthorizations, passwordResetTokens, sessions } from "./auth";
import { notifications } from "./notifications";
import { projectActivityEntries } from "./project-activity-entries";
import { projectMemberships } from "./project-memberships";
import { projects } from "./projects";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  forcedResetAuthorizations: many(forcedResetAuthorizations),
  createdProjects: many(projects, { relationName: "projectCreator" }),
  projectMemberships: many(projectMemberships, { relationName: "membershipUser" }),
  addedProjectMemberships: many(projectMemberships, { relationName: "membershipAddedBy" }),
  removedProjectMemberships: many(projectMemberships, { relationName: "membershipRemovedBy" }),
  receivedNotifications: many(notifications, { relationName: "notificationRecipient" }),
  actedNotifications: many(notifications, { relationName: "notificationActor" }),
  actedProjectActivityEntries: many(projectActivityEntries, { relationName: "activityActor" }),
  subjectProjectActivityEntries: many(projectActivityEntries, { relationName: "activitySubject" }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
    relationName: "projectCreator",
  }),
  memberships: many(projectMemberships),
  notifications: many(notifications),
  activityEntries: many(projectActivityEntries),
}));

export const projectMembershipsRelations = relations(projectMemberships, ({ many, one }) => ({
  project: one(projects, {
    fields: [projectMemberships.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMemberships.userId],
    references: [users.id],
    relationName: "membershipUser",
  }),
  addedBy: one(users, {
    fields: [projectMemberships.addedByUserId],
    references: [users.id],
    relationName: "membershipAddedBy",
  }),
  removedBy: one(users, {
    fields: [projectMemberships.removedByUserId],
    references: [users.id],
    relationName: "membershipRemovedBy",
  }),
  notifications: many(notifications),
  activityEntries: many(projectActivityEntries),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientUserId],
    references: [users.id],
    relationName: "notificationRecipient",
  }),
  actor: one(users, {
    fields: [notifications.actorUserId],
    references: [users.id],
    relationName: "notificationActor",
  }),
  project: one(projects, {
    fields: [notifications.projectId],
    references: [projects.id],
  }),
  projectMembership: one(projectMemberships, {
    fields: [notifications.projectMembershipId],
    references: [projectMemberships.id],
  }),
}));

export const projectActivityEntriesRelations = relations(projectActivityEntries, ({ one }) => ({
  project: one(projects, {
    fields: [projectActivityEntries.projectId],
    references: [projects.id],
  }),
  actor: one(users, {
    fields: [projectActivityEntries.actorUserId],
    references: [users.id],
    relationName: "activityActor",
  }),
  subject: one(users, {
    fields: [projectActivityEntries.subjectUserId],
    references: [users.id],
    relationName: "activitySubject",
  }),
  projectMembership: one(projectMemberships, {
    fields: [projectActivityEntries.projectMembershipId],
    references: [projectMemberships.id],
  }),
}));