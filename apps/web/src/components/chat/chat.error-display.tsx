import { IconAlertCircle } from "@tabler/icons-react";
import { useChatContext } from "./chat.context";

export function ChatErrorDisplay() {
  const { askMutation } = useChatContext();

  if (!askMutation.isError) return null;

  return (
    <div className="border-t bg-destructive/10 px-4 py-2">
      <div className="mx-auto flex max-w-3xl items-center gap-2 text-destructive text-sm">
        <IconAlertCircle className="size-4" />
        <span>
          {askMutation.error instanceof Error
            ? askMutation.error.message
            : "An error occurred"}
        </span>
      </div>
    </div>
  );
}
