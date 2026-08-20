import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pendingState = vi.hoisted(() => ({ value: false }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: (action: unknown, initial: unknown) => [initial, action, pendingState.value],
  };
});

vi.mock("@/app/actions/projects", () => ({
  createProject: vi.fn(),
}));

import { CreateProjectForm } from "@/components/projects/create-project-form";

const availableUsers = [
  { id: "user-1", name: "Alice Smith", email: "alice@example.com" },
  { id: "user-2", name: "Bob Jones", email: "bob@example.com" },
  { id: "user-3", name: "Charlie Ali", email: "charlie@example.com" },
];

describe("CreateProjectForm", () => {
  it("auto-generates key 'MA' on name blur for single-word name", () => {
    render(<CreateProjectForm />);
    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: "Marketing" } });
    fireEvent.blur(screen.getByLabelText(/project name/i));
    expect((screen.getByLabelText(/project key/i) as HTMLInputElement).value).toBe("MA");
  });

  it("auto-generates key 'MC' on name blur for two-word name", () => {
    render(<CreateProjectForm />);
    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: "Marketing Campaign" } });
    fireEvent.blur(screen.getByLabelText(/project name/i));
    expect((screen.getByLabelText(/project key/i) as HTMLInputElement).value).toBe("MC");
  });

  it("does not overwrite manually edited key when name changes after manual edit", () => {
    render(<CreateProjectForm />);
    const nameInput = screen.getByLabelText(/project name/i);
    const keyInput = screen.getByLabelText(/project key/i);

    fireEvent.change(nameInput, { target: { value: "Marketing" } });
    fireEvent.blur(nameInput);
    fireEvent.change(keyInput, { target: { value: "MKTG" } });
    fireEvent.change(nameInput, { target: { value: "Mobile" } });
    fireEvent.blur(nameInput);

    expect((keyInput as HTMLInputElement).value).toBe("MKTG");
  });

  it("sets color hidden input to amber when amber swatch clicked", () => {
    render(<CreateProjectForm />);
    fireEvent.click(screen.getByRole("radio", { name: /amber/i }));
    const colorInput = screen.getByDisplayValue("amber") as HTMLInputElement;
    expect(colorInput.value).toBe("amber");
  });

  it("disables submit button while pending", () => {
    pendingState.value = true;
    render(<CreateProjectForm />);
    pendingState.value = false;
    expect(screen.getByRole("button", { name: /create project/i })).toHaveProperty("disabled", true);
  });
});

describe("CreateProjectForm — member picker (US3)", () => {
  it("renders all availableUsers in the picker dropdown", () => {
    render(<CreateProjectForm availableUsers={availableUsers} />);
    expect(screen.getByText("Alice Smith")).toBeTruthy();
    expect(screen.getByText("Bob Jones")).toBeTruthy();
    expect(screen.getByText("Charlie Ali")).toBeTruthy();
  });

  it("filters dropdown by name/email substring (case-insensitive)", () => {
    render(<CreateProjectForm availableUsers={availableUsers} />);
    fireEvent.change(screen.getByPlaceholderText(/search members/i), { target: { value: "ali" } });
    expect(screen.queryByText("Alice Smith")).toBeTruthy();
    expect(screen.queryByText("Charlie Ali")).toBeTruthy();
    expect(screen.queryByText("Bob Jones")).toBeNull();
  });

  it("adds a chip and removes user from dropdown when clicked", () => {
    render(<CreateProjectForm availableUsers={availableUsers} />);
    fireEvent.click(screen.getByText("Alice Smith"));
    const chips = document.querySelectorAll("[data-chip]");
    expect(chips).toHaveLength(1);
    expect(screen.queryByRole("option", { name: "Alice Smith" })).toBeNull();
  });

  it("removes chip and returns user to dropdown when dismiss icon clicked", () => {
    render(<CreateProjectForm availableUsers={availableUsers} />);
    fireEvent.click(screen.getByText("Alice Smith"));
    const dismissButton = screen.getByRole("button", { name: /remove alice smith/i });
    fireEvent.click(dismissButton);
    expect(screen.queryByText("Alice Smith")).toBeTruthy();
    const chips = document.querySelectorAll("[data-chip]");
    expect(chips).toHaveLength(0);
  });

  it("renders selected user IDs as memberIds[] hidden inputs", () => {
    render(<CreateProjectForm availableUsers={availableUsers} />);
    fireEvent.click(screen.getByText("Alice Smith"));
    fireEvent.click(screen.getByText("Bob Jones"));
    const hiddenInputs = document.querySelectorAll<HTMLInputElement>("input[name='memberIds[]']");
    const values = Array.from(hiddenInputs).map((i) => i.value);
    expect(values).toContain("user-1");
    expect(values).toContain("user-2");
  });
});
