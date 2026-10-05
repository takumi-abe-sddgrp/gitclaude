import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// useTasks keeps one store per module instance, so a fresh import stands in for a page reload:
// the new store starts with an empty cache and has to read everything back from localStorage.
async function loadBoard() {
  vi.resetModules();
  const { Board } = await import("./Board");
  return Board;
}

describe("Board after a reload", () => {
  beforeEach(() => localStorage.clear());

  it("keeps tasks with their column, assignee, priority and due date", async () => {
    const user = userEvent.setup();
    let Board = await loadBoard();
    const { unmount } = render(<Board />);

    await user.click(screen.getByRole("button", { name: "新規タスク" }));
    const form = within(screen.getByRole("form", { name: "タスクを追加" }));
    await user.type(form.getByLabelText("タイトル"), "再読み込みテスト");
    await user.type(form.getByLabelText("担当者（任意）"), "中村");
    await user.selectOptions(form.getByLabelText("優先度"), "high");
    fireEvent.change(form.getByLabelText("期限（任意）"), { target: { value: "2026-10-15" } });
    await user.click(form.getByRole("button", { name: /未着手に追加/ }));
    await user.click(screen.getByRole("button", { name: "進行中へ進める" }));
    unmount();

    Board = await loadBoard();
    render(<Board />);

    const card = within(screen.getByRole("region", { name: "進行中" })).getByRole("article", {
      name: "再読み込みテスト",
    });
    expect(within(card).getByText("中村")).toBeInTheDocument();
    expect(within(card).getByText("高")).toBeInTheDocument();
    expect(within(card).getByText(/2026\/10\/15/)).toBeInTheDocument();
  });
});
