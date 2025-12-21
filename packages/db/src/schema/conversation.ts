import { index, pgTable, text } from "drizzle-orm/pg-core";
import { timestampColumns } from "../helpers/columns.helper";
import { user } from "./auth";
import { space } from "./space";

/**
 * Conversation table
 * Represents a Q&A chat session within a space
 */
export const conversation = pgTable(
  "conversation",
  {
    id: text("id").primaryKey(),
    title: text("title"), // Optional: Auto-generated from first message or user-provided
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestampColumns,
  },
  (table) => [
    index("conversation_space_id_idx").on(table.spaceId),
    index("conversation_user_id_idx").on(table.userId),
    index("conversation_updated_at_idx").on(table.updatedAt),
  ]
);
