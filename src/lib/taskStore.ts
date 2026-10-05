import { loadTasks, saveTasks, STORAGE_KEY } from "./storage";
import type { Task } from "./tasks";

type Listener = () => void;

export type TaskStore = {
  subscribe(listener: Listener): () => void;
  getSnapshot(): readonly Task[];
  /** Applies an update; returns false if it could not be persisted (the change is still kept in memory). */
  update(fn: (tasks: readonly Task[]) => readonly Task[]): boolean;
};

/**
 * A tiny external store over localStorage, shaped for React's useSyncExternalStore.
 * Also picks up changes made in other tabs via the `storage` event.
 */
export function createTaskStore(getStorage: () => Storage): TaskStore {
  let cache: readonly Task[] | null = null;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    cache = null;
    emit();
  };

  // Reading window.localStorage itself throws (SecurityError) when site data is blocked;
  // treat that as empty, unsavable storage instead of crashing the render.
  const storage = (): Storage | null => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  };

  const getSnapshot = (): readonly Task[] => {
    if (cache === null) {
      const s = storage();
      cache = s ? loadTasks(s) : [];
    }
    return cache;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot,
    // No `this`, so update works unbound like subscribe/getSnapshot.
    update(fn) {
      const current = getSnapshot();
      const next = fn(current);
      if (next === current) return true;
      cache = next;
      const s = storage();
      const saved = s ? saveTasks(s, next) : false;
      emit();
      return saved;
    },
  };
}
