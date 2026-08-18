import * as stylex from "@stylexjs/stylex";
import { colors, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  avatar: {
    alignItems: structure.alignCenter,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    color: colors.secondaryForeground,
    display: structure.flex,
    fontSize: type.sizeLg,
    fontWeight: type.weightSemibold,
    justifyContent: structure.alignCenter,
    minHeight: space.s9,
    width: space.s9,
  },
});

export function DefaultAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <div
      {...stylex.props(styles.avatar)}
      data-profile-avatar="default"
      role="img"
      aria-label={`Default avatar for ${firstName} ${lastName}`}>
      {firstName.slice(0, 1)}
      {lastName.slice(0, 1)}
    </div>
  );
}