import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { timestampColumns } from "../helpers/columns.helper";
import { user } from "./auth";

// Space table for organizing documents
export const space = pgTable("space", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestampColumns,
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// Document type enum
export const documentTypeEnum = pgEnum("document_type", [
  "EXTENSION",
  "CRAWLED_URL",
  "FILE",
  "YOUTUBE_VIDEO",
]);

// Document processing status enum
export const documentStatusEnum = pgEnum("document_status", [
  "UPLOADED",
  "EXTRACTING",
  "CHUNKING",
  "EMBEDDING",
  "READY",
  "ERROR",
]);

// Document table with processing status columns
export const document = pgTable(
  "document",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: text("title").notNull(),
    documentType: documentTypeEnum("document_type").notNull(),
    documentMetadata: jsonb("document_metadata"),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull().unique(),
    uniqueIdentifierHash: text("unique_identifier_hash").notNull().unique(),
    // File upload specific fields
    fileUrl: text("file_url"),
    fileKey: text("file_key"),
    fileSize: text("file_size"),
    fileMimeType: text("file_mime_type"),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    // Processing status fields
    processingStatus: documentStatusEnum("processing_status")
      .notNull()
      .default("UPLOADED"),
    processingError: jsonb("processing_error"),
    chunkCount: integer("chunk_count").notNull().default(0),
    ...timestampColumns,
  },
  (table) => [
    index("document_title_idx").on(table.title),
    index("document_space_id_idx").on(table.spaceId),
    index("document_type_idx").on(table.documentType),
    index("document_status_idx").on(table.processingStatus),
  ]
);

// Document chunk table for storing chunked content with embeddings
export const documentChunk = pgTable(
  "document_chunk",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    documentId: integer("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    tokenCount: integer("token_count"),
    metadata: jsonb("metadata"),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("chunk_document_id_idx").on(table.documentId),
    index("chunk_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);
