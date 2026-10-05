import { dueStateOf, type Priority, type Task } from "./tasks";

// The assignee menu mixes these with real names. Assignees are trimmed on save, so the leading
// space keeps a person named "all" or "unassigned" from being read as one of these.
/** Select value meaning "no restriction" for the assignee / priority / due filters. */
export const ALL = " all";
/** Assignee filter value that matches tasks with no assignee. */
export const UNASSIGNED = " unassigned";

/**
 * Due-date conditions: "overdue" is before today, "by-today" is overdue or due today, and
 * "none" is tasks without a due date. Done tasks never count as overdue or due today, matching
 * TaskCard, which does not flag them.
 */
export const DUE_FILTERS = ["overdue", "by-today", "none"] as const;
export type DueFilter = (typeof DUE_FILTERS)[number] | typeof ALL;

export const DUE_FILTER_LABEL: Record<(typeof DUE_FILTERS)[number], string> = {
  overdue: "期限切れ",
  "by-today": "今日まで",
  none: "期限なし",
};

export type TaskFilter = {
  /** Matched against title and description; blank matches everything. */
  query: string;
  /** ALL, UNASSIGNED, or an exact assignee name. */
  assignee: string;
  priority: Priority | typeof ALL;
  due: DueFilter;
};

export const EMPTY_FILTER: TaskFilter = { query: "", assignee: ALL, priority: ALL, due: ALL };

/**
 * Folds width and case so "ＡＢＣ", "abc" and "ABC" match each other, and turns a
 * full-width space into an ordinary one.
 */
function fold(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

function matchesDue(task: Task, due: DueFilter, today: string): boolean {
  if (due === ALL) return true;
  const state = dueStateOf(task.dueDate, today);
  if (due !== "none" && task.status === "done") return false;
  if (due === "overdue") return state === "overdue";
  if (due === "by-today") return state === "overdue" || state === "today";
  return state === "none";
}

export function isFilterActive(filter: TaskFilter): boolean {
  return (
    filter.query.trim() !== "" ||
    filter.assignee !== ALL ||
    filter.priority !== ALL ||
    filter.due !== ALL
  );
}

/**
 * Tasks matching every condition, in their original order. Space-separated words in the query
 * must all appear somewhere in the title or description. `today` is the local date as
 * "YYYY-MM-DD" (see todayString), passed in so this stays pure. Returns the same array when no
 * filter is active.
 */
export function filterTasks(
  tasks: readonly Task[],
  filter: TaskFilter,
  today: string,
): readonly Task[] {
  if (!isFilterActive(filter)) return tasks;
  const words = fold(filter.query).split(/\s+/).filter(Boolean);

  return tasks.filter((t) => {
    if (filter.priority !== ALL && t.priority !== filter.priority) return false;
    if (filter.assignee === UNASSIGNED) {
      if (t.assignee !== "") return false;
    } else if (filter.assignee !== ALL && t.assignee !== filter.assignee) {
      return false;
    }
    if (!matchesDue(t, filter.due, today)) return false;
    if (words.length === 0) return true;
    const haystack = fold(`${t.title}\n${t.description}`);
    return words.every((w) => haystack.includes(w));
  });
}

/** Distinct non-empty assignees, sorted for the filter menu. */
export function assigneesOf(tasks: readonly Task[]): string[] {
  const names = new Set(tasks.map((t) => t.assignee).filter(Boolean));
  return [...names].sort((a, b) => a.localeCompare(b, "ja"));
}
