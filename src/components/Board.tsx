"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import {
  assigneesOf,
  EMPTY_FILTER,
  filterTasks,
  isFilterActive,
  type TaskFilter,
} from "@/lib/filter";
import { STATUSES, tasksIn, todayString, type Status } from "@/lib/tasks";
import { AddTaskForm } from "./AddTaskForm";
import { BoardHeader } from "./BoardHeader";
import { AddColumnSlot, Column } from "./Column";
import { FilterBar } from "./FilterBar";

const SAVE_FAILED = "このブラウザに保存できませんでした。ページを閉じると変更が失われます。";

export function Board() {
  const { tasks, addTask, moveTask, editTask } = useTasks();
  const [saveError, setSaveError] = useState(false);
  // the column whose add form is open, if any
  const [composing, setComposing] = useState<Status | null>(null);
  // search and filters only narrow what is shown; the stored list and its order are untouched
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);
  const filtering = isFilterActive(filter);
  // read on every render: after midnight the due filter catches up on the next re-render
  // (any edit, move or filter change), not on its own
  const today = todayString();
  const visible = useMemo(
    () => (tasks === null ? null : filterTasks(tasks, filter, today)),
    [tasks, filter, today],
  );
  const assignees = useMemo(() => assigneesOf(tasks ?? []), [tasks]);

  const report = (saved: boolean) => setSaveError(!saved);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1920px] flex-col gap-8 px-4 py-8 sm:px-8 lg:gap-14 lg:px-20 lg:pt-14 lg:pb-10">
      <div className="flex flex-col gap-6">
        <BoardHeader
          tasks={tasks}
          shown={filtering ? visible : undefined}
          onNewTask={() => setComposing("todo")}
        />
        <FilterBar
          filter={filter}
          onChange={setFilter}
          assignees={assignees}
          disabled={tasks === null}
        />
      </div>

      {saveError && (
        <p role="alert" className="rounded-lg bg-high-soft px-3 py-2 text-sm text-high">
          {SAVE_FAILED}
        </p>
      )}

      <main className="grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 lg:gap-[30px] xl:grid-cols-4 2xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,0.88fr)]">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={visible === null ? null : tasksIn(visible, status)}
            filtered={filtering}
            onMove={(id, to, beforeId) => report(moveTask(id, to, beforeId))}
            onEdit={(id, input) => report(editTask(id, input))}
            onStartAdd={() => setComposing(status)}
            composer={
              composing === status ? (
                <AddTaskForm
                  status={status}
                  onAdd={(input) => report(addTask(input, status))}
                  onCancel={() => setComposing(null)}
                  disabled={tasks === null}
                />
              ) : undefined
            }
          />
        ))}
        <AddColumnSlot />
      </main>
    </div>
  );
}
