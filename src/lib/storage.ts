import { isPriority, isStatus, isValidDueDate, type Task } from "./tasks";

export const STORAGE_KEY = "taskboard.tasks.v1";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * A record has the fields present since the first version. assignee/priority/dueDate are
 * checked by normalizeTask instead, so tasks saved before those existed still load.
 */
function hasTaskCore(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.description === "string" &&
    typeof v.createdAt === "string" &&
    isStatus(v.status)
  );
}

/** Fills in fields added after v1, falling back to safe defaults for missing or wrong types. */
function normalizeTask(v: Record<string, unknown>): Task {
  return {
    id: v.id as string,
    title: v.title as string,
    description: v.description as string,
    status: v.status as Task["status"],
    createdAt: v.createdAt as string,
    // trimmed like createTask does, so a name can never collide with filter.ts's " all" values
    assignee: typeof v.assignee === "string" ? v.assignee.trim() : "",
    priority: isPriority(v.priority) ? v.priority : "medium",
    // A non-date ("abc", "2026-02-30") would still compare as overdue/upcoming in dueStateOf.
    dueDate: typeof v.dueDate === "string" && isValidDueDate(v.dueDate) ? v.dueDate : "",
  };
}

/** Reads saved tasks, dropping anything malformed. Never throws. */
export function loadTasks(storage: KeyValueStorage): Task[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only the first of duplicate ids: moveTask/updateTask address tasks by id, and moving
    // one copy would silently drop the others (React keys would collide too).
    const seen = new Set<string>();
    return parsed.filter(hasTaskCore).flatMap((v) => {
      const id = v.id as string;
      if (seen.has(id)) return [];
      seen.add(id);
      return [normalizeTask(v)];
    });
  } catch {
    return [];
  }
}

/** Persists tasks. Returns false when the browser refuses (quota, private mode…). */
export function saveTasks(storage: KeyValueStorage, tasks: readonly Task[]): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}
