import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ALL, EMPTY_FILTER, UNASSIGNED, type TaskFilter } from "@/lib/filter";
import { FilterBar } from "./FilterBar";

function setup(filter: TaskFilter = EMPTY_FILTER, assignees: string[] = ["佐藤", "田中"]) {
  const onChange = vi.fn();
  render(<FilterBar filter={filter} onChange={onChange} assignees={assignees} />);
  return { onChange, user: userEvent.setup() };
}

const optionLabels = (select: HTMLElement) =>
  Array.from((select as HTMLSelectElement).options).map((o) => o.textContent);

describe("FilterBar", () => {
  it("offers labelled selects for assignee, priority and due date", () => {
    setup();
    expect(optionLabels(screen.getByLabelText("担当者"))).toEqual([
      "すべて",
      "未割り当て",
      "佐藤",
      "田中",
    ]);
    expect(optionLabels(screen.getByLabelText("優先度"))).toEqual(["すべて", "低", "中", "高"]);
    expect(optionLabels(screen.getByLabelText("期限"))).toEqual([
      "すべて",
      "期限切れ",
      "今日まで",
      "期限なし",
    ]);
  });

  it("reports the chosen due condition and keeps the other fields", async () => {
    const start: TaskFilter = { ...EMPTY_FILTER, query: "請求", assignee: UNASSIGNED };
    const { onChange, user } = setup(start);
    await user.selectOptions(screen.getByLabelText("期限"), "今日まで");
    expect(onChange).toHaveBeenLastCalledWith({ ...start, due: "by-today" });
  });

  it("shows 条件をクリア when only the due filter is set, and clears everything", async () => {
    const { onChange, user } = setup({ ...EMPTY_FILTER, due: "none" });
    expect(screen.getByLabelText("期限")).toHaveValue("none");
    await user.click(screen.getByRole("button", { name: "条件をクリア" }));
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_FILTER);
  });

  it("hides 条件をクリア when nothing is filtered", () => {
    setup({ ...EMPTY_FILTER, due: ALL });
    expect(screen.queryByRole("button", { name: "条件をクリア" })).not.toBeInTheDocument();
  });

  it("keeps a selected assignee in the menu after it disappears from the board", () => {
    setup({ ...EMPTY_FILTER, assignee: "山田" }, ["佐藤"]);
    expect(screen.getByLabelText("担当者")).toHaveValue("山田");
  });
});
