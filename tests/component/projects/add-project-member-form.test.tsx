import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionState = vi.hoisted(() => ({
  value: { status: "idle" } as
    | { status: "idle" }
    | { status: "success"; membershipId: string; message: string },
  pending: false,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: (action: unknown) => [actionState.value, action, actionState.pending],
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

import MembersPage from "@/app/(shell)/projects/[projectKey]/settings/members/page";
import { AddProjectMemberForm } from "@/components/projects/members/add-project-member-form";
import { ProjectMemberList } from "@/components/projects/members/project-member-list";

const projectId = "0198c532-1e16-7f2a-a3b4-31a034e98980";
const candidateId = "6f9619ff-8b86-d011-b42d-00c04fc964ff";
const candidates = [
  { userId: candidateId, name: "Ada Member", role: "member" as const, state: "eligible" as const },
];

describe("Project member management UI", () => {
  beforeEach(() => {
    actionState.value = { status: "idle" };
    actionState.pending = false;
    mocks.requireAdmin.mockReset();
    mocks.getMembershipManagementData.mockReset();
  });

  it("renders Project context and the Admin-only route for a non-member Admin", async () => {
    mocks.requireAdmin.mockResolvedValue({ userId: "admin", role: "admin", status: "active" });
    mocks.getMembershipManagementData.mockResolvedValue({
      project: { id: projectId, key: "ALPHA", name: "Alpha Project", status: "active" },
      members: [],
      candidates,
    });

    render(await MembersPage({ params: Promise.resolve({ projectKey: "ALPHA" }) }));

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Alpha Project members" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /back to alpha project/i }).getAttribute("href")).toBe(
      "/projects/ALPHA",
    );
    expect(screen.getByLabelText(/choose one active account/i)).toBeTruthy();
  });

  it("prevents submission until an eligible user is selected and while pending", () => {
    const { rerender } = render(
      <AddProjectMemberForm
        projectId={projectId}
        projectName="Alpha Project"
        candidates={candidates}
      />,
    );
    const submit = screen.getByRole("button", { name: /add member/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/choose one active account/i), {
      target: { value: candidateId },
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);

    actionState.pending = true;
    rerender(
      <AddProjectMemberForm
        projectId={projectId}
        projectName="Alpha Project"
        candidates={candidates}
      />,
    );
    actionState.pending = false;
    expect((screen.getByRole("button", { name: /adding member/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText(/adding the selected account/i).getAttribute("aria-live")).toBe("polite");
  });

  it("announces committed success, resets selection, and renders the refreshed roster", () => {
    const { rerender } = render(
      <AddProjectMemberForm
        projectId={projectId}
        projectName="Alpha Project"
        candidates={candidates}
      />,
    );
    fireEvent.change(screen.getByLabelText(/choose one active account/i), {
      target: { value: candidateId },
    });

    actionState.value = {
      status: "success",
      membershipId: "0198c532-1e16-7f2a-a3b4-31a034e98981",
      message: "Ada Member was added to Alpha Project.",
    };
    rerender(
      <AddProjectMemberForm
        projectId={projectId}
        projectName="Alpha Project"
        candidates={[]}
      />,
    );
    expect(
      screen.getByText("Ada Member was added to Alpha Project.").getAttribute("aria-live"),
    ).toBe("polite");
    expect((screen.getByLabelText(/choose one active account/i) as HTMLSelectElement).value).toBe("");

    rerender(
      <ProjectMemberList
        members={[{ userId: candidateId, name: "Ada Member", role: "member" }]}
      />,
    );
    expect(screen.getByText("Ada Member")).toBeTruthy();
    expect(screen.getByText("member")).toBeTruthy();
  });
});
