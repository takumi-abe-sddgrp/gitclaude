import { useId } from "react";
import {
  ALL,
  DUE_FILTER_LABEL,
  DUE_FILTERS,
  EMPTY_FILTER,
  isFilterActive,
  UNASSIGNED,
  type DueFilter,
  type TaskFilter,
} from "@/lib/filter";
import { PRIORITIES, PRIORITY_LABEL, type Priority } from "@/lib/tasks";

type Props = {
  filter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
  /** Names offered in the assignee menu. */
  assignees: readonly string[];
  disabled?: boolean;
};

const fieldClass =
  "rounded-md border border-line bg-surface px-3 py-2 text-[14px] placeholder:text-muted disabled:opacity-60";

export function FilterBar({ filter, onChange, assignees, disabled = false }: Props) {
  const id = useId();
  const set = (patch: Partial<TaskFilter>) => onChange({ ...filter, ...patch });
  // keep a selected name in the menu even after its last task was edited away,
  // so the select never shows a value it has no option for
  const names =
    filter.assignee !== ALL && filter.assignee !== UNASSIGNED && !assignees.includes(filter.assignee)
      ? [...assignees, filter.assignee]
      : assignees;

  return (
    <div role="search" className="flex flex-wrap items-end gap-3" aria-label="タスクの検索と絞り込み">
      <div className="flex min-w-56 flex-1 flex-col gap-1 sm:max-w-sm">
        <label htmlFor={`${id}-query`} className="text-xs text-muted">
          検索
        </label>
        <input
          id={`${id}-query`}
          type="search"
          value={filter.query}
          onChange={(e) => set({ query: e.target.value })}
          disabled={disabled}
          placeholder="タイトル・説明から検索"
          className={fieldClass}
        />
      </div>
      <div className="flex min-w-36 flex-col gap-1">
        <label htmlFor={`${id}-assignee`} className="text-xs text-muted">
          担当者
        </label>
        <select
          id={`${id}-assignee`}
          value={filter.assignee}
          onChange={(e) => set({ assignee: e.target.value })}
          disabled={disabled}
          className={fieldClass}
        >
          <option value={ALL}>すべて</option>
          <option value={UNASSIGNED}>未割り当て</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-24 flex-col gap-1">
        <label htmlFor={`${id}-priority`} className="text-xs text-muted">
          優先度
        </label>
        <select
          id={`${id}-priority`}
          value={filter.priority}
          onChange={(e) => set({ priority: e.target.value as Priority | typeof ALL })}
          disabled={disabled}
          className={fieldClass}
        >
          <option value={ALL}>すべて</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-28 flex-col gap-1">
        <label htmlFor={`${id}-due`} className="text-xs text-muted">
          期限
        </label>
        <select
          id={`${id}-due`}
          value={filter.due}
          onChange={(e) => set({ due: e.target.value as DueFilter })}
          disabled={disabled}
          className={fieldClass}
        >
          <option value={ALL}>すべて</option>
          {DUE_FILTERS.map((d) => (
            <option key={d} value={d}>
              {DUE_FILTER_LABEL[d]}
            </option>
          ))}
        </select>
      </div>
      {isFilterActive(filter) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTER)}
          className="rounded-md px-3 py-2 text-[13px] text-muted hover:bg-surface-2 hover:text-fg"
        >
          条件をクリア
        </button>
      )}
    </div>
  );
}
