import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationListItem } from "./ConversationListItem";

interface ConversationData {
  id: string;
  title: string | null;
  updatedAt: string;
  messages: Array<{ content: string }>;
}

interface ConversationListProps {
  conversations: ConversationData[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    const titleMatch = conv.title
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const messageMatch = conv.messages[0]?.content
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return titleMatch || messageMatch;
  });

  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="border-b p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Conversations</h3>
          <Button
            aria-label="New conversation"
            onClick={onNewConversation}
            size="icon-sm"
          >
            <IconPlus className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <IconSearch className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "No conversations found"
                  : "No conversations yet"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationListItem
                id={conv.id}
                isActive={conv.id === activeConversationId}
                key={conv.id}
                messagePreview={conv.messages[0]?.content}
                onDelete={onDeleteConversation}
                onSelect={onSelectConversation}
                title={conv.title}
                updatedAt={new Date(conv.updatedAt)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
