import type { UserView } from "@/lib/db/queries/users";
import { UserAvatar } from "./user-avatar";

export function UserProfile({ user }: { user: UserView }) {
  return (
    <article data-profile-ready="true">
      <UserAvatar
        user={user}
        profileMarker
      />
      <h1>
        {user.firstName} {user.lastName}
      </h1>
      <p>{user.role === "admin" ? "Admin" : "Member"}</p>
      <p>{user.status === "active" ? "Active" : "Suspended"}</p>
      {user.phoneNumber ? (
        <p>
          <span>Phone number</span> {user.phoneNumber}
        </p>
      ) : null}
      {user.slackHandle ? (
        <p>
          <span>Slack handle</span> @{user.slackHandle}
        </p>
      ) : null}
    </article>
  );
}