import { describe, expect, it } from "vitest";
import {
  ALL,
  assigneesOf,
  EMPTY_FILTER,
  filterTasks,
  isFilterActive,
  UNASSIGNED,
  type TaskFilter,
} from "./filter";
import type { Task } from "./tasks";

function task(id: string, fields: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    description: "",
    status: "todo",
    createdAt: "2026-01-01T00:00:00.000Z",
    assignee: "",
    priority: "medium",
    dueDate: "",
    ...fields,
  };
}

const board = [
  task("a", { title: "議事録をまとめる", description: "定例の分", assignee: "田中", priority: "high" }),
  task("b", { title: "Release notes", description: "v2 の変更点", assignee: "佐藤" }),
  task("c", { title: "買い出し", priority: "low" }),
  task("d", { title: "設計レビュー", description: "議事録も残す", assignee: "田中", status: "done" }),
];

const TODAY = "2026-10-01";

const ids = (list: readonly Task[]) => list.map((t) => t.id);
const f = (patch: Partial<TaskFilter>): TaskFilter => ({ ...EMPTY_FILTER, ...patch });

describe("filterTasks", () => {
  it("returns the same array when no filter is active", () => {
    expect(filterTasks(board, EMPTY_FILTER, TODAY)).toBe(board);
    expect(filterTasks(board, f({ query: "   " }), TODAY)).toBe(board);
  });

  it("searches both title and description", () => {
    expect(ids(filterTasks(board, f({ query: "議事録" }), TODAY))).toEqual(["a", "d"]);
  });

  it("ignores case and full/half width", () => {
    expect(ids(filterTasks(board, f({ query: "RELEASE" }), TODAY))).toEqual(["b"]);
    expect(ids(filterTasks(board, f({ query: "Ｖ２" }), TODAY))).toEqual(["b"]);
  });

  it("requires every space-separated word, including full-width spaces", () => {
    expect(ids(filterTasks(board, f({ query: "議事録　定例" }), TODAY))).toEqual(["a"]);
    expect(ids(filterTasks(board, f({ query: "議事録 存在しない" }), TODAY))).toEqual([]);
  });

  it("filters by assignee, including unassigned", () => {
    expect(ids(filterTasks(board, f({ assignee: "田中" }), TODAY))).toEqual(["a", "d"]);
    expect(ids(filterTasks(board, f({ assignee: UNASSIGNED }), TODAY))).toEqual(["c"]);
  });

  it("treats people named all / unassigned as ordinary names", () => {
    const named = [
      task("x", { assignee: "all" }),
      task("y", { assignee: "unassigned" }),
      task("z"),
    ];
    expect(ids(filterTasks(named, f({ assignee: "all" }), TODAY))).toEqual(["x"]);
    expect(ids(filterTasks(named, f({ assignee: "unassigned" }), TODAY))).toEqual(["y"]);
    expect(ids(filterTasks(named, f({ assignee: UNASSIGNED }), TODAY))).toEqual(["z"]);
    expect(isFilterActive(f({ assignee: "all" }))).toBe(true);
  });

  it("filters by priority", () => {
    expect(ids(filterTasks(board, f({ priority: "low" }), TODAY))).toEqual(["c"]);
  });

  it("combines search, assignee and priority", () => {
    expect(ids(filterTasks(board, f({ query: "議事録", assignee: "田中", priority: "high" }), TODAY))).toEqual(
      ["a"],
    );
  });
});

describe("filterTasks by due date", () => {
  const dated = [
    task("past", { dueDate: "2026-09-30", assignee: "田中", title: "請求書を送る" }),
    task("today", { dueDate: TODAY, assignee: "佐藤", title: "請求書を確認" }),
    task("future", { dueDate: "2026-10-02", assignee: "田中" }),
    task("nodue", { assignee: "田中", title: "請求書の控え" }),
    task("longago", { dueDate: "2025-12-31", priority: "high" }),
  ];

  it("keeps everything for すべて", () => {
    expect(filterTasks(dated, f({ due: ALL }), TODAY)).toBe(dated);
  });

  it("期限切れ keeps only dates before today", () => {
    expect(ids(filterTasks(dated, f({ due: "overdue" }), TODAY))).toEqual(["past", "longago"]);
  });

  it("今日まで keeps overdue and due-today tasks", () => {
    expect(ids(filterTasks(dated, f({ due: "by-today" }), TODAY))).toEqual([
      "past",
      "today",
      "longago",
    ]);
  });

  it("期限なし keeps only tasks without a due date", () => {
    expect(ids(filterTasks(dated, f({ due: "none" }), TODAY))).toEqual(["nodue"]);
  });

  it("follows the today argument across day, month and year boundaries", () => {
    expect(ids(filterTasks(dated, f({ due: "overdue" }), "2026-10-02"))).toEqual([
      "past",
      "today",
      "longago",
    ]);
    expect(ids(filterTasks(dated, f({ due: "by-today" }), "2026-10-02"))).toEqual([
      "past",
      "today",
      "future",
      "longago",
    ]);
    expect(ids(filterTasks(dated, f({ due: "by-today" }), "2026-09-30"))).toEqual([
      "past",
      "longago",
    ]);
    expect(ids(filterTasks(dated, f({ due: "overdue" }), "2026-01-01"))).toEqual(["longago"]);
    expect(ids(filterTasks(dated, f({ due: "overdue" }), "2025-12-31"))).toEqual([]);
  });

  it("combines with search, assignee and priority", () => {
    expect(ids(filterTasks(dated, f({ due: "by-today", assignee: "田中" }), TODAY))).toEqual([
      "past",
    ]);
    expect(ids(filterTasks(dated, f({ due: "by-today", query: "請求書" }), TODAY))).toEqual([
      "past",
      "today",
    ]);
    expect(ids(filterTasks(dated, f({ due: "none", query: "請求書" }), TODAY))).toEqual(["nodue"]);
    expect(ids(filterTasks(dated, f({ due: "overdue", priority: "high" }), TODAY))).toEqual([
      "longago",
    ]);
    expect(ids(filterTasks(dated, f({ due: "overdue", assignee: UNASSIGNED }), TODAY))).toEqual([
      "longago",
    ]);
  });

  it("never counts done tasks as overdue or due today, but keeps them under 期限なし", () => {
    const withDone = [
      ...dated,
      task("donePast", { dueDate: "2026-09-30", status: "done" }),
      task("doneToday", { dueDate: TODAY, status: "done" }),
      task("doneNoDue", { status: "done" }),
    ];
    expect(ids(filterTasks(withDone, f({ due: "overdue" }), TODAY))).toEqual(["past", "longago"]);
    expect(ids(filterTasks(withDone, f({ due: "by-today" }), TODAY))).toEqual([
      "past",
      "today",
      "longago",
    ]);
    expect(ids(filterTasks(withDone, f({ due: "none" }), TODAY))).toEqual(["nodue", "doneNoDue"]);
  });

  it("does not modify the input array", () => {
    const copy = [...dated];
    filterTasks(dated, f({ due: "overdue" }), TODAY);
    expect(dated).toEqual(copy);
  });
});

describe("isFilterActive", () => {
  it("is false only for the empty filter", () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive(f({ due: "none" }))).toBe(true);
    expect(isFilterActive(f({ due: ALL }))).toBe(false);
    expect(isFilterActive(f({ priority: "high" }))).toBe(true);
    expect(isFilterActive(f({ assignee: UNASSIGNED }))).toBe(true);
    expect(isFilterActive(f({ assignee: ALL, query: "x" }))).toBe(true);
  });
});

describe("assigneesOf", () => {
  it("lists distinct, non-empty assignees in sorted order", () => {
    expect(assigneesOf([...board, task("e", { assignee: "Aoki" })])).toEqual(
      ["Aoki", "佐藤", "田中"].sort((x, y) => x.localeCompare(y, "ja")),
    );
  });
});
