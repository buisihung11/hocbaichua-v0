import { index, integer, pgTable, real, text } from "drizzle-orm/pg-core";
import { message } from "./message";
import { documentChunk } from "./space";

/**
 * Citation table
 * Links assistant messages to source document chunks used for answer generation
 */
export const citation = pgTable(
  "citation",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer("message_id")
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    chunkId: integer("chunk_id")
      .notNull()
      .references(() => documentChunk.id, { onDelete: "cascade" }),
    relevanceScore: real("relevance_score").notNull(), // Cosine similarity score
    excerpt: text("excerpt").notNull(), // Preview text shown to user
    citationIndex: integer("citation_index").notNull(), // Order in citation list (1, 2, 3, ...)
  },
  (table) => [
    index("citation_message_id_idx").on(table.messageId),
    index("citation_chunk_id_idx").on(table.chunkId),
  ]
);
