import { describe, expect, it } from "vitest";
import {
  adjacentStatus,
  ASSIGNEE_MAX,
  createTask,
  dueStateOf,
  isPriority,
  isValidDueDate,
  moveTask,
  tasksIn,
  TITLE_MAX,
  todayString,
  updateTask,
  validateTask,
  type Status,
  type Task,
} from "./tasks";

function task(id: string, status: Status): Task {
  return {
    id,
    title: id,
    description: "",
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
    assignee: "",
    priority: "medium",
    dueDate: "",
  };
}

const ids = (list: readonly Task[]) => list.map((t) => `${t.id}:${t.status}`);

describe("validateTask", () => {
  it("requires a non-blank title", () => {
    expect(validateTask({ title: "   ", description: "" })).toMatch("タイトル");
  });

  it("rejects titles over the limit", () => {
    expect(validateTask({ title: "a".repeat(TITLE_MAX + 1), description: "" })).not.toBeNull();
  });

  it("accepts a title with an empty description", () => {
    expect(validateTask({ title: "買い物", description: "" })).toBeNull();
  });
});

describe("createTask", () => {
  it("trims input and defaults to 未着手, 中, unassigned, no due date", () => {
    const now = new Date("2026-09-29T00:00:00.000Z");
    expect(createTask({ title: "  書く ", description: " 下書き \n" }, { id: "x", now })).toEqual({
      id: "x",
      title: "書く",
      description: "下書き",
      status: "todo",
      createdAt: "2026-09-29T00:00:00.000Z",
      assignee: "",
      priority: "medium",
      dueDate: "",
    });
  });

  it("keeps priority and due date and trims the assignee", () => {
    const t = createTask(
      { title: "a", description: "", assignee: "  田中 ", priority: "high", dueDate: "2026-10-01" },
      { id: "x" },
    );
    expect(t).toMatchObject({ assignee: "田中", priority: "high", dueDate: "2026-10-01" });
  });

  it("generates unique ids", () => {
    const a = createTask({ title: "a", description: "" });
    const b = createTask({ title: "b", description: "" });
    expect(a.id).not.toBe(b.id);
  });
});

describe("validateTask details", () => {
  it("rejects an assignee over the limit", () => {
    const long = "あ".repeat(ASSIGNEE_MAX + 1);
    expect(validateTask({ title: "a", description: "", assignee: long })).toMatch("担当者");
  });

  it("rejects a malformed or impossible due date", () => {
    expect(validateTask({ title: "a", description: "", dueDate: "2026/10/01" })).toMatch("期限");
    expect(validateTask({ title: "a", description: "", dueDate: "2026-02-30" })).toMatch("期限");
  });

  it("accepts valid details and treats them as optional", () => {
    expect(
      validateTask({ title: "a", description: "", assignee: "田中", dueDate: "2026-10-01" }),
    ).toBeNull();
    expect(validateTask({ title: "a", description: "" })).toBeNull();
  });
});

describe("isPriority", () => {
  it("accepts the defined priorities and rejects anything else", () => {
    expect(isPriority("low")).toBe(true);
    expect(isPriority("high")).toBe(true);
    expect(isPriority("urgent")).toBe(false);
    expect(isPriority(2)).toBe(false);
  });
});

describe("moveTask", () => {
  const board = [task("a", "todo"), task("b", "todo"), task("c", "doing"), task("d", "done")];

  it("moves a task to the bottom of another column", () => {
    const next = moveTask(board, "a", "doing");
    expect(ids(tasksIn(next, "doing"))).toEqual(["c:doing", "a:doing"]);
    expect(ids(tasksIn(next, "todo"))).toEqual(["b:todo"]);
  });

  it("inserts above the task it was dropped on", () => {
    const next = moveTask(board, "d", "todo", "b");
    expect(ids(tasksIn(next, "todo"))).toEqual(["a:todo", "d:todo", "b:todo"]);
  });

  it("reorders within the same column", () => {
    const next = moveTask(board, "b", "todo", "a");
    expect(ids(tasksIn(next, "todo"))).toEqual(["b:todo", "a:todo"]);
  });

  it("moves into an empty column", () => {
    const next = moveTask([task("a", "todo")], "a", "done");
    expect(ids(next)).toEqual(["a:done"]);
  });

  it("ignores a beforeId that belongs to a different column", () => {
    const next = moveTask(board, "a", "done", "c");
    expect(ids(tasksIn(next, "done"))).toEqual(["d:done", "a:done"]);
  });

  it("returns the same array when nothing changes", () => {
    expect(moveTask(board, "b", "todo")).toBe(board);
    expect(moveTask(board, "a", "todo", "a")).toBe(board);
    expect(moveTask(board, "missing", "done")).toBe(board);
  });

  it("does not mutate the input", () => {
    const copy = structuredClone(board);
    moveTask(board, "a", "done");
    expect(board).toEqual(copy);
  });
});

describe("updateTask", () => {
  const board = [task("a", "todo"), task("b", "doing")];

  it("replaces the editable fields but keeps id, status and createdAt", () => {
    const next = updateTask(board, "a", {
      title: "  新タイトル ",
      description: " 詳細 ",
      assignee: " 田中 ",
      priority: "high",
      dueDate: "2026-10-01",
    });
    const a = next.find((t) => t.id === "a")!;
    expect(a).toEqual({
      id: "a",
      status: "todo",
      createdAt: "2026-01-01T00:00:00.000Z",
      title: "新タイトル",
      description: "詳細",
      assignee: "田中",
      priority: "high",
      dueDate: "2026-10-01",
    });
    expect(next.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("returns the same array when the values do not change", () => {
    const same = updateTask(board, "a", {
      title: "a",
      description: "",
      assignee: "",
      priority: "medium",
      dueDate: "",
    });
    expect(same).toBe(board);
  });

  it("returns the same array when the id is unknown", () => {
    expect(updateTask(board, "missing", { title: "x", description: "" })).toBe(board);
  });

  it("does not mutate the input array", () => {
    const copy = structuredClone(board);
    updateTask(board, "a", { title: "z", description: "" });
    expect(board).toEqual(copy);
  });
});

describe("createTask without crypto.randomUUID", () => {
  it("still generates unique ids in an insecure context", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const a = createTask({ title: "a", description: "" });
      const b = createTask({ title: "b", description: "" });
      expect(a.id).toMatch(/^[0-9a-f]{32}$/);
      expect(a.id).not.toBe(b.id);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});

describe("isValidDueDate", () => {
  it("accepts real dates and rejects malformed or impossible ones", () => {
    expect(isValidDueDate("2026-10-01")).toBe(true);
    expect(isValidDueDate("2028-02-29")).toBe(true);
    expect(isValidDueDate("2026-02-30")).toBe(false);
    expect(isValidDueDate("2026-13-01")).toBe(false);
    expect(isValidDueDate("abc")).toBe(false);
    expect(isValidDueDate("2026-1-1")).toBe(false);
    expect(isValidDueDate("")).toBe(false);
  });
});

describe("todayString", () => {
  it("formats the local date with zero padding", () => {
    expect(todayString(new Date(2026, 9, 1, 12, 0))).toBe("2026-10-01");
    expect(todayString(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("uses the local calendar date, not UTC", () => {
    // Just after local midnight: in JST this is still 2025-12-31 in UTC.
    expect(todayString(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
    // Just before local midnight: west of UTC this is already the next day in UTC.
    expect(todayString(new Date(2025, 11, 31, 23, 30))).toBe("2025-12-31");
  });

  it("defaults to now", () => {
    expect(todayString()).toBe(todayString(new Date()));
  });
});

describe("dueStateOf", () => {
  const today = "2026-10-01";

  it("is none without a due date", () => {
    expect(dueStateOf("", today)).toBe("none");
  });

  it("classifies yesterday, today and tomorrow", () => {
    expect(dueStateOf("2026-09-30", today)).toBe("overdue");
    expect(dueStateOf("2026-10-01", today)).toBe("today");
    expect(dueStateOf("2026-10-02", today)).toBe("upcoming");
  });

  it("handles month and year boundaries", () => {
    expect(dueStateOf("2026-01-31", "2026-02-01")).toBe("overdue");
    expect(dueStateOf("2026-02-01", "2026-01-31")).toBe("upcoming");
    expect(dueStateOf("2025-12-31", "2026-01-01")).toBe("overdue");
    expect(dueStateOf("2027-01-01", "2026-12-31")).toBe("upcoming");
    expect(dueStateOf("2026-09-30", "2026-10-01")).toBe("overdue");
  });

  it("works with todayString output", () => {
    const now = new Date(2026, 0, 1, 0, 30);
    expect(dueStateOf("2026-01-01", todayString(now))).toBe("today");
    expect(dueStateOf("2025-12-31", todayString(now))).toBe("overdue");
  });
});

describe("adjacentStatus", () => {
  it("walks the columns and stops at the ends", () => {
    expect(adjacentStatus("todo", 1)).toBe("doing");
    expect(adjacentStatus("doing", 1)).toBe("hold");
    expect(adjacentStatus("hold", 1)).toBe("done");
    expect(adjacentStatus("done", -1)).toBe("hold");
    expect(adjacentStatus("todo", -1)).toBeNull();
    expect(adjacentStatus("done", 1)).toBeNull();
  });
});
