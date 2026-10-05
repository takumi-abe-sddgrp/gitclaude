"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createTaskStore } from "@/lib/taskStore";
import {
  createTask,
  moveTask,
  updateTask,
  type NewTaskInput,
  type Status,
  type Task,
} from "@/lib/tasks";

const store = createTaskStore(() => window.localStorage);

// null on the server and during hydration, so the first client render matches the HTML.
const getServerSnapshot = () => null;

export function useTasks() {
  const tasks: readonly Task[] | null = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );

  const addTask = useCallback(
    (input: NewTaskInput, status: Status = "todo") =>
      store.update((list) => [...list, createTask(input, { status })]),
    [],
  );

  const move = useCallback(
    (id: string, status: Status, beforeId?: string | null) =>
      store.update((list) => moveTask(list, id, status, beforeId)),
    [],
  );

  const edit = useCallback(
    (id: string, input: NewTaskInput) => store.update((list) => updateTask(list, id, input)),
    [],
  );

  return { tasks, addTask, moveTask: move, editTask: edit };
}
