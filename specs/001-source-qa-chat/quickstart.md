# Developer Quickstart: Q&A Chat Feature

**Branch**: `001-source-qa-chat` | **Date**: December 16, 2025  
**Status**: Phase 1 Design

This guide provides step-by-step instructions for implementing the Q&A chat feature with streaming responses and citations.

---

## Prerequisites

- [x] Document ingestion feature complete (002-document-ingestion)
- [x] Existing schema: `document`, `documentChunk` with embeddings
- [x] pgvector extension enabled in PostgreSQL
- [x] LangChain dependencies installed for backend (`@langchain/google-genai`, `@langchain/core`)
- [x] AI SDK installed for frontend UI only (`@ai-sdk/react`)
- [x] Google AI API key configured in `.env`

---

## Implementation Roadmap

### Phase 1: Database Schema ⏱️ 2-3 hours

1. Create chat schema file
2. Generate and run migrations
3. Add Drizzle relations
4. Test schema with seed data

### Phase 2: Backend API ⏱️ 4-6 hours

1. Implement tRPC chat router
2. Add vector search helper
3. Implement streaming procedure
4. Add rate limiting middleware

### Phase 3: Frontend UI ⏱️ 6-8 hours

1. Create chat components
2. Integrate useChat hook
3. Implement markdown rendering
4. Add citation display
5. Apply accessibility patterns

### Phase 4: Testing ⏱️ 3-4 hours

1. Write unit tests for business logic
2. Test tRPC procedures with mocks
3. Test React components
4. Accessibility testing

**Total Estimated Time**: 15-21 hours

---

## Step 1: Database Schema (2-3 hours)

### 1.1 Create Schema File

**File**: `packages/db/src/schema/chat.ts`

```typescript
import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  real,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { timestampColumns } from "../helpers/columns.helper";
import { user } from "./auth";
import { space, documentChunk } from "./space";

// Message role enum
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

// Conversation table
export const conversation = pgTable(
  "conversation",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    title: text("title"),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestampColumns,
  },
  (table) => [
    index("conversation_user_idx").on(table.userId),
    index("conversation_space_idx").on(table.spaceId),
    index("conversation_updated_at_idx").on(table.updatedAt),
  ]
);

// Message table
export const message = pgTable(
  "message",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<{
      model?: string;
      tokensUsed?: number;
      processingTimeMs?: number;
      vectorSearchTimeMs?: number;
      chunksRetrieved?: number;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("message_conversation_idx").on(table.conversationId),
    index("message_created_at_idx").on(table.createdAt),
  ]
);

// Citation table
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
    relevanceScore: real("relevance_score").notNull(),
    excerpt: text("excerpt").notNull(),
    citationIndex: integer("citation_index").notNull(),
  },
  (table) => [
    index("citation_message_idx").on(table.messageId),
    index("citation_chunk_idx").on(table.chunkId),
  ]
);
```

### 1.2 Add Drizzle Relations

**File**: `packages/db/src/schema/relations.ts` (append to existing file)

```typescript
import { relations } from "drizzle-orm";
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

### 1.3 Export Schema

**File**: `packages/db/src/schema/index.ts` (add to exports)

```typescript
export * from "./chat";
```

### 1.4 Generate and Run Migration

```bash
# Generate migration SQL
bun run db:generate

# Review the generated migration in packages/db/src/migrations/

# Apply migration to database
bun run db:migrate
```

### 1.5 Verify Schema

```bash
# Open Drizzle Studio to inspect tables
bun run db:studio
```

**Check**: Navigate to `conversation`, `message`, `citation` tables and verify structure.

---

## Step 2: Backend API (4-6 hours)

### 2.1 Create Vector Search Helper

**File**: `packages/api/src/lib/vector-search.ts`

```typescript
import { db } from "@hocbaichua-v0/db";
import { documentChunk, document } from "@hocbaichua-v0/db/schema";
import { sql, eq } from "drizzle-orm";
import { generateEmbedding } from "./embeddings";

export interface SearchResult {
  chunkId: number;
  content: string;
  documentId: number;
  documentTitle: string;
  similarity: number;
}

export async function vectorSearch(
  questionText: string,
  spaceId: string,
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<SearchResult[]> {
  // Generate embedding for question
  const embedding = await generateEmbedding(questionText);
  const embeddingVector = `[${embedding.join(",")}]`;

  // Perform vector similarity search
  const results = await db
    .select({
      chunkId: documentChunk.id,
      content: documentChunk.content,
      documentId: documentChunk.documentId,
      documentTitle: document.title,
      similarity: sql<number>`1 - (${documentChunk.embedding} <=> ${embeddingVector}::vector)`,
    })
    .from(documentChunk)
    .innerJoin(document, eq(document.id, documentChunk.documentId))
    .where(eq(document.spaceId, spaceId))
    .orderBy(sql`${documentChunk.embedding} <=> ${embeddingVector}::vector`)
    .limit(topK);

  // Filter by minimum similarity threshold
  return results.filter((r) => r.similarity >= minSimilarity);
}
```

### 2.2 Create Embedding Helper (if not exists)

**File**: `packages/api/src/lib/embeddings.ts`

```typescript
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const embedding = await embeddings.embedQuery(text);
  return embedding;
}
```

### 2.3 Create Conversation Router

**File**: `packages/api/src/routers/conversation.ts`

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@hocbaichua-v0/db";
import { conversation, message } from "@hocbaichua-v0/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const conversationRouter = router({
  // Create conversation
  create: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        title: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access to space
      const space = await db.query.space.findFirst({
        where: and(eq(space.id, input.spaceId), eq(space.userId, ctx.userId)),
      });

      if (!space) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Space not found" });
      }

      const [newConversation] = await db
        .insert(conversation)
        .values({
          spaceId: input.spaceId,
          userId: ctx.userId,
          title: input.title,
        })
        .returning();

      return newConversation;
    }),

  // List conversations
  list: protectedProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const conversations = await db.query.conversation.findMany({
        where: and(
          eq(conversation.userId, ctx.userId),
          input.spaceId ? eq(conversation.spaceId, input.spaceId) : undefined,
          input.cursor ? sql`${conversation.id} < ${input.cursor}` : undefined
        ),
        orderBy: [desc(conversation.updatedAt)],
        limit: input.limit + 1,
        with: {
          space: true,
          messages: {
            limit: 1,
            orderBy: [asc(message.createdAt)],
          },
        },
      });

      let nextCursor: string | null = null;
      if (conversations.length > input.limit) {
        const nextItem = conversations.pop();
        nextCursor = nextItem!.id;
      }

      return { conversations, nextCursor };
    }),

  // Get single conversation
  get: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const conv = await db.query.conversation.findFirst({
        where: and(
          eq(conversation.id, input.conversationId),
          eq(conversation.userId, ctx.userId)
        ),
        with: {
          space: true,
          messages: {
            orderBy: [asc(message.createdAt)],
            with: {
              citations: {
                orderBy: [asc(citation.citationIndex)],
                with: {
                  chunk: {
                    with: { document: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!conv) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return conv;
    }),

  // Delete conversation
  delete: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const conv = await db.query.conversation.findFirst({
        where: and(
          eq(conversation.id, input.conversationId),
          eq(conversation.userId, ctx.userId)
        ),
      });

      if (!conv) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await db
        .delete(conversation)
        .where(eq(conversation.id, input.conversationId));

      return { success: true, deletedId: input.conversationId };
    }),
});
```

### 2.4 Create Message Router with Streaming

**File**: `packages/api/src/routers/message.ts`

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@hocbaichua-v0/db";
import { conversation, message, citation } from "@hocbaichua-v0/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { vectorSearch } from "../lib/vector-search";

// Initialize LangChain model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  temperature: 0,
  streaming: true,
});

export const messageRouter = router({
  // Ask question with streaming
  ask: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        question: z.string().min(1).max(2000),
        includeContext: z.boolean().default(true),
        contextLimit: z.number().min(1).max(10).default(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

      // 1. Verify conversation access
      const conv = await db.query.conversation.findFirst({
        where: and(
          eq(conversation.id, input.conversationId),
          eq(conversation.userId, ctx.userId)
        ),
        with: {
          space: true,
          messages: {
            orderBy: [desc(message.createdAt)],
            limit: input.contextLimit * 2,
          },
        },
      });

      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // 2. Create user message
      const [userMessage] = await db
        .insert(message)
        .values({
          conversationId: input.conversationId,
          role: "user",
          content: input.question,
        })
        .returning();

      // 3. Vector search for relevant chunks
      const vectorSearchStart = Date.now();
      const relevantChunks = await vectorSearch(
        input.question,
        conv.spaceId,
        5,
        0.7
      );
      const vectorSearchTime = Date.now() - vectorSearchStart;

      if (relevantChunks.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No relevant information found in your documents",
        });
      }

      // 4. Build context from chunks with source tracking
      const contextWithSources = relevantChunks
        .map(
          (chunk, idx) =>
            `[Source ${idx + 1} - ${chunk.documentTitle}]:\n${chunk.content}`
        )
        .join("\n\n");

      // 5. Build conversation history for LangChain
      const conversationHistory = input.includeContext
        ? conv.messages
            .reverse()
            .slice(0, input.contextLimit * 2)
            .map(
              (msg) =>
                [msg.role === "user" ? "human" : "ai", msg.content] as const
            )
        : [];

      // 6. Create RAG prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are a helpful AI assistant. Answer the user's question based ONLY on the provided context. 
If the context doesn't contain relevant information, say "I cannot find information about this in your uploaded sources."
When citing information, include the source number like [1] or [2] in your answer.

Context from documents:
{context}`,
        ],
        ...conversationHistory,
        ["human", "{question}"],
      ]);

      // 7. Create LangChain chain
      const chain = prompt.pipe(model).pipe(new StringOutputParser());

      // 8. Create assistant message placeholder
      const [assistantMessage] = await db
        .insert(message)
        .values({
          conversationId: input.conversationId,
          role: "assistant",
          content: "", // Will be updated after streaming
        })
        .returning();

      // 9. Stream response from LangChain
      const stream = await chain.stream({
        context: contextWithSources,
        question: input.question,
      });

      // 10. Convert LangChain stream to AI SDK compatible format
      let fullResponse = "";

      // Create readable stream compatible with AI SDK's useChat
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              fullResponse += chunk;
              // Send chunk in AI SDK format
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "text-delta", content: chunk })}\n\n`
                )
              );
            }

            // Send citations
            for (let i = 0; i < relevantChunks.length; i++) {
              const chunk = relevantChunks[i];
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "citation",
                    citation: {
                      chunkId: chunk.chunkId,
                      documentTitle: chunk.documentTitle,
                      excerpt: chunk.content.slice(0, 200),
                      relevanceScore: chunk.similarity,
                      citationIndex: i + 1,
                    },
                  })}\n\n`
                )
              );
            }

            // Send finish event
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "finish",
                  metadata: {
                    model: "gemini-2.0-flash-exp",
                    processingTimeMs: Date.now() - startTime,
                    vectorSearchTimeMs: vectorSearchTime,
                    chunksRetrieved: relevantChunks.length,
                  },
                })}\n\n`
              )
            );

            // Save final message and citations to database
            await db
              .update(message)
              .set({
                content: fullResponse,
                metadata: {
                  model: "gemini-2.0-flash-exp",
                  processingTimeMs: Date.now() - startTime,
                  vectorSearchTimeMs: vectorSearchTime,
                  chunksRetrieved: relevantChunks.length,
                },
              })
              .where(eq(message.id, assistantMessage.id));

            // Save citations
            for (let i = 0; i < relevantChunks.length; i++) {
              const chunk = relevantChunks[i];
              await db.insert(citation).values({
                messageId: assistantMessage.id,
                chunkId: chunk.chunkId,
                relevanceScore: chunk.similarity,
                excerpt: chunk.content.slice(0, 200),
                citationIndex: i + 1,
              });
            }

            // Update conversation
            await db
              .update(conversation)
              .set({ updatedAt: new Date() })
              .where(eq(conversation.id, input.conversationId));

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }),
});
```

````

### 2.5 Add Rate Limiting Middleware

**File**: `packages/api/src/middleware/rate-limit.ts`

```typescript
import { TRPCError } from '@trpc/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const questionRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
});

export async function rateLimitMiddleware(userId: string) {
  const { success, reset } = await questionRateLimit.limit(userId);

  if (!success) {
    const waitSeconds = Math.ceil((reset - Date.now()) / 1000);
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${waitSeconds}s`,
    });
  }
}
````

### 2.6 Create Chat Router

**File**: `packages/api/src/routers/chat.ts`

```typescript
import { router } from "../trpc";
import { conversationRouter } from "./conversation";
import { messageRouter } from "./message";

export const chatRouter = router({
  conversation: conversationRouter,
  message: messageRouter,
});
```

### 2.7 Add to Main Router

**File**: `packages/api/src/index.ts` (update exports)

```typescript
export const appRouter = router({
  // ... existing routers
  chat: chatRouter,
});
```

---

## Step 3: Frontend UI (6-8 hours)

### 3.1 Install Dependencies

```bash
cd apps/web
bun add react-markdown remark-gfm react-syntax-highlighter
bun add -D @types/react-syntax-highlighter
```

### 3.2 Create Chat Components

**File**: `apps/web/src/components/chat/chat-interface.tsx`

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { MarkdownMessage } from './markdown-message';
import { CitationList } from './citation-list';

interface ChatInterfaceProps {
  conversationId: string;
  spaceId: string;
}

export function ChatInterface({ conversationId, spaceId }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');

  const { messages, sendMessage, isLoading } = useChat({
    api: `/api/trpc/chat.message.ask`,
    body: {
      conversationId,
      spaceId,
    },
  });

  // Auto-scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [messages]);

  // Return focus to input after streaming
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage({
      role: 'user',
      content: input,
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        role="log"
        aria-label="Chat conversation"
        aria-live="polite"
        aria-atomic="false"
        className="flex-1 overflow-y-auto p-4 space-y-4"
        tabIndex={0}
      >
        {messages.map((msg) => (
          <article
            key={msg.id}
            className={
              msg.role === 'user'
                ? 'bg-blue-50 p-4 rounded-lg'
                : 'bg-gray-50 p-4 rounded-lg'
            }
            aria-labelledby={`author-${msg.id}`}
          >
            <span id={`author-${msg.id}`} className="sr-only">
              {msg.role === 'user' ? 'You said' : 'AI Assistant replied'}
            </span>

            <div className="font-bold mb-2">
              {msg.role === 'user' ? 'You' : 'AI Assistant'}
            </div>

            <MarkdownMessage content={msg.content} />

            {msg.citations && msg.citations.length > 0 && (
              <CitationList citations={msg.citations} />
            )}
          </article>
        ))}

        {isLoading && (
          <div role="status" aria-live="polite" aria-atomic="true">
            <span className="sr-only">AI is generating a response</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Send message"
        className="border-t p-4"
      >
        <label htmlFor="chat-input" className="sr-only">
          Type your question
        </label>
        <div className="flex space-x-2">
          <input
            id="chat-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            aria-disabled={isLoading}
            autoComplete="off"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label={isLoading ? 'Sending message' : 'Send message'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 3.3 Create Markdown Renderer

**File**: `apps/web/src/components/chat/markdown-message.tsx`

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              className="rounded-lg"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-200 px-1 rounded" {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### 3.4 Create Citation Component

**File**: `apps/web/src/components/chat/citation-list.tsx`

```typescript
interface Citation {
  id: number;
  chunkId: number;
  excerpt: string;
  citationIndex: number;
  documentTitle: string;
  relevanceScore: number;
}

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  return (
    <aside
      role="complementary"
      aria-label="Source citations"
      className="mt-4 pt-4 border-t"
    >
      <h4 className="text-sm font-semibold mb-2">Sources:</h4>
      <ul className="space-y-2">
        {citations.map((cit) => (
          <li
            key={cit.id}
            className="text-sm"
            tabIndex={0}
          >
            <a
              href={`#citation-${cit.id}`}
              aria-label={`Citation ${cit.citationIndex}: ${cit.documentTitle}`}
              className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              [{cit.citationIndex}]
            </a>
            {' '}
            <span className="text-gray-700">{cit.documentTitle}</span>
            {' '}
            <span className="text-gray-500 text-xs">
              ({Math.round(cit.relevanceScore * 100)}% relevant)
            </span>
            <p className="text-gray-600 ml-6 mt-1 italic">
              "{cit.excerpt}..."
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

---

## Step 4: Testing (3-4 hours)

### 4.1 Setup Vitest

**File**: `apps/web/vite.config.ts` (add test config)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
```

### 4.2 Create Test Setup

**File**: `apps/web/src/test/setup.ts`

```typescript
import "@testing-library/jest-dom";
```

### 4.3 Write Unit Tests

**File**: `packages/api/src/lib/vector-search.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { vectorSearch } from "./vector-search";

describe("vectorSearch", () => {
  it("should return relevant chunks above threshold", async () => {
    const results = await vectorSearch(
      "What is TypeScript?",
      "space_123",
      5,
      0.7
    );

    expect(results).toBeInstanceOf(Array);
    expect(results.every((r) => r.similarity >= 0.7)).toBe(true);
  });
});
```

### 4.4 Write Component Tests

**File**: `apps/web/src/components/chat/chat-interface.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatInterface } from './chat-interface';

describe('ChatInterface', () => {
  it('should render input field', () => {
    render(<ChatInterface conversationId="conv_123" spaceId="space_123" />);

    const input = screen.getByLabelText(/type your question/i);
    expect(input).toBeInTheDocument();
  });

  it('should render send button', () => {
    render(<ChatInterface conversationId="conv_123" spaceId="space_123" />);

    const button = screen.getByRole('button', { name: /send message/i });
    expect(button).toBeInTheDocument();
  });
});
```

### 4.5 Run Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch
```

---

## Environment Variables

Add to `.env`:

```bash
# Google AI API
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

---

## Deployment Checklist

- [ ] Database migrations applied to production
- [ ] Environment variables configured
- [ ] Rate limiting Redis instance provisioned
- [ ] Google AI API quota monitored
- [ ] Accessibility audit passed
- [ ] Performance testing completed (vector search < 500ms)
- [ ] Error monitoring configured (Sentry, LogRocket, etc.)

---

## Troubleshooting

### Issue: Vector search returns no results

**Solution**: Check if documents have been processed and embeddings generated. Verify embedding model consistency (same model for questions and documents).

### Issue: Streaming response cuts off

**Solution**: Increase `maxDuration` in route config. Check for timeout in tRPC client.

### Issue: Rate limiting not working

**Solution**: Verify Upstash Redis connection. Check middleware is applied to correct procedures.

### Issue: Citations not displaying

**Solution**: Ensure citations are saved in `onFinal` callback. Verify citation relations in Drizzle.

---

## Next Steps

After completing implementation:

1. **Manual testing**: Test happy path and edge cases
2. **Accessibility audit**: Run with screen reader (NVDA, JAWS)
3. **Performance testing**: Measure response times, optimize if needed
4. **Documentation**: Update user-facing docs
5. **Create tasks.md**: Break down implementation into GitHub issues (Phase 2)

---

## Resources

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs)
- [pgvector Guide](https://github.com/pgvector/pgvector)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [react-markdown Docs](https://github.com/remarkjs/react-markdown)

**Estimated Total Implementation Time**: 15-21 hours

**Phase 1 Complete**: Ready for Phase 2 (task breakdown in tasks.md)
