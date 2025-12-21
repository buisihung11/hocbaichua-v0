import { router } from "../index";
import { conversationRouter } from "./conversation";
import { messageRouter } from "./message";

/**
 * Chat router
 * Combines conversation and message routers for Q&A chat functionality
 */
export const chatRouter = router({
  conversation: conversationRouter,
  message: messageRouter,
});
