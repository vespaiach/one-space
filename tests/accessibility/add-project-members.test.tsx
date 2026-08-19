import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
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
vi.mock("@/app/actions/project-members", () => ({ addProjectMember: vi.fn() }));

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

axe.configure({ rules: [{ id: "color-contrast", enabled: false }] });

function form(candidateSet = candidates): ReactNode {
  return (
    <AddProjectMemberForm
      projectId={projectId}
      projectName="Alpha Project"
      candidates={candidateSet}
    />
  );
}

async function expectNoSeriousViolations(view: ReactNode) {
  const { container } = render(
    <main>
      <h1>Alpha Project members</h1>
      {view}
    </main>,
  );
  const results = await axe.run(container);
  expect(
    results.violations.filter(({ impact }) => impact === "critical" || impact === "serious"),
  ).toEqual([]);
  cleanup();
}

describe("add Project member accessibility", () => {
  it("has no critical or serious axe findings across every SC-008 state", async () => {
    const states: Array<{ state: AddProjectMemberState; pending?: boolean; view?: ReactNode }> = [
      { state: { status: "idle" } },
      { state: { status: "idle" }, pending: true },
      {
        state: { status: "success", membershipId: projectId, message: "Member was added." },
      },
      {
        state: {
          status: "error",
          code: "invalid_input",
          message: "Choose a valid Project and user.",
          fieldErrors: { userId: ["Choose a valid user."] },
        },
      },
      {
        state: {
          status: "error",
          code: "already_member",
          message: "The selected user is already a Project member.",
        },
      },
      {
        state: {
          status: "error",
          code: "user_ineligible",
          message: "The selected user is not eligible for Project membership.",
        },
      },
      {
        state: {
          status: "error",
          code: "unexpected",
          message: "The member could not be added. Try again.",
        },
      },
      {
        state: { status: "idle" },
        view: (
          <section>
            <p>This Project is archived. New members receive read-only access.</p>
            {form()}
          </section>
        ),
      },
      {
        state: { status: "idle" },
        view: form(candidates.filter((candidate) => candidate.state !== "eligible")),
      },
    ];

    for (const scenario of states) {
      formState.value = scenario.state;
      formState.pending = scenario.pending ?? false;
      await expectNoSeriousViolations(scenario.view ?? form());
    }
  });

  it("uses keyboard-native controls, linked status semantics, and bounded widths", () => {
    formState.value = {
      status: "error",
      code: "invalid_input",
      message: "Choose a valid Project and user.",
      fieldErrors: { userId: ["Choose a valid user."] },
    };
    formState.pending = false;
    render(<main>{form()}</main>);
    const select = screen.getByLabelText(/choose one active account/i) as HTMLSelectElement;
    select.focus();
    fireEvent.change(select, { target: { value: candidates[0].userId } });

    expect(document.activeElement).toBe(select);
    expect(select.tagName).toBe("SELECT");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.getAttribute("aria-describedby")).toContain("project-member-user-error");
    expect(select.style.width).toBe("100%");
    expect((screen.getByRole("button", { name: /add member/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(screen.getByText("Choose a valid Project and user.").getAttribute("aria-live")).toBe(
      "assertive",
    );
  });
});
