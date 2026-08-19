import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { space, structure } from "@/styles/tokens.stylex";

const styles = stylex.create({
  navigation: { display: structure.flex, gap: space.s4 },
});

export function ProjectSettingsNavigation({ projectKey, isAdmin }: { projectKey: string; isAdmin: boolean }) {
  return (
    <nav
      {...stylex.props(styles.navigation)}
      aria-label="Project settings">
      <Link href={`/projects/${projectKey}`}>Project overview</Link>
      {isAdmin ? <Link href={`/projects/${projectKey}/settings/members`}>Members</Link> : null}
    </nav>
  );
}