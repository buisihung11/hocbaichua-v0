import type { UseMutationResult } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import type { Message } from "./chat.types";

export interface ChatContextValue {
  spaceId: string;
  conversationId: string | undefined;
  hasDocuments: boolean;
  messages: Message[];
  setMessages: () => void;
  input: string;
  setInput: (input: string) => void;
  isLoadingHistory: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: mutation type is too complex to type correctly
  askMutation: UseMutationResult<any, any, any, any>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleCitationNavigate: (chunkId: number) => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("Chat components must be used within Chat.Root");
  }
  return context;
};
