import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { colors, layout, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  shell: {
    display: structure.grid,
    gap: space.s7,
    marginInline: structure.auto,
    maxWidth: layout.contentMax,
    minHeight: structure.minHeightScreen,
    padding: space.s7,
  },
  navigation: {
    alignItems: structure.alignCenter,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    display: structure.flex,
    fontSize: type.sizeBase,
    justifyContent: structure.justifyBetween,
    padding: space.s5,
  },
  links: { alignItems: structure.alignCenter, display: structure.flex, gap: space.s4 },
  button: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    padding: space.s4,
  },
});

type ShellProps = {
  children: React.ReactNode;
  isAdmin?: boolean;
};

export function Shell({ children, isAdmin = false }: ShellProps) {
  return (
    <div {...stylex.props(styles.shell)}>
      <nav
        {...stylex.props(styles.navigation)}
        aria-label="Primary navigation">
        <div {...stylex.props(styles.links)}>
          <Link href="/users">People</Link>
          {isAdmin ? <Link href="/admin/invitations">Invite member</Link> : null}
        </div>
        <form action={logout}>
          <button
            {...stylex.props(styles.button)}
            type="submit">
            Log out
          </button>
        </form>
      </nav>
      <main>{children}</main>
    </div>
  );
}