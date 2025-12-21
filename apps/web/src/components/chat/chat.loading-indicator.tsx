import { Loader } from "@/components/ai-elements/loader";
import { useChatContext } from "./chat.context";

export function ChatLoadingIndicator() {
  const { askMutation } = useChatContext();

  if (!askMutation.isPending) return null;

  return (
    <div className="border-t px-4 py-2">
      <div className="mx-auto flex max-w-3xl items-center gap-2 text-muted-foreground text-sm">
        <Loader />
        <span>Thinking...</span>
      </div>
    </div>
  );
}
