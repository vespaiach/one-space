import * as stylex from "@stylexjs/stylex";
import { asc, ne } from "drizzle-orm";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { requireAdminOrForbidden } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { colors, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  page: {
    paddingTop: space.s7,
    paddingInline: space.s8,
    paddingBottom: space.s11,
  },
  container: {
    maxWidth: "620px",
    marginInline: structure.auto,
  },
  heading: {
    fontSize: type.sizeXl,
    fontWeight: type.weightBold,
    letterSpacing: "-0.025em",
    color: colors.foreground,
    margin: 0,
  },
  subtitle: {
    fontSize: type.sizeSm,
    color: colors.textSecondary,
    marginBottom: "28px",
  },
});

export default async function NewProjectPage() {
  const admin = await requireAdminOrForbidden();

  const availableUsers = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(ne(users.id, admin.userId))
    .orderBy(asc(users.firstName), asc(users.lastName));

  const pickerUsers = availableUsers.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
  }));

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.container)}>
        <h1 {...stylex.props(styles.heading)}>New project</h1>
        <p {...stylex.props(styles.subtitle)}>Set up a project and add your team.</p>
        <CreateProjectForm availableUsers={pickerUsers} />
      </div>
    </main>
  );
}