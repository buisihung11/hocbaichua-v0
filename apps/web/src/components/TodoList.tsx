"use client";

import type { Todo } from "@/hooks/useTodos";
import { TodoItem } from "./TodoItem";

type TodoListProps = {
  todos: Todo[];
  pendingTodoIds: Set<number>;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
};

export function TodoList({
  todos,
  pendingTodoIds,
  onToggle,
  onDelete,
}: TodoListProps) {
  if (todos.length === 0) {
    return <p className="py-4 text-center">No todos yet. Add one above!</p>;
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          isPending={pendingTodoIds.has(todo.id)}
          key={todo.id}
          onDelete={onDelete}
          onToggle={onToggle}
          todo={todo}
        />
      ))}
    </ul>
  );
}
