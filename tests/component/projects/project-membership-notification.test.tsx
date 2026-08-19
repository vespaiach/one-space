import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationsAndMentions } from "@/components/home/notifications-and-mentions";
import {
  projectMembershipNotification,
  type ProjectMembershipNotificationSource,
} from "@/lib/notifications/project-membership-notification";

const source: ProjectMembershipNotificationSource = {
  id: "0198c532-1e16-7f2a-a3b4-31a034e98980",
  actorName: "Grace Admin",
  projectName: "Apollo Project",
  projectKey: "APOLLO",
  projectStatus: "active",
  readAt: null,
  createdAt: new Date("2026-08-19T12:00:00.000Z"),
};

describe("Project membership Notification projection", () => {
  it("renders current actor and Project labels with unread state", () => {
    render(<NotificationsAndMentions notifications={[projectMembershipNotification(source)]} />);

    expect(screen.getByText("Grace Admin added you to Apollo Project.")).toBeTruthy();
    expect(screen.getByText("Unread")).toBeTruthy();
    expect(screen.getByRole("link", { name: /open apollo project/i }).getAttribute("href")).toBe(
      "/projects/APOLLO",
    );
  });

  it("identifies archived destinations as read-only", () => {
    render(
      <NotificationsAndMentions
        notifications={[
          projectMembershipNotification({ ...source, projectStatus: "archived" }),
        ]}
      />,
    );

    expect(screen.getByText("Archived · Read-only")).toBeTruthy();
    expect(screen.getByRole("link", { name: /open apollo project/i }).getAttribute("href")).toBe(
      "/projects/APOLLO",
    );
  });

  it("derives renamed Project labels and destinations without client-authored URLs", () => {
    const input = {
      ...source,
      projectName: "Renamed Project",
      projectKey: "RENAMD",
      destination: "/admin/private",
    };

    expect(projectMembershipNotification(input)).toMatchObject({
      message: "Grace Admin added you to Renamed Project.",
      href: "/projects/RENAMD",
    });
  });
});
