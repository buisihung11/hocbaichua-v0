import { Loader } from "@/components/ai-elements/loader";
import {
  Message as AIMessage,
  MessageContent,
} from "@/components/ai-elements/message";
import { CitationList } from "./CitationList";
import type { Message } from "./chat.types";
import { MarkdownMessage } from "./MarkdownMessage";

interface ChatMessageProps {
  message: Message;
  showTimestamp: boolean;
  onCitationNavigate: (chunkId: number) => void;
}

export function ChatMessage({
  message,
  showTimestamp,
  onCitationNavigate,
}: ChatMessageProps) {
  return (
    <div>
      {showTimestamp && message.timestamp && (
        <div className="mb-2 text-center text-muted-foreground text-xs">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
      <AIMessage from={message.role}>
        <MessageContent>
          {message.content ? (
            message.role === "user" ? (
              <div className="wrap-break-word whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            ) : (
              <MarkdownMessage className="text-sm" content={message.content} />
            )
          ) : (
            <Loader />
          )}
        </MessageContent>
        {message.role === "assistant" &&
          message.citations &&
          message.citations.length > 0 && (
            <div className="mt-2">
              <CitationList
                citations={message.citations}
                onNavigate={onCitationNavigate}
              />
            </div>
          )}
      </AIMessage>
    </div>
  );
}
