export const STATUSES = ["todo", "doing", "hold", "done"] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  todo: "未着手",
  doing: "進行中",
  hold: "保留",
  done: "完了",
};

/** Priorities in ascending urgency; the order is the select order in the add form. */
export const PRIORITIES = ["low", "medium", "high"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdAt: string;
  /** Free-text owner; "" when unassigned. */
  assignee: string;
  priority: Priority;
  /** "YYYY-MM-DD", or "" when there is no due date. */
  dueDate: string;
};

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 4000;
export const ASSIGNEE_MAX = 60;

export type NewTaskInput = {
  title: string;
  description: string;
  /** Optional so title-only callers stay valid; createTask fills the defaults. */
  assignee?: string;
  priority?: Priority;
  dueDate?: string;
};

/** True for a real calendar date written as YYYY-MM-DD (so 2026-02-30 is rejected). */
export function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Anchor to UTC ("Z") so the round-trip check is timezone-independent: without it, local
  // midnight shifts the date under toISOString() and rejects valid dates east of UTC.
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Returns an error message for invalid input, or null when the input is valid. */
export function validateTask({
  title,
  description,
  assignee = "",
  dueDate = "",
}: NewTaskInput): string | null {
  const t = title.trim();
  if (!t) return "タイトルを入力してください。";
  if (t.length > TITLE_MAX) return `タイトルは${TITLE_MAX}文字以内で入力してください。`;
  if (description.trim().length > DESCRIPTION_MAX) {
    return `説明は${DESCRIPTION_MAX}文字以内で入力してください。`;
  }
  if (assignee.trim().length > ASSIGNEE_MAX) {
    return `担当者は${ASSIGNEE_MAX}文字以内で入力してください。`;
  }
  if (dueDate.trim() && !isValidDueDate(dueDate.trim())) {
    return "期限は正しい日付を入力してください。";
  }
  return null;
}

/**
 * crypto.randomUUID only exists in secure contexts (https or localhost), so opening the dev server
 * by LAN IP over http would throw on add. getRandomValues works everywhere.
 */
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createTask(
  input: NewTaskInput,
  options: { id?: string; now?: Date; status?: Status } = {},
): Task {
  return {
    id: options.id ?? newId(),
    title: input.title.trim(),
    description: input.description.trim(),
    status: options.status ?? "todo",
    createdAt: (options.now ?? new Date()).toISOString(),
    assignee: (input.assignee ?? "").trim(),
    priority: input.priority ?? "medium",
    dueDate: (input.dueDate ?? "").trim(),
  };
}

/**
 * Applies edited fields to the task with `id`, trimming and defaulting the same way createTask does.
 * id, status and createdAt are preserved. Returns the same array when the task is missing or nothing
 * changes, so taskStore.update skips the save and re-render.
 */
export function updateTask(
  tasks: readonly Task[],
  id: string,
  input: NewTaskInput,
): readonly Task[] {
  const i = tasks.findIndex((t) => t.id === id);
  if (i === -1) return tasks;

  const current = tasks[i];
  const updated: Task = {
    ...current,
    title: input.title.trim(),
    description: input.description.trim(),
    assignee: (input.assignee ?? "").trim(),
    priority: input.priority ?? "medium",
    dueDate: (input.dueDate ?? "").trim(),
  };

  const unchanged =
    updated.title === current.title &&
    updated.description === current.description &&
    updated.assignee === current.assignee &&
    updated.priority === current.priority &&
    updated.dueDate === current.dueDate;
  if (unchanged) return tasks;

  return [...tasks.slice(0, i), updated, ...tasks.slice(i + 1)];
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}

/** Where a due date sits relative to today. "none" when the task has no due date. */
export type DueState = "none" | "overdue" | "today" | "upcoming";

/** Today's local calendar date as "YYYY-MM-DD", the format dueDate is stored in. */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Compares as strings: zero-padded YYYY-MM-DD sorts the same way the dates do. */
export function dueStateOf(dueDate: string, today: string): DueState {
  if (!dueDate) return "none";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

/** Tasks in one column, in board order. */
export function tasksIn(tasks: readonly Task[], status: Status): Task[] {
  return tasks.filter((t) => t.status === status);
}

/**
 * Moves a task into `status`. When `beforeId` names another task in that column the task is
 * placed right above it; otherwise it goes to the bottom of the column.
 * Returns the same array when nothing changes.
 */
export function moveTask(
  tasks: readonly Task[],
  id: string,
  status: Status,
  beforeId?: string | null,
): readonly Task[] {
  const from = tasks.findIndex((t) => t.id === id);
  if (from === -1 || beforeId === id) return tasks;

  const moved = { ...tasks[from], status };
  const rest = tasks.filter((t) => t.id !== id);

  const before = beforeId ? rest.findIndex((t) => t.id === beforeId && t.status === status) : -1;
  let to: number;
  if (before !== -1) {
    to = before;
  } else {
    // just after the last task currently in the target column (or at the end if it is empty)
    const lastInColumn = rest.findLastIndex((t) => t.status === status);
    to = lastInColumn === -1 ? rest.length : lastInColumn + 1;
  }

  const next = [...rest.slice(0, to), moved, ...rest.slice(to)];
  const unchanged = next.every((t, i) => t.id === tasks[i].id) && tasks[from].status === status;
  return unchanged ? tasks : next;
}

/** The neighbouring column in the given direction, or null at either end. */
export function adjacentStatus(status: Status, direction: -1 | 1): Status | null {
  return STATUSES[STATUSES.indexOf(status) + direction] ?? null;
}
