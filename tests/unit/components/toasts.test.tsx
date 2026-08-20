import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorToast } from "@/components/ui/toasts";

describe("toast animation", () => {
  it("applies the entry animation to the toast panel", async () => {
    const container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);

    render(<ErrorToast title="Error" message="Something went wrong" />);

    const toastPanel = await screen.findByText("Something went wrong");

    expect(toastPanel.parentElement?.parentElement?.style.animationName).toBe("toast-keyframes");
    expect(toastPanel.parentElement?.parentElement?.style.animationDuration).toBe("0.3s");
  });
});