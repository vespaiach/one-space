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

describe("CreateIssueForm", () => {
  beforeEach(() => {
    actionState.value = null;
    actionState.pending = false;
    mockBack.mockReset();
  });

  it("renders a title input with an accessible label", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    expect(screen.getByLabelText(/issue title/i)).toBeTruthy();
  });

  it("navigates back when Cancel is clicked", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockBack).toHaveBeenCalledOnce();
  });

  it("disables the Create issue submit button while pending", () => {
    actionState.pending = true;
    render(<CreateIssueForm projectKey="ALPHA" />);
    expect((screen.getByRole("button", { name: /create issue/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an inline error under the title field for a blank-title submission", () => {
    actionState.value = { fieldErrors: { title: "Title is required" } };
    render(<CreateIssueForm projectKey="ALPHA" />);
    const titleInput = screen.getByLabelText(/issue title/i);
    expect(screen.getByText("Title is required")).toBeTruthy();
    expect(titleInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("lists all five status options with the correct display labels", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    const select = screen.getByLabelText(/status/i) as HTMLSelectElement;
    const labels = Array.from(select.options).map((option) => option.textContent);
    expect(labels).toEqual(["Backlog", "Todo", "In Progress", "Done", "Canceled"]);
  });

  it("lists all five priority options with the correct display labels", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    const select = screen.getByLabelText(/priority/i) as HTMLSelectElement;
    const labels = Array.from(select.options).map((option) => option.textContent);
    expect(labels).toEqual(["No Priority", "Low", "Medium", "High", "Urgent"]);
  });

  it("updates the submitted status value when a different status is selected", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    const select = screen.getByLabelText(/status/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "in_progress" } });
    expect(select.value).toBe("in_progress");
  });

  it("updates the submitted priority value when a different priority is selected", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    const select = screen.getByLabelText(/priority/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "high" } });
    expect(select.value).toBe("high");
  });

  it("shows the Write textarea by default and switches to the Preview panel on tab click", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    expect(screen.getByPlaceholderText(/markdown/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /preview/i }));
    expect(screen.queryByPlaceholderText(/markdown/i)).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /write/i }));
    expect(screen.getByPlaceholderText(/markdown/i)).toBeTruthy();
  });

  it("renders bold, italic, list, heading, and link markdown as formatted HTML in Preview", () => {
    render(<CreateIssueForm projectKey="ALPHA" />);
    fireEvent.change(screen.getByPlaceholderText(/markdown/i), {
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
    render(<CreateIssueForm projectKey="ALPHA" />);
    fireEvent.change(screen.getByPlaceholderText(/markdown/i), {
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
        projectKey="ALPHA"
        members={members}
      />,
    );
    expect(screen.getByRole("button", { name: /ada member/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /bo member/i })).toBeTruthy();
  });

  it('selects the current user and shows Clear when "Assign to me" is clicked', () => {
    render(
      <CreateIssueForm
        projectKey="ALPHA"
        members={members}
      />,
    );
    expect(screen.queryByRole("button", { name: /^clear$/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /assign to me/i }));

    expect(screen.getByRole("button", { name: /^clear$/i })).toBeTruthy();
  });

  it("highlights a member when selected and clears the selection on Clear", () => {
    render(
      <CreateIssueForm
        projectKey="ALPHA"
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

  it("lists existing project labels as toggle rows", () => {
    render(
      <CreateIssueForm
        projectKey="ALPHA"
        labels={labelOptions}
      />,
    );
    const bugToggle = screen.getByRole("button", { name: /^bug$/i });
    const designToggle = screen.getByRole("button", { name: /^design$/i });
    expect(bugToggle.getAttribute("aria-pressed")).toBe("false");
    expect(designToggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders selected labels as independently removable chips", () => {
    render(
      <CreateIssueForm
        projectKey="ALPHA"
        labels={labelOptions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^bug$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^design$/i }));

    expect(screen.getByRole("button", { name: /remove bug/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /remove design/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /remove bug/i }));
    expect(screen.queryByRole("button", { name: /remove bug/i })).toBeNull();
    expect(screen.getByRole("button", { name: /remove design/i })).toBeTruthy();
  });

  it('shows a "Create ..." affordance when typing a name that does not match an existing label', () => {
    render(
      <CreateIssueForm
        projectKey="ALPHA"
        labels={labelOptions}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/search or create a label/i), {
      target: { value: "Performance" },
    });
    expect(screen.getByRole("button", { name: /create.*performance/i })).toBeTruthy();
  });

  it("allows selecting an existing label and creating a new one together", () => {
    render(
      <CreateIssueForm
        projectKey="ALPHA"
        labels={labelOptions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^bug$/i }));
    fireEvent.change(screen.getByPlaceholderText(/search or create a label/i), {
      target: { value: "Performance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create.*performance/i }));

    expect(screen.getByRole("button", { name: /remove bug/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /remove performance/i })).toBeTruthy();
  });
});
