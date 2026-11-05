import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorldSheet } from "@/components/WorldSheet";

describe("WorldSheet", () => {
  it("closes from its own button and from Escape", () => {
    const onClose = vi.fn();
    render(<WorldSheet onClose={onClose}><p>küre</p></WorldSheet>);

    fireEvent.click(screen.getByRole("button", { name: "Dünya haritasını kapat" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("is a non-modal panel, so the memory cards stay usable behind it", () => {
    render(<WorldSheet onClose={() => {}}><p>küre</p></WorldSheet>);

    const panel = screen.getByRole("region", { name: "Anıların dünyası" });

    expect(panel.getAttribute("aria-modal")).toBeNull();
    expect(screen.getByText("küre")).toBeInTheDocument();
  });
});
