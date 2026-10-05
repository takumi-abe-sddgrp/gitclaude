import { expect, it } from "vitest";
import { createTaskStore } from "./taskStore";
import { createTask, moveTask } from "./tasks";

it("no-op update after a failed save reports success", () => {
  const data = new Map<string, string>();
  let full = false;
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (full) throw new Error("quota");
      data.set(k, v);
    },
  } as unknown as Storage;
  const store = createTaskStore(() => storage);
  const a = createTask({ title: "A", description: "" }, { id: "a" });
  store.update(() => [a]);
  full = true;
  const b = createTask({ title: "B", description: "" }, { id: "b" });
  expect(store.update((l) => [...l, b])).toBe(false); // save fails -> error shown
  expect(store.update((l) => moveTask(l, "a", "todo", "a"))).toBe(true); // no-op -> error cleared
  expect(data.get("taskboard.tasks.v1")).not.toContain("\"b\""); // B is still unsaved
});
