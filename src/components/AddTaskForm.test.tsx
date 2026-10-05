import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddTaskForm } from "./AddTaskForm";

const EMPTY_DETAILS = { assignee: "", priority: "medium", dueDate: "" };

describe("AddTaskForm", () => {
  it("submits title and description, then clears the fields", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText("タイトル"), "レポートを書く");
    await user.type(screen.getByLabelText("説明（任意）"), "金曜まで");
    await user.click(screen.getByRole("button", { name: /追加/ }));

    expect(onAdd).toHaveBeenCalledWith({
      title: "レポートを書く",
      description: "金曜まで",
      ...EMPTY_DETAILS,
    });
    expect(screen.getByLabelText("タイトル")).toHaveValue("");
    expect(screen.getByLabelText("説明（任意）")).toHaveValue("");
    expect(screen.getByLabelText("タイトル")).toHaveFocus();
  });

  it("submits assignee, priority, and due date, then clears them", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText("タイトル"), "設計レビュー");
    await user.type(screen.getByLabelText("担当者（任意）"), "田中");
    await user.selectOptions(screen.getByLabelText("優先度"), "high");
    fireEvent.change(screen.getByLabelText("期限（任意）"), { target: { value: "2026-10-01" } });
    await user.click(screen.getByRole("button", { name: /追加/ }));

    expect(onAdd).toHaveBeenCalledWith({
      title: "設計レビュー",
      description: "",
      assignee: "田中",
      priority: "high",
      dueDate: "2026-10-01",
    });
    expect(screen.getByLabelText("担当者（任意）")).toHaveValue("");
    expect(screen.getByLabelText("優先度")).toHaveValue("medium");
    expect(screen.getByLabelText("期限（任意）")).toHaveValue("");
  });

  it("shows an error and does not submit without a title", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText("タイトル"), "   ");
    await user.click(screen.getByRole("button", { name: /追加/ }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("タイトルを入力してください");
    expect(screen.getByLabelText("タイトル")).toHaveAttribute("aria-invalid", "true");
  });

  it("submits with Enter in the title field", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText("タイトル"), "買い物{Enter}");
    expect(onAdd).toHaveBeenCalledWith({ title: "買い物", description: "", ...EMPTY_DETAILS });
  });
});
