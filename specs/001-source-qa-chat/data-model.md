# Data Model: Source-Based Q&A Chat with Citations

**Branch**: `001-source-qa-chat` | **Date**: December 16, 2025  
**Status**: Phase 1 Design

This document defines the database schema for the Q&A chat feature, including conversations, messages, and citations.

---

## Database Provider

- **Database**: PostgreSQL (via Supabase)
- **ORM**: Drizzle ORM
- **Location**: `/packages/db/src/schema/chat.ts`
- **Extension**: pgvector (already installed for document embeddings)

---

## Entity Relationship Diagram

```
┌─────────┐         ┌──────────────┐         ┌─────────┐
│  user   │────────<│ conversation │>────────│  space  │
└─────────┘         └──────────────┘         └─────────┘
                            │
                            │ 1:N
                            ▼
                    ┌─────────────┐
                    │   message   │
                    └─────────────┘
                            │
                            │ 1:N
                            ▼
                    ┌─────────────┐         ┌──────────────────┐
                    │  citation   │>────────│ document_chunk   │
                    └─────────────┘         └──────────────────┘
```

---

## Schema Definitions

### 1. Conversation Table

**Table Name**: `conversation`

Represents a Q&A session within a space. Groups related questions and answers together for context.

```typescript
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { space } from "./space";

export const conversation = pgTable(
  "conversation",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    title: text("title"), // Optional: Auto-generated from first question
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("conversation_user_idx").on(table.userId),
    index("conversation_space_idx").on(table.spaceId),
    index("conversation_updated_at_idx").on(table.updatedAt),
  ]
);
```

**Columns**:

| Column      | Type        | Constraints           | Description                                               |
| ----------- | ----------- | --------------------- | --------------------------------------------------------- |
| `id`        | `text`      | PRIMARY KEY, NOT NULL | Unique conversation identifier (nanoid)                   |
| `title`     | `text`      | NULLABLE              | Auto-generated from first question (e.g., first 50 chars) |
| `spaceId`   | `text`      | NOT NULL, FOREIGN KEY | Reference to space (cascade delete)                       |
| `userId`    | `text`      | NOT NULL, FOREIGN KEY | Owner of conversation (cascade delete)                    |
| `createdAt` | `timestamp` | NOT NULL              | Conversation creation timestamp                           |
| `updatedAt` | `timestamp` | NOT NULL              | Last message timestamp (for sorting recent conversations) |

**Relationships**:

- `userId` → `user.id` (CASCADE DELETE)
- `spaceId` → `space.id` (CASCADE DELETE)
- One conversation has many messages (one-to-many)

**Indexes**:

- `conversation_user_idx`: Fast lookup of user's conversations
- `conversation_space_idx`: Filter conversations by space
- `conversation_updated_at_idx`: Sort by recent activity

**Business Rules**:

- A conversation belongs to exactly one space
- A conversation belongs to exactly one user
- When space is deleted, all conversations are deleted
- When user is deleted, all conversations are deleted

---

### 2. Message Table

**Table Name**: `message`

Individual question or answer within a conversation. Stores both user questions and AI-generated responses.

```typescript
import {
  pgTable,
  integer,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const message = pgTable(
  "message",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(), // Markdown text (user question or AI answer)
    metadata: jsonb("metadata"), // Optional: { model: 'gemini-2.0-flash', tokens: 1234, processingTime: 2.5 }
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("message_conversation_idx").on(table.conversationId),
    index("message_created_at_idx").on(table.createdAt),
  ]
);
```

**Columns**:

| Column           | Type        | Constraints                 | Description                                                |
| ---------------- | ----------- | --------------------------- | ---------------------------------------------------------- |
| `id`             | `integer`   | PRIMARY KEY, AUTO-INCREMENT | Unique message identifier                                  |
| `conversationId` | `text`      | NOT NULL, FOREIGN KEY       | Reference to conversation (cascade delete)                 |
| `role`           | `enum`      | NOT NULL                    | 'user' or 'assistant'                                      |
| `content`        | `text`      | NOT NULL                    | Message text (markdown for assistant, plain text for user) |
| `metadata`       | `jsonb`     | NULLABLE                    | Optional: model name, token count, processing time         |
| `createdAt`      | `timestamp` | NOT NULL                    | Message creation timestamp                                 |

**Relationships**:

- `conversationId` → `conversation.id` (CASCADE DELETE)
- One message has many citations (one-to-many)

**Indexes**:

- `message_conversation_idx`: Fast lookup of all messages in a conversation
- `message_created_at_idx`: Sort messages chronologically

**Metadata Structure** (optional JSONB):

```typescript
{
  model?: string;            // e.g., 'gemini-2.0-flash-exp'
  tokensUsed?: number;       // LLM token count
  processingTimeMs?: number; // Response generation time
  vectorSearchTimeMs?: number; // Vector similarity search time
  chunksRetrieved?: number;  // Number of document chunks used
}
```

**Business Rules**:

- User messages are always plain text
- Assistant messages can contain markdown formatting
- Messages are immutable (no edits after creation)
- Messages are ordered by `createdAt` within conversation
- When conversation is deleted, all messages are deleted

---

### 3. Citation Table

**Table Name**: `citation`

Links assistant messages to specific document chunks used as sources. Enables users to trace answers back to original documents.

```typescript
import { pgTable, integer, text, real, index } from "drizzle-orm/pg-core";
import { documentChunk } from "./space";

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
    relevanceScore: real("relevance_score").notNull(), // Cosine similarity score (0-1)
    excerpt: text("excerpt").notNull(), // Text excerpt from chunk shown to user (max 200 chars)
    citationIndex: integer("citation_index").notNull(), // Order in message (1, 2, 3...)
  },
  (table) => [
    index("citation_message_idx").on(table.messageId),
    index("citation_chunk_idx").on(table.chunkId),
  ]
);
```

**Columns**:

| Column           | Type      | Constraints                 | Description                                                   |
| ---------------- | --------- | --------------------------- | ------------------------------------------------------------- |
| `id`             | `integer` | PRIMARY KEY, AUTO-INCREMENT | Unique citation identifier                                    |
| `messageId`      | `integer` | NOT NULL, FOREIGN KEY       | Reference to assistant message (cascade delete)               |
| `chunkId`        | `integer` | NOT NULL, FOREIGN KEY       | Reference to document chunk (cascade delete)                  |
| `relevanceScore` | `real`    | NOT NULL                    | Cosine similarity score (0.0-1.0) from vector search          |
| `excerpt`        | `text`    | NOT NULL                    | User-facing text excerpt from chunk (truncated to ~200 chars) |
| `citationIndex`  | `integer` | NOT NULL                    | Display order in message (1, 2, 3...)                         |

**Relationships**:

- `messageId` → `message.id` (CASCADE DELETE)
- `chunkId` → `documentChunk.id` (CASCADE DELETE)

**Indexes**:

- `citation_message_idx`: Fast lookup of all citations for a message
- `citation_chunk_idx`: Track which chunks are cited (analytics)

**Business Rules**:

- Citations only exist for assistant messages (not user messages)
- A message can have 0-10 citations (typically 1-5)
- Citations are ordered by `citationIndex` for display
- When message is deleted, all citations are deleted
- When chunk is deleted (document removed), citations are also deleted
- `relevanceScore` must be >= 0.7 (70% similarity threshold)

---

## Drizzle Relations

**File**: `/packages/db/src/schema/relations.ts`

```typescript
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { space, document, documentChunk } from "./space";
import { conversation, message, citation } from "./chat";

// Conversation relations
export const conversationRelations = relations(
  conversation,
  ({ one, many }) => ({
    user: one(user, {
      fields: [conversation.userId],
      references: [user.id],
    }),
    space: one(space, {
      fields: [conversation.spaceId],
      references: [space.id],
    }),
    messages: many(message),
  })
);

// Message relations
export const messageRelations = relations(message, ({ one, many }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  citations: many(citation),
}));

// Citation relations
export const citationRelations = relations(citation, ({ one }) => ({
  message: one(message, {
    fields: [citation.messageId],
    references: [message.id],
  }),
  chunk: one(documentChunk, {
    fields: [citation.chunkId],
    references: [documentChunk.id],
  }),
}));
```

---

## Migration Strategy

### Migration File: `0003_add_chat_schema.sql`

```sql
-- Create message role enum
CREATE TYPE message_role AS ENUM ('user', 'assistant');

-- Create conversation table
CREATE TABLE conversation (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  space_id TEXT NOT NULL REFERENCES space(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX conversation_user_idx ON conversation(user_id);
CREATE INDEX conversation_space_idx ON conversation(space_id);
CREATE INDEX conversation_updated_at_idx ON conversation(updated_at);

-- Create message table
CREATE TABLE message (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  conversation_id TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX message_conversation_idx ON message(conversation_id);
CREATE INDEX message_created_at_idx ON message(created_at);

-- Create citation table
CREATE TABLE citation (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  message_id INTEGER NOT NULL REFERENCES message(id) ON DELETE CASCADE,
  chunk_id INTEGER NOT NULL REFERENCES document_chunk(id) ON DELETE CASCADE,
  relevance_score REAL NOT NULL,
  excerpt TEXT NOT NULL,
  citation_index INTEGER NOT NULL
);

CREATE INDEX citation_message_idx ON citation(message_id);
CREATE INDEX citation_chunk_idx ON citation(chunk_id);
```

**Run Migration**:

```bash
bun run db:generate  # Generate migration from schema
bun run db:migrate   # Apply to database
```

---

## Query Patterns

### Get Conversation with Messages and Citations

```typescript
const conversationWithMessages = await db.query.conversation.findFirst({
  where: eq(conversation.id, conversationId),
  with: {
    messages: {
      orderBy: [asc(message.createdAt)],
      with: {
        citations: {
          orderBy: [asc(citation.citationIndex)],
          with: {
            chunk: {
              with: {
                document: true,
              },
            },
          },
        },
      },
    },
  },
});
```

### List User's Recent Conversations

```typescript
const recentConversations = await db.query.conversation.findMany({
  where: eq(conversation.userId, userId),
  orderBy: [desc(conversation.updatedAt)],
  limit: 20,
  with: {
    space: true,
    messages: {
      limit: 1, // Only first message for preview
      orderBy: [asc(message.createdAt)],
    },
  },
});
```

### Get Citations for a Message

```typescript
const messageCitations = await db.query.citation.findMany({
  where: eq(citation.messageId, messageId),
  orderBy: [asc(citation.citationIndex)],
  with: {
    chunk: {
      with: {
        document: true,
      },
    },
  },
});
```

---

## Data Size Estimates

### Storage Projections (per 1000 users)

| Table        | Rows/User                | Avg Row Size | Total Size (1000 users) |
| ------------ | ------------------------ | ------------ | ----------------------- |
| conversation | 10                       | ~200 bytes   | ~2 MB                   |
| message      | 200 (10 convs × 20 msgs) | ~500 bytes   | ~100 MB                 |
| citation     | 400 (200 msgs × 2 cites) | ~300 bytes   | ~120 MB                 |
| **Total**    |                          |              | **~222 MB**             |

**Notes**:

- Assumes 10 conversations per user with 20 messages each
- Actual size depends on message length (markdown content)
- Citations are relatively small (excerpt + metadata)
- Indexes add ~20% overhead

---

## Performance Considerations

### Indexing Strategy

1. **Conversation Lookup**: `conversation_user_idx` + `conversation_space_idx`
   - Query: "Show me my conversations in this space"
   - Performance: O(log n) via B-tree index

2. **Message Retrieval**: `message_conversation_idx` + `message_created_at_idx`
   - Query: "Load all messages in conversation, chronologically"
   - Performance: O(log n) lookup + sequential scan

3. **Citation Display**: `citation_message_idx` + `citation_chunk_idx`
   - Query: "Show citations for this message"
   - Performance: O(1) for small result sets (1-10 citations)

### Partitioning (Future Optimization)

For scale beyond 100K conversations:

- Partition `message` table by `conversation_id` range
- Archive old conversations (>6 months inactive)
- Consider read replicas for conversation history queries

---

## Validation Rules

### Conversation

- `title`: Max 200 characters (auto-truncated)
- `spaceId`: Must reference existing space
- `userId`: Must reference existing user

### Message

- `content`: Max 50,000 characters (reasonable LLM output limit)
- `role`: Must be 'user' or 'assistant'
- `conversationId`: Must reference existing conversation

### Citation

- `relevanceScore`: Must be between 0.0 and 1.0
- `excerpt`: Max 200 characters (enforced in app logic)
- `citationIndex`: Must be >= 1 (1-indexed for display)
- Unique constraint: `(messageId, citationIndex)` - no duplicate indexes

---

## TypeScript Types

**File**: `/packages/db/src/types/chat.ts`

```typescript
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { conversation, message, citation } from "../schema/chat";

// Select types (DB → App)
export type Conversation = InferSelectModel<typeof conversation>;
export type Message = InferSelectModel<typeof message>;
export type Citation = InferSelectModel<typeof citation>;

// Insert types (App → DB)
export type NewConversation = InferInsertModel<typeof conversation>;
export type NewMessage = InferInsertModel<typeof message>;
export type NewCitation = InferInsertModel<typeof citation>;

// Composite types for UI
export type MessageWithCitations = Message & {
  citations: (Citation & {
    chunk: {
      id: number;
      content: string;
      document: {
        id: number;
        title: string;
        fileUrl?: string;
      };
    };
  })[];
};

export type ConversationWithMessages = Conversation & {
  messages: MessageWithCitations[];
  space: {
    id: string;
    name: string;
  };
};
```

---

## Summary

### New Tables: 3

1. **conversation** - Q&A sessions within spaces
2. **message** - Individual questions and answers
3. **citation** - Links messages to source document chunks

### Key Design Decisions

- ✅ Cascade deletes ensure referential integrity
- ✅ Indexes optimized for common queries (user's conversations, message history)
- ✅ JSONB metadata for extensibility without schema changes
- ✅ Immutable messages (no edits, only create)
- ✅ Citations track relevance scores for analytics
- ✅ Markdown stored in `content` column for flexible formatting

### Next Steps (Phase 1 Continued)

1. ✅ **data-model.md complete** - Schema defined
2. → **contracts/** - API contracts for tRPC procedures
3. → **quickstart.md** - Implementation guide
4. → **Update agent context** - Add new schema to copilot context
