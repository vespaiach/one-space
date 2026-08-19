"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import type { UserView } from "@/lib/db/queries/users";
import { radius, space, structure } from "@/styles/tokens.stylex";
import { DefaultAvatar } from "./default-avatar";

const styles = stylex.create({
  image: {
    borderRadius: radius.full,
    height: space.s9,
    objectFit: structure.cover,
    width: space.s9,
  },
});

export function UserAvatar({ user, profileMarker = false }: { user: UserView; profileMarker?: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  if (!user.avatarKey || unavailable) {
    return (
      <DefaultAvatar
        firstName={user.firstName}
        lastName={user.lastName}
      />
    );
  }
  return (
    <img
      {...stylex.props(styles.image)}
      src={`/api/users/${user.id}/avatar`}
      alt={`${user.firstName} ${user.lastName}`}
      data-profile-avatar={profileMarker ? "image" : undefined}
      onError={() => setUnavailable(true)}
    />
  );
}