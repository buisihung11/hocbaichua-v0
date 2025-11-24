import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/utils/trpc";

type CreateSpaceDialogProps = {
  children?: React.ReactNode;
  onSuccess?: (spaceId: string) => void;
};

export function CreateSpaceDialog({
  children,
  onSuccess,
}: CreateSpaceDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation(
    trpc.space.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["space", "list"] });
        setOpen(false);
        setName("");
        setDescription("");
        onSuccess?.(data.id);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Space</DialogTitle>
            <DialogDescription>
              Create a new space to organize your documents and research.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Space Name <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                disabled={createMutation.isPending}
                id="name"
                onChange={(e) => {
                  setName((e.target as HTMLInputElement).value);
                }}
                placeholder="e.g., Research Project, Personal Notes"
                required
                value={name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={createMutation.isPending}
                id="description"
                onChange={(e) => {
                  setDescription((e.target as HTMLTextAreaElement).value);
                }}
                placeholder="Optional description for your space"
                rows={3}
                value={description}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={createMutation.isPending}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
