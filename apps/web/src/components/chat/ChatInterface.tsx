import { Chat } from "./Chat";

interface ChatInterfaceProps {
  spaceId: string;
  conversationId: string;
  hasDocuments: boolean;
}

export function ChatInterface({
  spaceId,
  conversationId,
  hasDocuments,
}: ChatInterfaceProps) {
  // Empty state when no documents uploaded
  if (!hasDocuments) {
    return <Chat.EmptyState />;
  }

  return (
    <Chat.Root
      conversationId={conversationId}
      hasDocuments={hasDocuments}
      spaceId={spaceId}
    >
      <Chat.Messages />
      <Chat.LoadingIndicator />
      <Chat.ErrorDisplay />
      <Chat.Input />
    </Chat.Root>
  );
}
