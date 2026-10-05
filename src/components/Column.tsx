"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { STATUS_LABEL, type NewTaskInput, type Status, type Task } from "@/lib/tasks";
import { MoreIcon, PlusIcon } from "./icons";
import { TASK_DRAG_TYPE, TaskCard } from "./TaskCard";

type Props = {
  status: Status;
  /** null while tasks are still loading */
  tasks: readonly Task[] | null;
  onMove: (id: string, status: Status, beforeId?: string | null) => void;
  /** Saves edited fields for a task; when omitted, cards show no edit button. */
  onEdit?: (id: string, input: NewTaskInput) => void;
  /** Opens the add form in this column; the button is hidden when omitted. */
  onStartAdd?: () => void;
  /** The add form, rendered above the cards while this column is composing. */
  composer?: ReactNode;
  /** True while search/filters hide some tasks; changes the empty-column message. */
  filtered?: boolean;
};

const EMPTY: Record<Status, string> = {
  todo: "「タスクを追加」から最初のタスクを作成できます",
  doing: "着手したタスクをここへドラッグ",
  hold: "止まっているタスクをここへドラッグ",
  done: "終わったタスクをここへドラッグ",
};

function hasTask(e: DragEvent) {
  return e.dataTransfer.types.includes(TASK_DRAG_TYPE);
}

export function Column({
  status,
  tasks,
  onMove,
  onEdit,
  onStartAdd,
  composer,
  filtered = false,
}: Props) {
  const [over, setOver] = useState(false);
  const headingId = `col-${status}`;

  function handleDragOver(e: DragEvent<HTMLElement>) {
    if (!hasTask(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
  }

  function handleDrop(e: DragEvent<HTMLElement>) {
    setOver(false);
    const id = e.dataTransfer.getData(TASK_DRAG_TYPE);
    if (!id) return;
    e.preventDefault();
    // dropping onto a card inserts above it; anywhere else appends to the column
    const target = (e.target as Element).closest<HTMLElement>("[data-task-id]");
    onMove(id, status, target?.dataset.taskId ?? null);
  }

  return (
    <section
      aria-labelledby={headingId}
      data-status={status}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-40 flex-col gap-4 rounded-xl bg-surface-2 px-5 pt-4 pb-5 transition-shadow ${
        over ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""
      }`}
    >
      <div className="flex items-center gap-4 py-1">
        <h2 id={headingId} className="text-lg font-medium">
          {STATUS_LABEL[status]}
        </h2>
        <span className="text-sm text-muted tabular-nums">{tasks ? `#${tasks.length}` : ""}</span>
        {/* column menu: visual placeholder until column actions exist */}
        <MoreIcon className="ml-auto h-1 w-[18px] text-muted" />
      </div>

      {composer ??
        (onStartAdd && (
          <button
            type="button"
            onClick={onStartAdd}
            disabled={tasks === null}
            className="-mx-1 -mt-1 flex items-center gap-2 self-start rounded-md px-1 py-0.5 text-sm text-muted hover:text-fg disabled:opacity-60"
          >
            <PlusIcon className="size-3.5" />
            タスクを追加
          </button>
        ))}

      {tasks === null ? (
        <Empty>読み込み中…</Empty>
      ) : tasks.length === 0 ? (
        !composer && <Empty>{filtered ? "条件に合うタスクはありません" : EMPTY[status]}</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onMove={(to) => onMove(task.id, to)}
                onEdit={onEdit ? (input) => onEdit(task.id, input) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Frame for adding columns; the action itself is not implemented yet. */
export function AddColumnSlot() {
  return (
    <div
      aria-hidden
      className="flex min-h-32 flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-sm text-muted"
    >
      <PlusIcon className="size-5" />
      カラムを追加
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">
      {children}
    </p>
  );
}
