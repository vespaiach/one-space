import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionState = vi.hoisted(() => ({
  value: null as null | { fieldErrors: Partial<Record<string, string>> },
  pending: false,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: (action: unknown) => [actionState.value, action, actionState.pending],
  };
});

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

vi.mock("@/app/actions/issues", () => ({ createIssue: vi.fn() }));

import { CreateIssueForm } from "@/components/projects/issues/create-issue-form";

const baseProps = { projectKey: "ALPHA", projectName: "Alpha Project", projectColor: "#B26B32" };

function hiddenInput(container: HTMLElement, name: string) {
  return container.querySelector(`input[name="${name}"]`) as HTMLInputElement;
}

describe("CreateIssueForm", () => {
  beforeEach(() => {
    actionState.value = null;
    actionState.pending = false;
    mockBack.mockReset();
  });

  it("renders a title input with an accessible label", () => {
    render(<CreateIssueForm {...baseProps} />);
    expect(screen.getByLabelText(/issue title/i)).toBeTruthy();
  });

  it("shows a breadcrumb with the project name and New issue", () => {
    render(<CreateIssueForm {...baseProps} />);
    expect(screen.getByText("Alpha Project")).toBeTruthy();
    expect(screen.getByText("New issue")).toBeTruthy();
  });

  it("navigates back when Cancel is clicked", () => {
    render(<CreateIssueForm {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockBack).toHaveBeenCalledOnce();
  });

  it("disables the Create issue submit button while pending", () => {
    actionState.pending = true;
    render(<CreateIssueForm {...baseProps} />);
    expect((screen.getByRole("button", { name: /create issue/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an inline error under the title field for a blank-title submission", () => {
    actionState.value = { fieldErrors: { title: "Title is required" } };
    render(<CreateIssueForm {...baseProps} />);
    const titleInput = screen.getByLabelText(/issue title/i);
    expect(screen.getByText("Title is required")).toBeTruthy();
    expect(titleInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("lists all five status options in the Status popover with the correct display labels", () => {
    render(<CreateIssueForm {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /^status:/i }));
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Backlog", "Todo", "In Progress", "Done", "Canceled"]);
  });

  it("updates the submitted status value when a different status is selected", () => {
    const { container } = render(<CreateIssueForm {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /^status:/i }));
    fireEvent.click(screen.getByRole("option", { name: /in progress/i }));
    expect(hiddenInput(container, "status").value).toBe("in_progress");
    expect(screen.getByRole("button", { name: /^status: in progress$/i })).toBeTruthy();
  });

  it("closes the status popover after selecting an option", () => {
    render(<CreateIssueForm {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /^status:/i }));
    fireEvent.click(screen.getByRole("option", { name: /^todo$/i }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("cycles through all five priority values when clicked repeatedly", () => {
    const { container } = render(<CreateIssueForm {...baseProps} />);
    const priorityButton = () => screen.getByRole("button", { name: /^priority:/i });

    expect(hiddenInput(container, "priority").value).toBe("none");
    fireEvent.click(priorityButton());
    expect(hiddenInput(container, "priority").value).toBe("low");
    fireEvent.click(priorityButton());
    expect(hiddenInput(container, "priority").value).toBe("medium");
    fireEvent.click(priorityButton());
    expect(hiddenInput(container, "priority").value).toBe("high");
    fireEvent.click(priorityButton());
    expect(hiddenInput(container, "priority").value).toBe("urgent");
    fireEvent.click(priorityButton());
    expect(hiddenInput(container, "priority").value).toBe("none");
  });

  it("shows the Write textarea by default and switches to the Preview panel on tab click", () => {
    render(<CreateIssueForm {...baseProps} />);
    expect(screen.getByPlaceholderText(/describe the issue/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /preview/i }));
    expect(screen.queryByPlaceholderText(/describe the issue/i)).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /write/i }));
    expect(screen.getByPlaceholderText(/describe the issue/i)).toBeTruthy();
  });

  it("renders bold, italic, list, heading, and link markdown as formatted HTML in Preview", () => {
    render(<CreateIssueForm {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: "# Title\n\n**bold** _italic_ [link](https://example.com)\n\n- one\n- two" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /preview/i }));

    const panel = screen.getByRole("tabpanel");
    expect(panel.querySelector("h1")?.textContent).toBe("Title");
    expect(panel.querySelector("strong")?.textContent).toBe("bold");
    expect(panel.querySelector("em")?.textContent).toBe("italic");
    expect(panel.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    expect(panel.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders raw HTML/script typed into the description as inert escaped text in Preview", () => {
    render(<CreateIssueForm {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: "<script>alert(1)</script>" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /preview/i }));

    const panel = screen.getByRole("tabpanel");
    expect(panel.querySelector("script")).toBeNull();
    expect(panel.textContent).toContain("<script>alert(1)</script>");
  });

  const members = [
    { userId: "member-1", name: "Ada Member" },
    { userId: "member-2", name: "Bo Member" },
  ];

  it("renders project members as avatar buttons in the assignee picker", () => {
    render(
      <CreateIssueForm
        {...baseProps}
        members={members}
      />,
    );
    expect(screen.getByRole("button", { name: /ada member/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /bo member/i })).toBeTruthy();
  });

  it('selects the current user and shows Clear when "Me" is clicked', () => {
    render(
      <CreateIssueForm
        {...baseProps}
        members={members}
        currentUserId="member-1"
      />,
    );
    expect(screen.queryByRole("button", { name: /^clear$/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /assign to me/i }));

    expect(screen.getByRole("button", { name: /^clear$/i })).toBeTruthy();
  });

  it("highlights a member when selected and clears the selection on Clear", () => {
    render(
      <CreateIssueForm
        {...baseProps}
        members={members}
      />,
    );
    const memberButton = screen.getByRole("button", { name: /ada member/i });
    expect(memberButton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(memberButton);
    expect(memberButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(memberButton.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("button", { name: /^clear$/i })).toBeNull();
  });

  const labelOptions = [
    { id: "label-1", name: "Bug", color: "bug" },
    { id: "label-2", name: "Design", color: "design" },
  ];

  it("lists existing project labels as toggle options in the Labels popover", () => {
    render(
      <CreateIssueForm
        {...baseProps}
        labels={labelOptions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^labels$/i }));

    const bugOption = screen.getByRole("option", { name: /^bug$/i });
    const designOption = screen.getByRole("option", { name: /^design$/i });
    expect(bugOption.getAttribute("aria-selected")).toBe("false");
    expect(designOption.getAttribute("aria-selected")).toBe("false");
  });

  it("renders selected labels as independently removable chips", () => {
    render(
      <CreateIssueForm
        {...baseProps}
        labels={labelOptions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^labels$/i }));
    fireEvent.click(screen.getByRole("option", { name: /^bug$/i }));
    fireEvent.click(screen.getByRole("option", { name: /^design$/i }));

    expect(screen.getByRole("button", { name: /remove bug/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /remove design/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /remove bug/i }));
    expect(screen.queryByRole("button", { name: /remove bug/i })).toBeNull();
    expect(screen.getByRole("button", { name: /remove design/i })).toBeTruthy();
  });

  it('shows a "Create ..." affordance when typing a name that does not match an existing label', () => {
    render(
      <CreateIssueForm
        {...baseProps}
        labels={labelOptions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^labels$/i }));
    fireEvent.change(screen.getByPlaceholderText(/search or create a label/i), {
      target: { value: "Performance" },
    });
    expect(screen.getByRole("button", { name: /create.*performance/i })).toBeTruthy();
  });

  it("allows selecting an existing label and creating a new one together", () => {
    render(
      <CreateIssueForm
        {...baseProps}
        labels={labelOptions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^labels$/i }));
    fireEvent.click(screen.getByRole("option", { name: /^bug$/i }));
    fireEvent.change(screen.getByPlaceholderText(/search or create a label/i), {
      target: { value: "Performance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create.*performance/i }));

    expect(screen.getByRole("button", { name: /remove bug/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /remove performance/i })).toBeTruthy();
  });
});
