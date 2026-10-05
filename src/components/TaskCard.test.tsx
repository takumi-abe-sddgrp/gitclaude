import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Status, Task } from "@/lib/tasks";
import { TASK_DRAG_TYPE, TaskCard } from "./TaskCard";

function task(status: Status, extra: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "設計レビュー",
    description: "",
    status,
    createdAt: "",
    assignee: "",
    priority: "medium",
    dueDate: "",
    ...extra,
  };
}

describe("TaskCard", () => {
  it("shows the assignee, priority, and due date when set", () => {
    render(
      <TaskCard
        task={task("todo", {
          assignee: "田中",
          priority: "high",
          dueDate: "2026-10-01",
        })}
        onMove={() => {}}
      />,
    );
    expect(screen.getByText("田中")).toBeInTheDocument();
    expect(screen.getByText("高")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("puts its id on the drag payload", () => {
    render(<TaskCard task={task("todo")} onMove={() => {}} />);
    const setData = vi.fn();
    const card = screen.getByRole("article", { name: "設計レビュー" });

    fireEvent.dragStart(card, { dataTransfer: { setData, effectAllowed: "" } });
    expect(setData).toHaveBeenCalledWith(TASK_DRAG_TYPE, "t1");
    expect(card).toHaveAttribute("draggable", "true");
  });

  it("moves to neighbouring columns with the arrow buttons", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<TaskCard task={task("doing")} onMove={onMove} />);

    await user.click(screen.getByRole("button", { name: "保留へ進める" }));
    await user.click(screen.getByRole("button", { name: "未着手へ戻す" }));
    expect(onMove.mock.calls).toEqual([["hold"], ["todo"]]);
  });

  it("disables the arrow that would leave the board", () => {
    render(<TaskCard task={task("done")} onMove={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("names the disabled arrow at the board edge", () => {
    const { unmount } = render(<TaskCard task={task("todo")} onMove={() => {}} />);
    expect(screen.getByRole("button", { name: "前の列はありません" })).toBeDisabled();
    unmount();
    render(<TaskCard task={task("done")} onMove={() => {}} />);
    expect(screen.getByRole("button", { name: "次の列はありません" })).toBeDisabled();
  });

  it("returns focus to the edit button after saving or cancelling", async () => {
    const user = userEvent.setup();
    render(<TaskCard task={task("todo")} onMove={() => {}} onEdit={() => {}} />);

    await user.click(screen.getByRole("button", { name: "タスクを編集" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.getByRole("button", { name: "タスクを編集" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "タスクを編集" }));
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByRole("button", { name: "タスクを編集" })).toHaveFocus();
  });

  it("shows no edit button when onEdit is omitted", () => {
    render(<TaskCard task={task("todo")} onMove={() => {}} />);
    expect(screen.queryByRole("button", { name: "タスクを編集" })).not.toBeInTheDocument();
  });

  it("opens a prefilled form and saves edited fields", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TaskCard
        task={task("todo", {
          title: "旧タイトル",
          assignee: "田中",
          priority: "low",
        })}
        onMove={() => {}}
        onEdit={onEdit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "タスクを編集" }));
    expect(screen.getByLabelText("担当者（任意）")).toHaveValue("田中");

    const title = screen.getByLabelText("タイトル");
    await user.clear(title);
    await user.type(title, "新タイトル");
    await user.selectOptions(screen.getByLabelText("優先度"), "high");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onEdit).toHaveBeenCalledWith({
      title: "新タイトル",
      description: "",
      assignee: "田中",
      priority: "high",
      dueDate: "",
    });
  });
});

describe("TaskCard due date", () => {
  const TODAY = "2026-10-01";
  const due = () => screen.getByTitle("期限");

  it("flags an overdue task in text, not just colour", () => {
    render(
      <TaskCard task={task("doing", { dueDate: "2026-09-30" })} onMove={() => {}} today={TODAY} />,
    );
    expect(due()).toHaveTextContent("〆 2026/09/30（期限切れ）");
    expect(due()).toHaveAttribute("data-due-state", "overdue");
    expect(due().className).toMatch("text-high");
  });

  it("flags a task due today", () => {
    render(<TaskCard task={task("todo", { dueDate: TODAY })} onMove={() => {}} today={TODAY} />);
    expect(due()).toHaveTextContent("〆 2026/10/01（今日）");
    expect(due()).toHaveAttribute("data-due-state", "today");
    expect(due().className).toMatch("text-warn");
  });

  it("leaves a future due date plain", () => {
    render(
      <TaskCard task={task("hold", { dueDate: "2026-10-02" })} onMove={() => {}} today={TODAY} />,
    );
    expect(due().textContent).toBe("〆 2026/10/02");
    expect(due()).toHaveAttribute("data-due-state", "upcoming");
    expect(due().className).toMatch("text-muted");
  });

  it("shows nothing without a due date", () => {
    render(<TaskCard task={task("todo")} onMove={() => {}} today={TODAY} />);
    expect(screen.queryByTitle("期限")).not.toBeInTheDocument();
    expect(screen.queryByText(/期限切れ|今日/)).not.toBeInTheDocument();
  });

  it("does not flag tasks in the done column", () => {
    render(
      <TaskCard task={task("done", { dueDate: "2026-09-01" })} onMove={() => {}} today={TODAY} />,
    );
    expect(due().textContent).toBe("〆 2026/09/01");
    expect(due().className).not.toMatch("text-high");
  });

  it("uses the real date when today is omitted", () => {
    render(<TaskCard task={task("todo", { dueDate: "2000-01-01" })} onMove={() => {}} />);
    expect(due()).toHaveTextContent("（期限切れ）");
  });
});
