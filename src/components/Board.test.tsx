import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "@/lib/storage";
import { todayString } from "@/lib/tasks";
import { Board } from "./Board";

describe("Board", () => {
  it("adds a task to 未着手, moves it along, and saves to localStorage", async () => {
    const user = userEvent.setup();
    render(<Board />);

    const todo = screen.getByRole("region", { name: "未着手" });
    const doing = screen.getByRole("region", { name: "進行中" });

    await user.click(screen.getByRole("button", { name: "新規タスク" }));
    await user.type(screen.getByLabelText("タイトル"), "議事録をまとめる");
    await user.type(screen.getByLabelText("説明（任意）"), "定例の分");
    await user.click(screen.getByRole("button", { name: /未着手に追加/ }));

    expect(within(todo).getByText("議事録をまとめる")).toBeInTheDocument();
    expect(within(todo).getByText("定例の分")).toBeInTheDocument();

    await user.click(within(todo).getByRole("button", { name: "進行中へ進める" }));
    expect(within(todo).queryByText("議事録をまとめる")).not.toBeInTheDocument();
    expect(within(doing).getByText("議事録をまとめる")).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved).toMatchObject([
      { title: "議事録をまとめる", description: "定例の分", status: "doing" },
    ]);
  });
});

describe("Board column add", () => {
  it("adds straight into the column whose タスクを追加 was used, and Escape closes the form", async () => {
    const user = userEvent.setup();
    render(<Board />);

    const done = screen.getByRole("region", { name: "完了" });
    await user.click(within(done).getByRole("button", { name: "タスクを追加" }));
    expect(within(done).getByLabelText("タイトル")).toHaveFocus();

    await user.type(within(done).getByLabelText("タイトル"), "振り返り{Enter}");
    expect(within(done).getByRole("article", { name: "振り返り" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("form", { name: "タスクを追加" })).not.toBeInTheDocument();
  });
});

describe("Board columns", () => {
  it("shows 保留 between 進行中 and 完了", () => {
    render(<Board />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["未着手", "進行中", "保留", "完了"]);
  });
});

describe("Board search and filters", () => {
  // names are unique to this block because the task store is shared across the file's tests
  async function add(user: ReturnType<typeof userEvent.setup>, title: string, assignee: string, priority: string) {
    await user.click(screen.getByRole("button", { name: "新規タスク" }));
    const form = within(screen.getByRole("form", { name: "タスクを追加" }));
    await user.type(form.getByLabelText("タイトル"), title);
    await user.type(form.getByLabelText("担当者（任意）"), assignee);
    await user.selectOptions(form.getByLabelText("優先度"), priority);
    await user.click(form.getByRole("button", { name: /未着手に追加/ }));
    await user.keyboard("{Escape}");
  }

  it("narrows cards by keyword, assignee and priority, and clears back to everything", async () => {
    const user = userEvent.setup();
    render(<Board />);
    await add(user, "検索テストA 請求書", "山本", "high");
    await add(user, "検索テストB 見積書", "小林", "low");

    const bar = screen.getByRole("search", { name: "タスクの検索と絞り込み" });
    const card = (name: string) => screen.queryByRole("article", { name: new RegExp(name) });

    await user.type(within(bar).getByLabelText("検索"), "請求書");
    expect(card("検索テストA")).toBeInTheDocument();
    expect(card("検索テストB")).not.toBeInTheDocument();
    expect(screen.getByText(/件中1件を表示/)).toBeInTheDocument();

    await user.clear(within(bar).getByLabelText("検索"));
    await user.selectOptions(within(bar).getByLabelText("担当者"), "小林");
    expect(card("検索テストA")).not.toBeInTheDocument();
    expect(card("検索テストB")).toBeInTheDocument();

    await user.selectOptions(within(bar).getByLabelText("優先度"), "high");
    expect(card("検索テストB")).not.toBeInTheDocument();
    expect(screen.getAllByText("条件に合うタスクはありません")).toHaveLength(4);

    await user.click(within(bar).getByRole("button", { name: "条件をクリア" }));
    expect(card("検索テストA")).toBeInTheDocument();
    expect(card("検索テストB")).toBeInTheDocument();
  });
});

describe("Board due-date filter", () => {
  // names are unique to this block because the task store is shared across the file's tests
  function shifted(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return todayString(d);
  }

  async function addDue(user: ReturnType<typeof userEvent.setup>, title: string, dueDate: string) {
    await user.click(screen.getByRole("button", { name: "新規タスク" }));
    const form = within(screen.getByRole("form", { name: "タスクを追加" }));
    await user.type(form.getByLabelText("タイトル"), title);
    if (dueDate) fireEvent.change(form.getByLabelText("期限（任意）"), { target: { value: dueDate } });
    await user.click(form.getByRole("button", { name: /未着手に追加/ }));
    await user.keyboard("{Escape}");
  }

  it("narrows cards by 期限切れ / 今日まで / 期限なし without touching what is saved", async () => {
    const user = userEvent.setup();
    render(<Board />);
    await addDue(user, "期限テスト昨日", shifted(-1));
    await addDue(user, "期限テスト今日", todayString());
    await addDue(user, "期限テスト明日", shifted(1));
    await addDue(user, "期限テストなし", "");

    const bar = screen.getByRole("search", { name: "タスクの検索と絞り込み" });
    const due = within(bar).getByLabelText("期限");
    const search = within(bar).getByLabelText("検索");
    const shown = () =>
      screen
        .queryAllByRole("article", { name: /^期限テスト/ })
        .map((a) => a.getAttribute("aria-label"));
    const savedBefore = localStorage.getItem(STORAGE_KEY);

    // the search narrows to this test's cards so tasks left by earlier tests do not matter
    await user.type(search, "期限テスト");
    expect(shown()).toEqual(["期限テスト昨日", "期限テスト今日", "期限テスト明日", "期限テストなし"]);

    await user.selectOptions(due, "期限切れ");
    expect(shown()).toEqual(["期限テスト昨日"]);

    await user.selectOptions(due, "今日まで");
    expect(shown()).toEqual(["期限テスト昨日", "期限テスト今日"]);

    await user.selectOptions(due, "期限なし");
    expect(shown()).toEqual(["期限テストなし"]);
    expect(screen.getByText(/件中1件を表示/)).toBeInTheDocument();

    expect(localStorage.getItem(STORAGE_KEY)).toBe(savedBefore);

    await user.clear(search);
    await user.selectOptions(due, "すべて");
    expect(screen.queryByText(/件中\d+件を表示/)).not.toBeInTheDocument();
    expect(shown()).toHaveLength(4);
  });
});
