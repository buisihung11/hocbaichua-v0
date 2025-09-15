"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Todo } from "@/hooks/useTodos";

type TodoItemProps = {
  todo: Todo;
  isPending: boolean;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
};

export function TodoItem({
  todo,
  isPending,
  onToggle,
  onDelete,
}: TodoItemProps) {
  return (
    <li
      className={`flex items-center justify-between rounded-md border p-2 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center space-x-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        <Checkbox
          checked={todo.completed}
          disabled={isPending}
          id={`todo-${todo.id}`}
          onCheckedChange={() => onToggle(todo.id, todo.completed)}
        />
        <label
          className={`${todo.completed ? "text-muted-foreground line-through" : ""}`}
          htmlFor={`todo-${todo.id}`}
        >
          {todo.text}
        </label>
      </div>
      <Button
        aria-label="Delete todo"
        disabled={isPending}
        onClick={() => onDelete(todo.id)}
        size="icon"
        variant="ghost"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
