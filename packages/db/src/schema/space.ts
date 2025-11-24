import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { timestampColumns } from "../helpers/columns.helper";
import { user } from "./auth";
// TODO Fix the id of space reference in document table after migration
// Then add it in the payload of insert document API
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

export const documentTypeEnum = pgEnum("document_type", [
  "EXTENSION",
  "CRAWLED_URL",
  "FILE",
  "YOUTUBE_VIDEO",
]);

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
    ...timestampColumns,
  },
  (table) => [
    index("document_title_idx").on(table.title),
    index("document_space_id_idx").on(table.spaceId),
    index("document_type_idx").on(table.documentType),
  ]
);
