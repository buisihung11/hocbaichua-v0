import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useTRPC } from "@/utils/trpc";
import { ChatContext } from "./chat.context";
import type { CitationData, Message } from "./chat.types";

interface ChatRootProps {
  spaceId: string;
  conversationId: string;
  hasDocuments: boolean;
  children: ReactNode;
}

export function ChatRoot({
  spaceId,
  conversationId,
  hasDocuments,
  children,
}: ChatRootProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  // Local state for optimistic updates
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  const { data: rawMessages = [], isLoading: isLoadingHistory } = useQuery(
    trpc.chat.message.list.queryOptions({
      conversationId,
    })
  );

  // Transform raw messages to Message format and merge with optimistic updates
  const messagesFromQuery = rawMessages.map((msg) => ({
    id: msg.id.toString(),
    role: msg.role as "user" | "assistant",
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    citations: undefined as CitationData[] | undefined,
  }));

  // Combine persisted messages with optimistic updates
  const messages = [...messagesFromQuery, ...optimisticMessages];

  // Define tRPC mutation
  const askMutation = useMutation(
    trpc.chat.message.ask.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.conversation.list.queryKey(),
        });
      },
    })
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!(input.trim() && hasDocuments) || askMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // Add messages to optimistic state
    setOptimisticMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const response = await askMutation.mutateAsync({
        spaceId,
        conversationId,
        question: userMessage,
      });

      // Update optimistic message with actual response
      setOptimisticMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsg.id
            ? {
                ...msg,
                content: response.answer,
                citations: response.citations as CitationData[],
              }
            : msg
        )
      );

      // Invalidate query to refetch fresh data
      queryClient.invalidateQueries(
        trpc.chat.message.list.queryOptions({
          conversationId,
        })
      );
    } catch {
      // Remove failed messages from optimistic state on error
      setOptimisticMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== assistantMsg.id && msg.id !== userMsg.id
        )
      );
    }
  };

  const handleCitationNavigate = (chunkId: number) => {
    console.log("Navigate to chunk:", chunkId);
  };

  // No-op setMessages - state is managed by React Query
  const setMessages = () => {
    // noop
  };

  const contextValue = {
    spaceId,
    conversationId,
    hasDocuments,
    messages,
    setMessages,
    input,
    setInput,
    isLoadingHistory,
    askMutation,
    handleSubmit,
    handleCitationNavigate,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      <div className="flex h-full flex-col">{children}</div>
    </ChatContext.Provider>
  );
}
