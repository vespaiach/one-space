export type ProjectMembershipNotificationSource = {
  id: string;
  actorName: string;
  projectName: string;
  projectKey: string;
  projectStatus: "active" | "archived";
  readAt: Date | null;
  createdAt: Date;
};

export type ProjectMembershipNotification = ProjectMembershipNotificationSource & {
  kind: "project_member_added";
  message: string;
  href: string;
};

export function projectMembershipNotification(
  source: ProjectMembershipNotificationSource,
): ProjectMembershipNotification {
  return {
    id: source.id,
    kind: "project_member_added",
    actorName: source.actorName,
    projectName: source.projectName,
    projectKey: source.projectKey,
    projectStatus: source.projectStatus,
    readAt: source.readAt,
    createdAt: source.createdAt,
    message: `${source.actorName} added you to ${source.projectName}.`,
    href: `/projects/${source.projectKey}`,
  };
}