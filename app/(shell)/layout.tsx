import { Shell } from "@/components/ui/shell";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listNotificationsForRecipient } from "@/lib/db/queries/notifications";
import { listSidebarProjectsForUser } from "@/lib/db/queries/projects";
import { listUsers } from "@/lib/db/queries/users";

const MEMBERS = [
  { initials: "MA", bg: "oklch(0.5956 0.1154 56.61)" },
  { initials: "DR", bg: "oklch(0.5432 0.0359 82.61)" },
  { initials: "PR", bg: "oklch(0.5607 0.0978 33.48)" },
  { initials: "LN", bg: "oklch(0.5259 0.0603 247.43)" },
  { initials: "SF", bg: "oklch(0.6722 0.1132 72.89)" },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const isAdmin = session.role === "admin";
  const [notifications, members, projects] = await Promise.all([
    listNotificationsForRecipient(db, session.userId),
    isAdmin ? listUsers(db) : Promise.resolve([]),
    listSidebarProjectsForUser(db, session.userId),
  ]);
  return (
    <Shell
      members={MEMBERS}
      projects={projects}
      isAdmin={isAdmin}
      notificationCount={notifications.length}
      memberCount={members.length}
      hideTopBarOn={["/projects/new"]}>
      {children}
    </Shell>
  );
}