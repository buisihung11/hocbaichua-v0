"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const getAllTodosOptions = orpc.todo.getAll.queryOptions();

export default function TodosPage() {
  const [newTodoText, setNewTodoText] = useState("");
  const [inputError, setInputError] = useState("");
  const queryClient = useQueryClient();

  const todos = useQuery(getAllTodosOptions);
  const createMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: getAllTodosOptions.queryKey,
        });
        const previousTodos = queryClient.getQueryData(
          getAllTodosOptions.queryKey
        );
        queryClient.setQueryData(
          getAllTodosOptions.queryKey,
          (old: Todo[] | undefined) => [
            ...(old || []),
            { id: Date.now(), text: variables.text, completed: false },
          ]
        );
        return { previousTodos };
      },
      onError: (err, _variables, context) => {
        if (context?.previousTodos) {
          queryClient.setQueryData(
            getAllTodosOptions.queryKey,
            context.previousTodos
          );
        }
        // Show user-friendly error message
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create todo";
        toast.error("Failed to create todo", {
          description: errorMessage,
          action: {
            label: "Retry",
            onClick: () => createMutation.mutate({ text: _variables.text }),
          },
        });
        setInputError(errorMessage);
      },
      onSuccess: () => {
        setInputError(""); // Clear any previous errors
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: getAllTodosOptions.queryKey,
        });
      },
    })
  );
  const toggleMutation = useMutation(
    orpc.todo.toggle.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: getAllTodosOptions.queryKey,
        });
        const previousTodos = queryClient.getQueryData(
          getAllTodosOptions.queryKey
        );
        queryClient.setQueryData(
          getAllTodosOptions.queryKey,
          (old: Todo[] | undefined) =>
            (old || []).map((todo: Todo) =>
              todo.id === variables.id
                ? { ...todo, completed: variables.completed }
                : todo
            )
        );
        return { previousTodos };
      },
      onError: (err, _variables, context) => {
        if (context?.previousTodos) {
          queryClient.setQueryData(
            getAllTodosOptions.queryKey,
            context.previousTodos
          );
        }
        // Show user-friendly error message
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update todo";
        toast.error("Failed to update todo", {
          description: errorMessage,
          action: {
            label: "Retry",
            onClick: () =>
              toggleMutation.mutate({
                id: _variables.id,
                completed: _variables.completed,
              }),
          },
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: getAllTodosOptions.queryKey,
        });
      },
    })
  );
  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: getAllTodosOptions.queryKey,
        });
        const previousTodos = queryClient.getQueryData(
          getAllTodosOptions.queryKey
        );
        queryClient.setQueryData(
          getAllTodosOptions.queryKey,
          (old: Todo[] | undefined) =>
            (old || []).filter((todo: Todo) => todo.id !== variables.id)
        );
        return { previousTodos };
      },
      onError: (err, _variables, context) => {
        if (context?.previousTodos) {
          queryClient.setQueryData(
            getAllTodosOptions.queryKey,
            context.previousTodos
          );
        }
        // Show user-friendly error message
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete todo";
        toast.error("Failed to delete todo", {
          description: errorMessage,
          action: {
            label: "Retry",
            onClick: () => deleteMutation.mutate({ id: _variables.id }),
          },
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: getAllTodosOptions.queryKey,
        });
      },
    })
  );

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      createMutation.mutate({ text: newTodoText });
      setNewTodoText("");
      setInputError(""); // Clear error when attempting to add
    }
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="mb-6 flex items-center space-x-2"
            onSubmit={handleAddTodo}
          >
            <div className="flex-1">
              <Input
                className={
                  inputError ? "border-red-500 focus:border-red-500" : ""
                }
                disabled={createMutation.isPending}
                onChange={(e) => {
                  setNewTodoText(e.target.value);
                  if (inputError) {
                    setInputError("");
                  }
                }}
                placeholder="Add a new task..."
                value={newTodoText}
              />
              {inputError && (
                <p className="mt-1 text-red-600 text-sm">{inputError}</p>
              )}
            </div>
            <Button
              disabled={createMutation.isPending || !newTodoText.trim()}
              type="submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </form>

          {todos.isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!todos.isLoading && todos.data?.length === 0 && (
            <p className="py-4 text-center">No todos yet. Add one above!</p>
          )}
          {!todos.isLoading && todos.data && todos.data.length > 0 && (
            <ul className="space-y-2">
              {todos.data.map((todo) => (
                <li
                  className="flex items-center justify-between rounded-md border p-2"
                  key={todo.id}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={todo.completed}
                      id={`todo-${todo.id}`}
                      onCheckedChange={() =>
                        handleToggleTodo(todo.id, todo.completed)
                      }
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
                    onClick={() => handleDeleteTodo(todo.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
