import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/tasks";
import { Column } from "./Column";
import { TASK_DRAG_TYPE } from "./TaskCard";

const base = { createdAt: "", assignee: "", priority: "medium", dueDate: "" } as const;
const tasks: Task[] = [
  { id: "a", title: "A", description: "", status: "doing", ...base },
  { id: "b", title: "B", description: "詳細", status: "doing", ...base },
];

/** jsdom has no DataTransfer, so hand the drag events a minimal stand-in. */
function dataTransfer(data: Record<string, string>) {
  return {
    types: Object.keys(data),
    getData: (type: string) => data[type] ?? "",
    dropEffect: "none",
  };
}

describe("Column", () => {
  it("renders its heading, count and cards in order", () => {
    render(<Column status="doing" tasks={tasks} onMove={() => {}} />);
    const col = screen.getByRole("region", { name: "進行中" });
    expect(within(col).getByText("#2")).toBeInTheDocument();
    expect(within(col).getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual([
      "A",
      "B",
    ]);
    expect(within(col).getByText("詳細")).toBeInTheDocument();
  });

  it("shows a loading state and an empty state", () => {
    const { rerender } = render(<Column status="done" tasks={null} onMove={() => {}} />);
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
    rerender(<Column status="done" tasks={[]} onMove={() => {}} />);
    expect(screen.getByText(/ここへドラッグ/)).toBeInTheDocument();
  });

  it("appends a task dropped on empty column space", () => {
    const onMove = vi.fn();
    render(<Column status="doing" tasks={tasks} onMove={onMove} />);
    const col = screen.getByRole("region", { name: "進行中" });

    fireEvent.drop(col, { dataTransfer: dataTransfer({ [TASK_DRAG_TYPE]: "x" }) });
    expect(onMove).toHaveBeenCalledWith("x", "doing", null);
  });

  it("inserts above the card it was dropped on", () => {
    const onMove = vi.fn();
    render(<Column status="doing" tasks={tasks} onMove={onMove} />);

    fireEvent.drop(screen.getByText("B"), { dataTransfer: dataTransfer({ [TASK_DRAG_TYPE]: "x" }) });
    expect(onMove).toHaveBeenCalledWith("x", "doing", "b");
  });

  it("highlights while a task is dragged over, and ignores unrelated drags", () => {
    const onMove = vi.fn();
    render(<Column status="todo" tasks={[]} onMove={onMove} />);
    const col = screen.getByRole("region", { name: "未着手" });

    fireEvent.dragOver(col, { dataTransfer: dataTransfer({ "text/plain": "hello" }) });
    expect(col.className).not.toMatch("inset");

    fireEvent.dragOver(col, { dataTransfer: dataTransfer({ [TASK_DRAG_TYPE]: "x" }) });
    expect(col.className).toMatch("inset");

    fireEvent.drop(col, { dataTransfer: dataTransfer({ "text/plain": "hello" }) });
    expect(onMove).not.toHaveBeenCalled();
    expect(col.className).not.toMatch("inset");
  });
});
