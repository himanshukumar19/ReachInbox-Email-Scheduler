import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ComposeModal from "./ComposeModal";

describe("ComposeModal defensive recipient import", () => {
  it("renders zero-state guard and disabled Schedule button", () => {
    render(<ComposeModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/Add at least one valid recipient/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Schedule/i })).toBeDisabled();
  });

  it("shows delay input defaulting to 1000", () => {
    render(<ComposeModal open={true} onClose={() => {}} />);
    const input = screen.getByLabelText(/Delay between emails/i) as HTMLInputElement;
    expect(input.value).toBe("1000");
  });

  it("exposes recipients length for conditional UI", () => {
    render(<ComposeModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/0 addresses detected/i)).toBeInTheDocument();
  });
});
