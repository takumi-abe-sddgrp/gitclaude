import { beforeEach, describe, expect, it } from "vitest";
import { loadTasks, saveTasks, STORAGE_KEY } from "./storage";
import type { Task } from "./tasks";

const sample: Task = {
  id: "1",
  title: "テスト",
  description: "説明",
  status: "doing",
  createdAt: "2026-09-29T00:00:00.000Z",
  assignee: "田中",
  priority: "high",
  dueDate: "2026-10-01",
};

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips tasks", () => {
    expect(saveTasks(localStorage, [sample])).toBe(true);
    expect(loadTasks(localStorage)).toEqual([sample]);
  });

  it("returns an empty list when nothing is saved", () => {
    expect(loadTasks(localStorage)).toEqual([]);
  });

  it("survives corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadTasks(localStorage)).toEqual([]);
  });

  it("drops malformed entries but keeps valid ones", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([sample, { id: 2 }, { ...sample, id: "3", status: "archived" }, null]),
    );
    expect(loadTasks(localStorage)).toEqual([sample]);
  });

  it("fills defaults for tasks saved before assignee/priority/due date existed", () => {
    const legacy = {
      id: "9",
      title: "旧タスク",
      description: "",
      status: "todo",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacy]));
    expect(loadTasks(localStorage)).toEqual([
      { ...legacy, assignee: "", priority: "medium", dueDate: "" },
    ]);
  });

  it("falls back to safe values when the new fields are the wrong type", () => {
    const bad = {
      id: "10",
      title: "壊れた詳細",
      description: "",
      status: "todo",
      createdAt: "2026-01-01T00:00:00.000Z",
      assignee: 5,
      priority: "urgent",
      dueDate: null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([bad]));
    expect(loadTasks(localStorage)).toEqual([
      { ...bad, assignee: "", priority: "medium", dueDate: "" },
    ]);
  });

  it("clears due dates that are not real YYYY-MM-DD dates", () => {
    const stored = ["abc", "2026-02-30", "2026/10/01", "2026-10-01T00:00", " 2026-10-01"].map(
      (dueDate, i) => ({ ...sample, id: `d${i}`, dueDate }),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, sample]));
    const loaded = loadTasks(localStorage);
    expect(loaded.map((t) => t.dueDate)).toEqual(["", "", "", "", "", "2026-10-01"]);
    expect(loaded.map((t) => t.id)).toEqual(["d0", "d1", "d2", "d3", "d4", "1"]);
  });

  it("trims assignees, as createTask does", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...sample, assignee: "  all " }]));
    expect(loadTasks(localStorage)[0].assignee).toBe("all");
  });

  it("keeps only the first task of a duplicated id", () => {
    const dup = { ...sample, title: "重複" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([sample, dup, { ...sample, id: "2" }]));
    expect(loadTasks(localStorage)).toEqual([sample, { ...sample, id: "2" }]);
  });

  it("returns an empty list when the saved value is not an array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: [sample] }));
    expect(loadTasks(localStorage)).toEqual([]);
  });

  it("returns an empty list when reading throws", () => {
    const broken = {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      setItem: () => {},
    };
    expect(loadTasks(broken)).toEqual([]);
  });

  it("reports failure when the browser refuses to save", () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    expect(saveTasks(full, [sample])).toBe(false);
  });
});

describe("storage with 保留", () => {
  beforeEach(() => localStorage.clear());

  it("keeps tasks in the hold column", () => {
    const held: Task = { ...sample, id: "h", status: "hold" };
    saveTasks(localStorage, [held]);
    expect(loadTasks(localStorage)).toEqual([held]);
  });
});
