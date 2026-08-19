import * as stylex from "@stylexjs/stylex";
import type { ProjectMember } from "@/lib/db/queries/project-members";
import { colors, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  list: { display: structure.grid, gap: space.s3, listStyle: structure.none, padding: space.s0 },
  item: {
    alignItems: structure.alignCenter,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    display: structure.flex,
    justifyContent: structure.justifyBetween,
    padding: space.s5,
  },
  name: { color: colors.foreground, fontWeight: type.weightSemibold },
  role: { color: colors.textSecondary, fontSize: type.sizeSm, textTransform: structure.capitalize },
  empty: { color: colors.textSecondary },
});

export function ProjectMemberList({ members }: { members: ProjectMember[] }) {
  if (members.length === 0) return <p {...stylex.props(styles.empty)}>No Project members yet.</p>;
  return (
    <ul {...stylex.props(styles.list)}>
      {members.map((member) => (
        <li
          {...stylex.props(styles.item)}
          key={member.userId}>
          <span {...stylex.props(styles.name)}>{member.name}</span>
          <span {...stylex.props(styles.role)}>{member.role}</span>
        </li>
      ))}
    </ul>
  );
}