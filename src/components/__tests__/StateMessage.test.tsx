import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlertTriangle, Inbox } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";

describe("StateMessage", () => {
  it("renders an empty state with icon, title and description", () => {
    render(
      <StateMessage
        tone="empty"
        icon={<Inbox data-testid="empty-icon" />}
        title="Nothing here yet"
        description="Once residents file their first reports, this space will fill up."
      />,
    );

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Once residents file their first reports, this space will fill up.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
  });

  it("renders an error state with alert role", () => {
    render(
      <StateMessage
        tone="error"
        icon={<AlertTriangle data-testid="error-icon" />}
        title="Could not load leaderboard"
        description="Something went wrong fetching the latest scores."
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Could not load leaderboard")).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong fetching the latest scores."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("error-icon")).toBeInTheDocument();
  });

  it("does not render a retry button when onRetry is omitted", () => {
    render(
      <StateMessage
        tone="error"
        icon={<AlertTriangle />}
        title="Error"
        description="No retry available."
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a retry button that calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(
      <StateMessage
        tone="error"
        icon={<AlertTriangle />}
        title="Error"
        description="Click to retry."
        onRetry={onRetry}
      />,
    );

    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a retrying spinner and disables the button while retrying", () => {
    const onRetry = vi.fn();
    render(
      <StateMessage
        tone="error"
        icon={<AlertTriangle />}
        title="Error"
        description="Retry in progress."
        onRetry={onRetry}
        retrying
      />,
    );

    const button = screen.getByRole("button", { name: /retrying/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("applies error styling to the container", () => {
    const { container } = render(
      <StateMessage
        tone="error"
        icon={<AlertTriangle />}
        title="Error"
        description="Styled as error."
      />,
    );

    expect(container.firstChild).toHaveClass("border-rose-400/30");
    expect(container.firstChild).toHaveClass("bg-rose-500/[0.06]");
  });

  it("applies empty styling to the container", () => {
    const { container } = render(
      <StateMessage
        tone="empty"
        icon={<Inbox />}
        title="Empty"
        description="Styled as empty."
      />,
    );

    expect(container.firstChild).toHaveClass("border-white/10");
    expect(container.firstChild).toHaveClass("bg-white/[0.02]");
  });
});
