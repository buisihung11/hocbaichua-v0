import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { useChatContext } from "./chat.context";

interface ChatInputProps {
  className?: string;
}

export function ChatInput({ className }: ChatInputProps) {
  const { input, setInput, askMutation, hasDocuments, handleSubmit } =
    useChatContext();

  const handlePromptSubmit = (_message: PromptInputMessage) => {
    // Create synthetic form event for handleSubmit
    const fakeEvent = {
      preventDefault: () => {
        // noop
      },
    } as React.FormEvent<HTMLFormElement>;
    handleSubmit(fakeEvent);
  };

  return (
    <div className={cn("border-t p-4", className)}>
      <div className="mx-auto max-w-3xl">
        <PromptInput className="relative" onSubmit={handlePromptSubmit}>
          <PromptInputTextarea
            className="pr-12"
            disabled={askMutation.isPending || !hasDocuments}
            onChange={(e) =>
              // biome-ignore lint/suspicious/noExplicitAny: event type is complex
              setInput((e.target as any).value)
            }
            placeholder="Ask a question..."
            value={input}
          />
          <PromptInputSubmit
            className="absolute right-1 bottom-1"
            disabled={!(input.trim() && hasDocuments)}
            status={askMutation.isPending ? "streaming" : "ready"}
          />
        </PromptInput>
      </div>
    </div>
  );
}
