import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { timestampColumns } from "../helpers/columns.helper";
import { conversation } from "./conversation";

/**
 * Message role enum
 */
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

/**
 * Message table
 * Stores individual questions (user role) and answers (assistant role) within a conversation
 */
export const message = pgTable(
  "message",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    // Metadata for assistant messages: model used, processing time, chunks retrieved, etc.
    metadata: jsonb("metadata").$type<{
      model?: string;
      processingTimeMs?: number;
      vectorSearchTimeMs?: number;
      chunksRetrieved?: number;
    }>(),
    ...timestampColumns,
  },
  (table) => [
    index("message_conversation_id_idx").on(table.conversationId),
    index("message_created_at_idx").on(table.createdAt),
  ]
);
