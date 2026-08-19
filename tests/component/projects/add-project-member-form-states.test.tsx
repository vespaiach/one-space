import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AddProjectMemberState } from "@/app/actions/project-members";

const formState = vi.hoisted(() => ({
  value: { status: "idle" } as AddProjectMemberState,
  pending: false,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: (action: unknown) => [formState.value, action, formState.pending],
  };
});

const mocks = vi.hoisted(() => ({
  addProjectMember: vi.fn(),
  requireAdmin: vi.fn(),
  getMembershipManagementData: vi.fn(),
}));
vi.mock("@/app/actions/project-members", () => ({ addProjectMember: mocks.addProjectMember }));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db/queries/project-members", () => ({
  getMembershipManagementData: mocks.getMembershipManagementData,
}));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import ProjectMembersPage from "@/app/(shell)/projects/[projectKey]/settings/members/page";
import { AddProjectMemberForm } from "@/components/projects/members/add-project-member-form";

const projectId = "0198c532-1e16-7f2a-a3b4-31a034e98980";
const candidates = [
  {
    userId: "0198c532-1e16-7f2a-a3b4-31a034e98981",
    name: "Eligible Member",
    role: "member" as const,
    state: "eligible" as const,
  },
  {
    userId: "0198c532-1e16-7f2a-a3b4-31a034e98982",
    name: "Existing Member",
    role: "member" as const,
    state: "already_member" as const,
  },
  {
    userId: "0198c532-1e16-7f2a-a3b4-31a034e98983",
    name: "Suspended Member",
    role: "member" as const,
    state: "suspended" as const,
  },
];

function renderForm() {
  return render(
    <AddProjectMemberForm
      projectId={projectId}
      projectName="Alpha Project"
      candidates={candidates}
    />,
  );
}

describe("add Project member form states", () => {
  beforeEach(() => {
    formState.value = { status: "idle" };
    formState.pending = false;
    mocks.requireAdmin.mockReset();
    mocks.getMembershipManagementData.mockReset();
  });

  it("renders unavailable candidates with non-color text reasons", () => {
    renderForm();
    const existing = screen.getByRole("option", { name: "Existing Member (member) — Already a member" });
    const suspended = screen.getByRole("option", { name: "Suspended Member (member) — Suspended" });
    expect((existing as HTMLOptionElement).disabled).toBe(true);
    expect((suspended as HTMLOptionElement).disabled).toBe(true);
  });

  it.each([
    {
      code: "invalid_input" as const,
      message: "Choose a valid Project and user.",
      fieldErrors: { userId: ["Choose a valid user."] },
    },
    {
      code: "already_member" as const,
      message: "The selected user is already a Project member.",
    },
    {
      code: "user_ineligible" as const,
      message: "The selected user is not eligible for Project membership.",
    },
    {
      code: "conflict" as const,
      message: "Account access changed. Refresh the page and try again.",
    },
    {
      code: "unexpected" as const,
      message: "The member could not be added. Try again.",
    },
  ])("announces the $code state and preserves usable focus", ({ code, message, fieldErrors }) => {
    const { rerender } = renderForm();
    const select = screen.getByLabelText(/choose one active account/i);
    select.focus();
    formState.value = { status: "error", code, message, fieldErrors };

    rerender(
      <AddProjectMemberForm
        projectId={projectId}
        projectName="Alpha Project"
        candidates={candidates}
      />,
    );

    expect(screen.getByText(message).getAttribute("aria-live")).toBe("assertive");
    expect(document.activeElement).toBe(screen.getByLabelText(/choose one active account/i));
    if (code === "invalid_input") {
      expect(screen.getByLabelText(/choose one active account/i).getAttribute("aria-invalid")).toBe(
        "true",
      );
    }
  });

  it("provides a clear no-eligible-user state", () => {
    render(
      <AddProjectMemberForm
        projectId={projectId}
        projectName="Alpha Project"
        candidates={candidates.filter((candidate) => candidate.state !== "eligible")}
      />,
    );

    expect(
      screen.getByText("All active accounts are already members. Suspended accounts remain unavailable."),
    ).toBeTruthy();
    expect((screen.getByLabelText(/choose one active account/i) as HTMLSelectElement).disabled).toBe(true);
  });

  it("uses native labeled controls that remain width-bounded for zoom and narrow layouts", () => {
    renderForm();
    const select = screen.getByLabelText(/choose one active account/i) as HTMLSelectElement;
    const button = screen.getByRole("button", { name: /add member/i });
    fireEvent.change(select, { target: { value: candidates[0].userId } });

    expect(select.tagName).toBe("SELECT");
    expect(select.style.width).toBe("100%");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders archived context without reactivating the Project", async () => {
    mocks.requireAdmin.mockResolvedValue({ userId: "admin", role: "admin", status: "active" });
    mocks.getMembershipManagementData.mockResolvedValue({
      project: { id: projectId, key: "ALPHA", name: "Alpha Project", status: "archived" },
      members: [],
      candidates,
      hasEligibleCandidates: true,
      emptyState: null,
    });

    render(await ProjectMembersPage({ params: Promise.resolve({ projectKey: "ALPHA" }) }));

    expect(screen.getByText("This Project is archived. New members receive read-only access.")).toBeTruthy();
  });
});
