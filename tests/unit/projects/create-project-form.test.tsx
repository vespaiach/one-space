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
