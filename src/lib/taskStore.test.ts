import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "./storage";
import { createTaskStore } from "./taskStore";
import { createTask } from "./tasks";

describe("createTaskStore", () => {
  beforeEach(() => localStorage.clear());

  it("persists updates and notifies subscribers", () => {
    const store = createTaskStore(() => localStorage);
    const listener = vi.fn();
    store.subscribe(listener);

    const t = createTask({ title: "a", description: "" }, { id: "a" });
    expect(store.update((list) => [...list, t])).toBe(true);

    expect(store.getSnapshot()).toEqual([t]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([t]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("returns a stable snapshot between updates", () => {
    const store = createTaskStore(() => localStorage);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("skips saving and notifying when an update changes nothing", () => {
    const store = createTaskStore(() => localStorage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((list) => list);
    expect(listener).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("reloads when another tab writes", () => {
    const store = createTaskStore(() => localStorage);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.getSnapshot()).toEqual([]);

    const t = createTask({ title: "other tab", description: "" }, { id: "o" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([t]));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual([t]);
  });

  it("keeps the change in memory and returns false when saving fails", () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    } as unknown as Storage;
    const store = createTaskStore(() => full);
    const listener = vi.fn();
    store.subscribe(listener);

    const t = createTask({ title: "a", description: "" }, { id: "a" });
    expect(store.update((list) => [...list, t])).toBe(false);
    expect(store.getSnapshot()).toEqual([t]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the storage itself is inaccessible", () => {
    const store = createTaskStore(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(store.getSnapshot()).toEqual([]);
    const t = createTask({ title: "a", description: "" }, { id: "a" });
    expect(store.update((list) => [...list, t])).toBe(false);
    expect(store.getSnapshot()).toEqual([t]);
  });

  it("works when update is called unbound", () => {
    const store = createTaskStore(() => localStorage);
    const { update } = store;
    const t = createTask({ title: "a", description: "" }, { id: "a" });
    expect(update((list) => [...list, t])).toBe(true);
    expect(store.getSnapshot()).toEqual([t]);
  });

  it("reloads when another tab clears storage", () => {
    const store = createTaskStore(() => localStorage);
    store.subscribe(() => {});
    const t = createTask({ title: "a", description: "" }, { id: "a" });
    store.update((list) => [...list, t]);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(store.getSnapshot()).toEqual([]);
  });

  it("ignores storage events for other keys", () => {
    const store = createTaskStore(() => localStorage);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    window.dispatchEvent(new StorageEvent("storage", { key: "something.else" }));
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);
  });

  it("stops listening after unsubscribe", () => {
    const store = createTaskStore(() => localStorage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(listener).not.toHaveBeenCalled();
  });
});
