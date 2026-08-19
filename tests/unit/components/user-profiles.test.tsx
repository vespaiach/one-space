import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserDirectory } from "@/components/users/user-directory";
import { UserProfile } from "@/components/users/user-profile";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Amy",
  lastName: "Able",
  role: "member" as const,
  status: "active" as const,
  phoneNumber: null,
  slackHandle: null,
  avatarKey: null,
};

describe("user profiles", () => {
  it("renders exact directory fields and a default avatar", () => {
    render(<UserDirectory users={[user]} />);
    expect(screen.getByRole("link", { name: /amy able/i })).not.toBeNull();
    expect(screen.getByText("Member")).not.toBeNull();
    expect(screen.getByLabelText(/default avatar for amy able/i)).not.toBeNull();
  });

  it("renders profile optional fields only when present", () => {
    const { rerender } = render(<UserProfile user={user} />);
    expect(screen.queryByText(/phone number/i)).toBeNull();
    rerender(<UserProfile user={{ ...user, phoneNumber: "+1 317", slackHandle: "amy" }} />);
    expect(screen.getByText("+1 317")).not.toBeNull();
    expect(screen.getByText("@amy")).not.toBeNull();
  });

  it("falls back to the default avatar when a referenced file is unavailable", () => {
    render(<UserProfile user={{ ...user, avatarKey: "11111111-1111-4111-8111-111111111111.png" }} />);
    fireEvent.error(screen.getByRole("img", { name: "Amy Able" }));
    expect(screen.getByLabelText(/default avatar for amy able/i)).not.toBeNull();
  });
});
