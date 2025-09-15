"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TodoFormProps = {
  onAddTodo: (text: string) => void;
  disabled?: boolean;
};

export function TodoForm({ onAddTodo, disabled }: TodoFormProps) {
  const [newTodoText, setNewTodoText] = useState("");
  const [inputError, setInputError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      onAddTodo(newTodoText);
      setNewTodoText("");
      setInputError(""); // Clear error when attempting to add
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoText(e.target.value);
    if (inputError) {
      setInputError("");
    }
  };

  return (
    <form className="mb-6 flex items-center space-x-2" onSubmit={handleSubmit}>
      <div className="flex-1">
        <Input
          className={inputError ? "border-red-500 focus:border-red-500" : ""}
          disabled={disabled}
          onChange={handleInputChange}
          placeholder="Add a new task..."
          value={newTodoText}
        />
        {inputError && (
          <p className="mt-1 text-red-600 text-sm">{inputError}</p>
        )}
      </div>
      <Button disabled={!newTodoText.trim() || disabled} type="submit">
        Add
      </Button>
    </form>
  );
}
