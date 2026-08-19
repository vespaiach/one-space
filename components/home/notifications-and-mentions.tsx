import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import type { ProjectMembershipNotification } from "@/lib/notifications/project-membership-notification";
import { colors, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  section: { display: structure.grid, gap: space.s4 },
  list: { display: structure.grid, gap: space.s3, listStyle: structure.none, padding: space.s0 },
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    display: structure.grid,
    gap: space.s2,
    padding: space.s5,
  },
  metadata: {
    color: colors.textSecondary,
    display: structure.flex,
    fontSize: type.sizeSm,
    gap: space.s2,
  },
  unread: { color: colors.foreground, fontWeight: type.weightSemibold },
  empty: { color: colors.textSecondary },
});

export function NotificationsAndMentions({
  notifications,
}: {
  notifications: ProjectMembershipNotification[];
}) {
  return (
    <section
      {...stylex.props(styles.section)}
      aria-labelledby="notifications-and-mentions-heading">
      <h2 id="notifications-and-mentions-heading">Notifications &amp; Mentions</h2>
      {notifications.length === 0 ? (
        <p {...stylex.props(styles.empty)}>No notifications.</p>
      ) : (
        <ul {...stylex.props(styles.list)}>
          {notifications.map((notification) => (
            <li
              {...stylex.props(styles.item)}
              key={notification.id}>
              <p>{notification.message}</p>
              <p {...stylex.props(styles.metadata)}>
                {notification.readAt === null ? <span {...stylex.props(styles.unread)}>Unread</span> : "Read"}
                {notification.projectStatus === "archived" ? <span>Archived · Read-only</span> : null}
              </p>
              <Link
                href={notification.href}
                aria-label={`Open ${notification.projectName}`}>
                Open Project
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}