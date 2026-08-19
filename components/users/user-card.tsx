import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import type { UserView } from "@/lib/db/queries/users";
import { colors, radius, space, structure } from "@/styles/tokens.stylex";
import { UserAvatar } from "./user-avatar";

const styles = stylex.create({
  card: {
    alignItems: structure.alignCenter,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    display: structure.flex,
    gap: space.s5,
    padding: space.s6,
  },
});

export function UserCard({ user }: { user: UserView }) {
  return (
    <article {...stylex.props(styles.card)}>
      <UserAvatar user={user} />
      <div>
        <Link
          href={`/users/${user.id}`}
          aria-label={`${user.firstName} ${user.lastName}`}>
          {user.firstName} {user.lastName}
        </Link>
        <p>{user.role === "admin" ? "Admin" : "Member"}</p>
      </div>
    </article>
  );
}