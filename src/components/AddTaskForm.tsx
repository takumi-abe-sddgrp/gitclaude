"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  ASSIGNEE_MAX,
  DESCRIPTION_MAX,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TITLE_MAX,
  validateTask,
  type NewTaskInput,
  type Priority,
  type Status,
} from "@/lib/tasks";

type Props = {
  onAdd: (input: NewTaskInput) => void;
  /** Column the new task goes into; only changes the default submit label. */
  status?: Status;
  onCancel?: () => void;
  disabled?: boolean;
  /** Prefill values. Its presence puts the form in edit mode: fields are not cleared after submit. */
  initial?: NewTaskInput;
  /** Overrides the submit button text (defaults to "<列>に追加"). */
  submitLabel?: string;
  /** Accessible name for the form (defaults to "タスクを追加"). */
  formLabel?: string;
};

const fieldClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px] placeholder:text-muted disabled:opacity-60";

export function AddTaskForm({
  onAdd,
  status = "todo",
  onCancel,
  disabled = false,
  initial,
  submitLabel,
  formLabel = "タスクを追加",
}: Props) {
  const editing = initial !== undefined;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input: NewTaskInput = { title, description, assignee, priority, dueDate };
    const message = validateTask(input);
    if (message) {
      setError(message);
      titleRef.current?.focus();
      return;
    }
    onAdd(input);
    setError(null);
    // In edit mode the parent closes the form; only the "add another" flow clears and refocuses.
    if (editing) return;
    setTitle("");
    setDescription("");
    setAssignee("");
    setPriority("medium");
    setDueDate("");
    titleRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancel) onCancel();
      }}
      noValidate
      aria-label={formLabel}
      className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-title`} className="text-xs text-muted">
          タイトル
        </label>
        <input
          id={`${id}-title`}
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          disabled={disabled}
          autoFocus={Boolean(onCancel)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="例：週次レポートを書く"
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-description`} className="text-xs text-muted">
          説明（任意）
        </label>
        <textarea
          id={`${id}-description`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          disabled={disabled}
          rows={2}
          className={`${fieldClass} resize-y`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-assignee`} className="text-xs text-muted">
          担当者（任意）
        </label>
        <input
          id={`${id}-assignee`}
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          maxLength={ASSIGNEE_MAX}
          disabled={disabled}
          placeholder="例：田中"
          className={fieldClass}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-24 flex-col gap-1">
          <label htmlFor={`${id}-priority`} className="text-xs text-muted">
            優先度
          </label>
          <select
            id={`${id}-priority`}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            disabled={disabled}
            className={fieldClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor={`${id}-due`} className="text-xs text-muted">
            期限（任意）
          </label>
          <input
            id={`${id}-due`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={disabled}
            className={fieldClass}
          />
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-high">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[13px] text-muted hover:bg-surface-2 hover:text-fg"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent hover:opacity-90 disabled:opacity-60"
        >
          {submitLabel ?? `${STATUS_LABEL[status]}に追加`}
        </button>
      </div>
    </form>
  );
}
