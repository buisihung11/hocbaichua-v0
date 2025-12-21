import { MessageSquare } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useChatContext } from "./chat.context";
import { ChatMessage } from "./chat.message";

interface ChatMessagesProps {
  className?: string;
}

export function ChatMessages({ className }: ChatMessagesProps) {
  const { messages, isLoadingHistory, conversationId, handleCitationNavigate } =
    useChatContext();

  if (isLoadingHistory) {
    return (
      <Conversation className={cn(className)}>
        <ConversationContent>
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div className="flex w-full flex-col gap-4" key={i}>
                <div className="flex w-full flex-col items-end">
                  <Skeleton className="h-16 w-[60%] rounded-lg" />
                </div>
                <div className="flex w-full flex-col items-start">
                  <Skeleton className="h-24 w-[80%] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </ConversationContent>
      </Conversation>
    );
  }

  if (messages.length === 0) {
    return (
      <Conversation className={cn(className)}>
        <ConversationContent>
          <ConversationEmptyState
            description={
              conversationId
                ? "Conversation context enabled - follow-up questions remember previous exchanges"
                : "Start asking questions to get answers from your documents"
            }
            icon={<MessageSquare className="size-12" />}
            title="Ask a question about your documents"
          />
        </ConversationContent>
      </Conversation>
    );
  }

  return (
    <Conversation className={cn(className)}>
      <ConversationContent>
        {messages.map((message, index) => {
          const previousMessage = messages[index - 1];
          const showTimestamp =
            index === 0 ||
            !previousMessage?.timestamp ||
            !message.timestamp ||
            (previousMessage.timestamp &&
              message.timestamp.getTime() -
                previousMessage.timestamp.getTime() >
                5 * 60 * 1000);

          return (
            <ChatMessage
              key={message.id}
              message={message}
              onCitationNavigate={handleCitationNavigate}
              showTimestamp={showTimestamp}
            />
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
