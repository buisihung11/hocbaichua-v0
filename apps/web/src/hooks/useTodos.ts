"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

export type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const getAllTodosOptions = orpc.todo.getAll.queryOptions();

export function useTodos() {
  const [pendingTodoIds, setPendingTodoIds] = useState<Set<number>>(new Set());
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

        // Generate a unique temporary ID
        const tempId = Date.now() + Math.random();

        queryClient.setQueryData(
          getAllTodosOptions.queryKey,
          (old: Todo[] | undefined) => [
            ...(old || []),
            { id: tempId, text: variables.text, completed: false },
          ]
        );

        // Track this as a pending todo
        setPendingTodoIds((prev) => new Set(prev).add(tempId));

        return { previousTodos, tempId };
      },
      onError: (err, _variables, context) => {
        if (context?.previousTodos) {
          queryClient.setQueryData(
            getAllTodosOptions.queryKey,
            context.previousTodos
          );
        }
        // Remove from pending todos
        if (context?.tempId) {
          setPendingTodoIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(context.tempId);
            return newSet;
          });
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
      },
      onSuccess: (_data, _variables, context) => {
        // Remove from pending todos when successful
        if (context?.tempId) {
          setPendingTodoIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(context.tempId);
            return newSet;
          });
        }
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

  const addTodo = (text: string) => {
    createMutation.mutate({ text });
  };

  const toggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const deleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return {
    todos: todos.data || [],
    isLoading: todos.isLoading,
    pendingTodoIds,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}
