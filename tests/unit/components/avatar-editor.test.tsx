import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvatarEditor } from "@/components/users/avatar-editor";

describe("avatar editor", () => {
  it("renders upload guidance and explicit keep/replace/remove intent", () => {
    render(<AvatarEditor hasAvatar />);
    expect(screen.getByText(/5 MB/i).textContent).toMatch(/4096/);
    expect(screen.getByLabelText(/jpeg or png/i)).not.toBeNull();
    expect(screen.getByRole("radio", { name: /remove/i })).not.toBeNull();
  });

  it("links a specific safe error to the file input", () => {
    render(<AvatarEditor hasAvatar={false} errorMessage="The picture exceeds the 5 MB input limit." />);
    const input = screen.getByLabelText(/jpeg or png/i);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("avatar-error");
  });

  it("previews replacement intent and announces removal intent", () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:avatar-preview") });
    render(<AvatarEditor hasAvatar userId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.change(screen.getByLabelText(/jpeg or png/i), {
      target: { files: [new File(["image"], "avatar.png", { type: "image/png" })] },
    });
    expect(screen.getByAltText(/avatar preview/i).getAttribute("src")).toBe("blob:avatar-preview");
    fireEvent.click(screen.getByRole("radio", { name: /remove/i }));
    expect(screen.getByText(/will be removed/i)).not.toBeNull();
  });
});
