"use client";

import { useEffect, useRef, useState } from "react";
import {
  adjacentStatus,
  dueStateOf,
  PRIORITY_LABEL,
  STATUS_LABEL,
  todayString,
  type DueState,
  type NewTaskInput,
  type Priority,
  type Status,
  type Task,
} from "@/lib/tasks";
import { AddTaskForm } from "./AddTaskForm";

/** Custom drag type so columns ignore unrelated drags (files, text from other pages). */
export const TASK_DRAG_TYPE = "application/x-taskboard-task";

type Props = {
  task: Task;
  /** Moves the card to the bottom of another column (used by the arrow buttons). */
  onMove: (status: Status) => void;
  /** Saves edited fields; the edit button is hidden when omitted. */
  onEdit?: (input: NewTaskInput) => void;
  /** Local "YYYY-MM-DD" used to flag overdue / due-today cards; defaults to todayString(). */
  today?: string;
};

export function TaskCard({ task, onMove, onEdit, today }: Props) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  // The edit form unmounts on save/cancel; put focus back on the edit button instead of <body>.
  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);
  function closeEditor() {
    restoreFocus.current = true;
    setEditing(false);
  }
  const prev = adjacentStatus(task.status, -1);
  const next = adjacentStatus(task.status, 1);

  if (editing && onEdit) {
    return (
      <AddTaskForm
        formLabel="タスクを編集"
        submitLabel="保存"
        initial={{
          title: task.title,
          description: task.description,
          assignee: task.assignee,
          priority: task.priority,
          dueDate: task.dueDate,
        }}
        onAdd={(input) => {
          onEdit(input);
          closeEditor();
        }}
        onCancel={closeEditor}
      />
    );
  }

  return (
    <article
      draggable
      data-task-id={task.id}
      aria-label={task.title}
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`group relative flex cursor-grab flex-col gap-2 rounded-lg bg-surface px-5 pt-5 pb-3.5 shadow-card active:cursor-grabbing ${
        dragging ? "opacity-45" : ""
      }`}
    >
      <h3 className="max-w-[16rem] pr-12 text-[17px] leading-snug font-bold break-words">
        {task.title}
      </h3>
      {task.description && (
        <p className="line-clamp-3 max-w-[16.5rem] text-[13px] leading-normal break-words whitespace-pre-wrap text-muted">
          {task.description}
        </p>
      )}
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <DueDate
            dueDate={task.dueDate}
            // finished tasks are never flagged as late
            state={
              task.status === "done" ? "upcoming" : dueStateOf(task.dueDate, today ?? todayString())
            }
          />
        )}
        {task.assignee && (
          <span
            className="ml-auto max-w-[10rem] truncate rounded-full bg-surface-2 px-2 py-0.5 text-muted"
            title={`担当者：${task.assignee}`}
          >
            {task.assignee}
          </span>
        )}
      </div>
      {/* keyboard/touch alternative to dragging; hover devices only reveal it on hover or focus */}
      <div className="absolute top-2 right-2 flex gap-0.5 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
        <MoveButton to={prev} arrow="←" verb="へ戻す" onMove={onMove} />
        <MoveButton to={next} arrow="→" verb="へ進める" onMove={onMove} />
        {onEdit && (
          <button
            ref={editButtonRef}
            type="button"
            onClick={() => setEditing(true)}
            aria-label="タスクを編集"
            title="タスクを編集"
            className="rounded-md px-1.5 py-0.5 text-[13px] text-muted hover:bg-surface-2 hover:text-fg"
          >
            ✎
          </button>
        )}
      </div>
    </article>
  );
}

/** Priority pill. Uses only existing theme tokens: high borrows the alert colour, the rest stay neutral. */
const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-high-soft text-high font-medium",
  medium: "bg-surface-2 text-fg",
  low: "bg-surface-2 text-muted",
};

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] ${PRIORITY_STYLE[priority]}`}
      title={`優先度：${PRIORITY_LABEL[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** Overdue / due-today get a coloured pill plus a text suffix, so the state is not colour-only. */
const DUE_STYLE: Partial<Record<DueState, { className: string; suffix: string }>> = {
  overdue: {
    className: "rounded bg-high-soft px-1.5 py-0.5 font-medium text-high",
    suffix: "（期限切れ）",
  },
  today: {
    className: "rounded bg-warn-soft px-1.5 py-0.5 font-medium text-warn",
    suffix: "（今日）",
  },
};

function DueDate({ dueDate, state }: { dueDate: string; state: DueState }) {
  const style = DUE_STYLE[state];
  return (
    <span
      className={`tabular-nums ${style?.className ?? "text-muted"}`}
      title="期限"
      data-due-state={state}
    >
      〆 {formatDueDate(dueDate)}
      {style?.suffix}
    </span>
  );
}

/** "2026-10-01" → "2026/10/01"; leaves anything unexpected untouched. */
function formatDueDate(dueDate: string): string {
  return dueDate.replaceAll("-", "/");
}

function MoveButton({
  to,
  arrow,
  verb,
  onMove,
}: {
  to: Status | null;
  arrow: string;
  verb: string;
  onMove: (status: Status) => void;
}) {
  // disabled arrows still get a name so screen readers don't announce a bare "←"
  const label = to
    ? `${STATUS_LABEL[to]}${verb}`
    : arrow === "←"
      ? "前の列はありません"
      : "次の列はありません";
  return (
    <button
      type="button"
      disabled={!to}
      onClick={() => to && onMove(to)}
      aria-label={label}
      title={label}
      className="rounded-md px-1.5 py-0.5 text-[13px] text-muted hover:bg-surface-2 hover:text-fg disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {arrow}
    </button>
  );
}
