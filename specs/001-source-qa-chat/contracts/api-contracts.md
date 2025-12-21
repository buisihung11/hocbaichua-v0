# API Contracts: Q&A Chat Feature

**Branch**: `001-source-qa-chat` | **Date**: December 16, 2025  
**Status**: Phase 1 Design

This document defines the tRPC API contracts for the Q&A chat feature, including procedures for conversations, messages, and citations.

---

## API Architecture

**Protocol**: tRPC v11.5.0  
**Transport**: HTTP POST with JSON-RPC 2.0  
**Base Path**: `/api/trpc`  
**Authentication**: Better-Auth session-based  
**Rate Limiting**: 20 requests/minute per user (for question endpoints)

---

## Router Structure

```typescript
// File: packages/api/src/routers/chat.ts
import { router } from "../trpc";
import { conversationRouter } from "./conversation";
import { messageRouter } from "./message";

export const chatRouter = router({
  conversation: conversationRouter,
  message: messageRouter,
});
```

---

## 1. Conversation Router

### 1.1 Create Conversation

**Procedure**: `chat.conversation.create`  
**Type**: `mutation`  
**Purpose**: Create a new conversation within a space

#### Input Schema

```typescript
{
  spaceId: string;    // Required: Target space ID
  title?: string;     // Optional: Custom title (or auto-generated from first message)
}
```

#### Output Schema

```typescript
{
  id: string;
  title: string | null;
  spaceId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Space does not exist
- `FORBIDDEN`: User does not have access to space

#### Example Usage

```typescript
const conversation = await trpc.chat.conversation.create.mutate({
  spaceId: "space_xyz123",
  title: "Math homework questions",
});
```

---

### 1.2 List Conversations

**Procedure**: `chat.conversation.list`  
**Type**: `query`  
**Purpose**: Get user's conversations, optionally filtered by space

#### Input Schema

```typescript
{
  spaceId?: string;   // Optional: Filter by space
  limit?: number;     // Optional: Max results (default: 20, max: 100)
  cursor?: string;    // Optional: Pagination cursor (conversation ID)
}
```

#### Output Schema

```typescript
{
  conversations: Array<{
    id: string;
    title: string | null;
    spaceId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    space: {
      id: string;
      name: string;
    };
    messageCount: number;
    lastMessage?: {
      id: number;
      role: "user" | "assistant";
      content: string; // Truncated to 100 chars for preview
      createdAt: Date;
    };
  }>;
  nextCursor: string | null; // null if no more results
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `BAD_REQUEST`: Invalid pagination parameters

#### Example Usage

```typescript
const { conversations, nextCursor } = await trpc.chat.conversation.list.query({
  spaceId: "space_xyz123",
  limit: 20,
});
```

---

### 1.3 Get Conversation

**Procedure**: `chat.conversation.get`  
**Type**: `query`  
**Purpose**: Get a single conversation with all messages and citations

#### Input Schema

```typescript
{
  conversationId: string; // Required: Conversation ID
}
```

#### Output Schema

```typescript
{
  id: string;
  title: string | null;
  spaceId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  space: {
    id: string;
    name: string;
  }
  messages: Array<{
    id: number;
    role: "user" | "assistant";
    content: string; // Full markdown content
    createdAt: Date;
    metadata?: {
      model?: string;
      tokensUsed?: number;
      processingTimeMs?: number;
    };
    citations: Array<{
      id: number;
      chunkId: number;
      relevanceScore: number;
      excerpt: string;
      citationIndex: number;
      chunk: {
        id: number;
        content: string; // Full chunk content
        document: {
          id: number;
          title: string;
          fileUrl?: string;
        };
      };
    }>;
  }>;
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Conversation does not exist
- `FORBIDDEN`: User does not own conversation

#### Example Usage

```typescript
const conversation = await trpc.chat.conversation.get.query({
  conversationId: "conv_abc123",
});
```

---

### 1.4 Delete Conversation

**Procedure**: `chat.conversation.delete`  
**Type**: `mutation`  
**Purpose**: Delete a conversation and all its messages/citations

#### Input Schema

```typescript
{
  conversationId: string; // Required: Conversation ID to delete
}
```

#### Output Schema

```typescript
{
  success: boolean;
  deletedId: string;
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Conversation does not exist
- `FORBIDDEN`: User does not own conversation

#### Example Usage

```typescript
const result = await trpc.chat.conversation.delete.mutate({
  conversationId: "conv_abc123",
});
```

---

## 2. Message Router

### 2.1 Ask Question (Streaming)

**Procedure**: `chat.message.ask`  
**Type**: `mutation` (with streaming response)  
**Purpose**: Ask a question and stream AI-generated answer with citations

**⚠️ Special**: This endpoint returns a streaming response.

**Architecture**:

- **Backend**: Uses **LangChain SDK** (`@langchain/google-genai`) for LLM processing, RAG chains, and retrieval
- **Frontend**: Uses **AI SDK UI hooks** (`@ai-sdk/react`) for streaming UI (useChat)
- **Stream Format**: LangChain stream is converted to AI SDK compatible SSE format

#### Input Schema

```typescript
{
  conversationId: string;     // Required: Target conversation
  question: string;           // Required: User's question (1-2000 chars)
  includeContext?: boolean;   // Optional: Include previous messages (default: true)
  contextLimit?: number;      // Optional: Max previous exchanges to include (default: 5)
}
```

#### Streaming Response Format

**Note**: Response is streamed as Server-Sent Events (SSE) using AI SDK protocol.

```typescript
// Initial response (immediately)
{
  messageId: number; // ID of user message
  assistantMessageId: number; // ID of assistant message (streaming)
}

// Stream chunks (multiple events)
{
  type: "text-delta";
  content: string; // Incremental text chunk
}

{
  type: "citation";
  citation: {
    id: number;
    chunkId: number;
    relevanceScore: number;
    excerpt: string;
    citationIndex: number;
    documentTitle: string;
  }
}

{
  type: "finish";
  metadata: {
    model: string;
    tokensUsed: number;
    processingTimeMs: number;
    chunksRetrieved: number;
  }
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Conversation does not exist
- `FORBIDDEN`: User does not own conversation or space
- `BAD_REQUEST`: Question is empty or too long
- `TOO_MANY_REQUESTS`: Rate limit exceeded (20/min)
- `PRECONDITION_FAILED`: No documents in space
- `INTERNAL_SERVER_ERROR`: LLM API error or vector search failure

#### Example Usage (Frontend)

```typescript
import { useChat } from '@ai-sdk/react';

function ChatComponent({ conversationId }: Props) {
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/trpc/chat.message.ask',
    body: {
      conversationId,
      includeContext: true,
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button type="submit" disabled={isLoading}>Send</button>
    </form>
  );
}
```

#### Backend Implementation Reference

**LangChain SDK for Backend Processing:**

```typescript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Initialize LangChain model
const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-exp',
  temperature: 0,
  streaming: true,
});

// Simplified flow
export const ask = protectedProcedure
  .input(askQuestionSchema)
  .mutation(async ({ input, ctx }) => {
    // 1. Verify conversation ownership
    const conversation = await verifyConversationAccess(input.conversationId, ctx.userId);

    // 2. Create user message
    const userMessage = await db.insert(message).values({
      conversationId: input.conversationId,
      role: 'user',
      content: input.question,
    }).returning();

    // 3. Generate question embedding
    const questionEmbedding = await generateEmbedding(input.question);

    // 4. Vector similarity search
    const relevantChunks = await vectorSearch(
      questionEmbedding,
      conversation.spaceId,
      topK: 5
    );

    // 5. Build context from chunks with source tracking
    const contextWithSources = relevantChunks
      .map((chunk, idx) => `[Source ${idx + 1}]: ${chunk.content}`)
      .join('\\n\\n');

    // 6. Create RAG prompt with LangChain
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `Answer based ONLY on the provided context...\\n\\nContext:\\n{context}`],
      ['human', '{question}'],
    ]);

    // 7. Create chain and stream response
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const langchainStream = await chain.stream({
      context: contextWithSources,
      question: input.question,
    });

    // 8. Convert LangChain stream to AI SDK compatible format
    const readableStream = convertLangChainStreamToAISDK(langchainStream, {
      onComplete: async (fullResponse) => {
        // Save message and citations to database
        await saveMessageAndCitations(fullResponse, relevantChunks);
      },
    });

    // 9. Return streaming response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  });
```

---

### 2.2 List Messages

**Procedure**: `chat.message.list`  
**Type**: `query`  
**Purpose**: Get messages for a conversation (without full citations)

#### Input Schema

```typescript
{
  conversationId: string; // Required: Conversation ID
  limit?: number;         // Optional: Max results (default: 50, max: 200)
  cursor?: number;        // Optional: Message ID for pagination
}
```

#### Output Schema

```typescript
{
  messages: Array<{
    id: number;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    citationCount: number; // Number of citations (not full objects)
  }>;
  nextCursor: number | null;
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Conversation does not exist
- `FORBIDDEN`: User does not own conversation

#### Example Usage

```typescript
const { messages, nextCursor } = await trpc.chat.message.list.query({
  conversationId: "conv_abc123",
  limit: 50,
});
```

---

### 2.3 Get Message with Citations

**Procedure**: `chat.message.getWithCitations`  
**Type**: `query`  
**Purpose**: Get a single message with full citation details

#### Input Schema

```typescript
{
  messageId: number; // Required: Message ID
}
```

#### Output Schema

```typescript
{
  id: number;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTimeMs?: number;
  };
  citations: Array<{
    id: number;
    chunkId: number;
    relevanceScore: number;
    excerpt: string;
    citationIndex: number;
    chunk: {
      id: number;
      content: string;
      document: {
        id: number;
        title: string;
        fileUrl?: string;
      };
    };
  }>;
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Message does not exist
- `FORBIDDEN`: User does not own message's conversation

#### Example Usage

```typescript
const message = await trpc.chat.message.getWithCitations.query({
  messageId: 123,
});
```

---

## 3. Utility Procedures

### 3.1 Generate Title

**Procedure**: `chat.conversation.generateTitle`  
**Type**: `mutation`  
**Purpose**: Auto-generate conversation title from first message

#### Input Schema

```typescript
{
  conversationId: string; // Required: Conversation ID
}
```

#### Output Schema

```typescript
{
  title: string; // Generated title (max 50 chars)
}
```

#### Error Responses

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Conversation does not exist or has no messages
- `FORBIDDEN`: User does not own conversation

#### Example Usage

```typescript
const { title } = await trpc.chat.conversation.generateTitle.mutate({
  conversationId: "conv_abc123",
});
```

---

## Rate Limiting

### Implementation

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const questionRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
});

export const rateLimitMiddleware = t.middleware(async ({ ctx, path, next }) => {
  // Only rate limit question endpoint
  if (path === "chat.message.ask") {
    const { success, reset } = await questionRateLimit.limit(ctx.userId);

    if (!success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s`,
      });
    }
  }

  return next();
});
```

---

## Authentication Middleware

```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.session.user.id,
    },
  });
});
```

---

## Error Handling

### Standard Error Codes

| Code                    | HTTP Status | Use Case                                         |
| ----------------------- | ----------- | ------------------------------------------------ |
| `UNAUTHORIZED`          | 401         | User not authenticated                           |
| `FORBIDDEN`             | 403         | User lacks permission for resource               |
| `NOT_FOUND`             | 404         | Resource does not exist                          |
| `BAD_REQUEST`           | 400         | Invalid input parameters                         |
| `PRECONDITION_FAILED`   | 412         | Required conditions not met (e.g., no documents) |
| `TOO_MANY_REQUESTS`     | 429         | Rate limit exceeded                              |
| `INTERNAL_SERVER_ERROR` | 500         | Unexpected server error                          |

### Error Response Format

```typescript
{
  error: {
    code: 'TOO_MANY_REQUESTS';
    message: 'Rate limit exceeded. Try again in 42s';
    data?: {
      // Optional additional context
      retryAfter: 42;
      limit: 20;
    };
  };
}
```

---

## Testing Contracts

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { createInnerTRPCContext } from "../context";
import { chatRouter } from "./chat";

describe("chat.conversation.create", () => {
  it("should create conversation with valid input", async () => {
    const ctx = createInnerTRPCContext({ userId: "user_123" });
    const caller = chatRouter.createCaller(ctx);

    const result = await caller.conversation.create({
      spaceId: "space_xyz",
    });

    expect(result.id).toBeDefined();
    expect(result.spaceId).toBe("space_xyz");
    expect(result.userId).toBe("user_123");
  });

  it("should throw UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createInnerTRPCContext({ userId: null });
    const caller = chatRouter.createCaller(ctx);

    await expect(
      caller.conversation.create({ spaceId: "space_xyz" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
```

---

## Summary

### Endpoints Overview

| Endpoint                     | Type              | Purpose                         | Rate Limited     |
| ---------------------------- | ----------------- | ------------------------------- | ---------------- |
| `conversation.create`        | mutation          | Create new conversation         | No               |
| `conversation.list`          | query             | List user's conversations       | No               |
| `conversation.get`           | query             | Get conversation with messages  | No               |
| `conversation.delete`        | mutation          | Delete conversation             | No               |
| `conversation.generateTitle` | mutation          | Auto-generate title             | No               |
| `message.ask`                | mutation (stream) | Ask question, stream answer     | **Yes (20/min)** |
| `message.list`               | query             | List messages in conversation   | No               |
| `message.getWithCitations`   | query             | Get message with full citations | No               |

### Type Safety

- ✅ All inputs/outputs defined with Zod schemas
- ✅ End-to-end type inference with tRPC
- ✅ Streaming responses typed with AI SDK

### Security

- ✅ Authentication required for all endpoints
- ✅ Authorization checks (user owns conversation/space)
- ✅ Rate limiting on expensive operations
- ✅ Input validation with Zod

### Next Steps

1. ✅ **API contracts defined**
2. → **quickstart.md** - Implementation guide for developers
3. → **Update agent context** - Add tRPC contracts to copilot
