// Export compound component

import { ChatEmptyState } from "./chat.empty-state";
import { ChatErrorDisplay } from "./chat.error-display";
import { ChatInput } from "./chat.input";
import { ChatLoadingIndicator } from "./chat.loading-indicator";
import { ChatMessages } from "./chat.messages";
import { ChatRoot } from "./chat.root";

type ChatCompoundComponent = {
  Root: typeof ChatRoot;
  Messages: typeof ChatMessages;
  Input: typeof ChatInput;
  LoadingIndicator: typeof ChatLoadingIndicator;
  ErrorDisplay: typeof ChatErrorDisplay;
  EmptyState: typeof ChatEmptyState;
};

const Chat: ChatCompoundComponent = {
  Root: ChatRoot,
  Messages: ChatMessages,
  Input: ChatInput,
  LoadingIndicator: ChatLoadingIndicator,
  ErrorDisplay: ChatErrorDisplay,
  EmptyState: ChatEmptyState,
};

export { Chat };
