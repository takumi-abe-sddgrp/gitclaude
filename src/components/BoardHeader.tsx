import type { Task } from "@/lib/tasks";
import { PlusIcon } from "./icons";

type Props = {
  tasks: readonly Task[] | null;
  /** The tasks left after search/filters, passed only while any are active. */
  shown?: readonly Task[] | null;
  onNewTask: () => void;
};

export function BoardHeader({ tasks, shown, onNewTask }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="flex flex-wrap items-baseline gap-x-7 gap-y-1">
        <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-[52px]">
          TaskBoard
        </h1>
        {tasks && (
          <p className="text-base text-muted" aria-live="polite">
            {shown ? `${tasks.length}件中${shown.length}件を表示` : `${tasks.length}件のタスク`}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onNewTask}
        disabled={tasks === null}
        className="flex h-12 items-center gap-3 rounded-md bg-accent pr-16 pl-5 text-[15px] font-medium text-on-accent hover:opacity-90 disabled:opacity-60"
      >
        <PlusIcon className="size-4" />
        新規タスク
      </button>
    </header>
  );
}
