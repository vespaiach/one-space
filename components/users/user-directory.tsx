import * as stylex from "@stylexjs/stylex";
import type { UserView } from "@/lib/db/queries/users";
import { space, structure } from "@/styles/tokens.stylex";
import { UserCard } from "./user-card";

const styles = stylex.create({
  list: { display: structure.grid, gap: space.s5 },
});

export function UserDirectory({ users }: { users: UserView[] }) {
  return (
    <div {...stylex.props(styles.list)}>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
        />
      ))}
    </div>
  );
}