import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "@/lib/db";
import { notifications, projects, users } from "@/lib/db/schema";
import {
  type ProjectMembershipNotification,
  projectMembershipNotification,
} from "@/lib/notifications/project-membership-notification";

const notificationActors = alias(users, "notification_actors");

export async function listNotificationsForRecipient(
  database: Database,
  recipientUserId: string,
): Promise<ProjectMembershipNotification[]> {
  const rows = await database
    .select({
      id: notifications.id,
      kind: notifications.kind,
      actorFirstName: notificationActors.firstName,
      actorLastName: notificationActors.lastName,
      projectName: projects.name,
      projectKey: projects.key,
      projectStatus: projects.status,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(notificationActors, eq(notifications.actorUserId, notificationActors.id))
    .innerJoin(projects, eq(notifications.projectId, projects.id))
    .where(eq(notifications.recipientUserId, recipientUserId))
    .orderBy(
      asc(sql`${notifications.readAt} is not null`),
      desc(notifications.createdAt),
      desc(notifications.id),
    );
  return rows.map((row) =>
    projectMembershipNotification({
      id: row.id,
      actorName: `${row.actorFirstName} ${row.actorLastName}`,
      projectName: row.projectName,
      projectKey: row.projectKey,
      projectStatus: row.projectStatus,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }),
  );
}