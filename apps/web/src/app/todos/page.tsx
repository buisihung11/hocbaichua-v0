"use client";

import { Loader2 } from "lucide-react";
import { TodoForm } from "@/components/TodoForm";
import { TodoList } from "@/components/TodoList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTodos } from "@/hooks/useTodos";

export default function TodosPage() {
  const { todos, isLoading, pendingTodoIds, addTodo, toggleTodo, deleteTodo } =
    useTodos();

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <TodoForm onAddTodo={addTodo} />

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!isLoading && (
            <TodoList
              onDelete={deleteTodo}
              onToggle={toggleTodo}
              pendingTodoIds={pendingTodoIds}
              todos={todos}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
