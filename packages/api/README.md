# Chat API Documentation

This package provides tRPC API endpoints for the chat and conversation management system.

## Overview

The Chat API is built on tRPC and provides endpoints for:

- **Q&A with RAG**: Ask questions against document collections with citation support
- **Conversation Management**: Create, list, retrieve, and delete conversations
- **Message Management**: List messages and retrieve message details with citations

## Architecture

- **Backend**: LangChain.js with Google Gemini (gemini-2.0-flash-exp)
- **Vector Search**: PostgreSQL + pgvector (1536 dimensions)
- **ORM**: Drizzle ORM
- **RPC Framework**: tRPC v11

## API Endpoints

### Message Router (`chat.message`)

#### `ask` - Ask a Question

Ask a question and get an AI-generated answer with citations from your documents.

**Input:**

```typescript
{
  spaceId: string;        // The space to query
  question: string;       // The user's question
  conversationId?: string; // Optional: continue an existing conversation
}
```

**Output:**

```typescript
{
  answer: string; // AI-generated response
  conversationId: string; // ID of the conversation (created if new)
  citations: Array<{
    chunkId: number;
    documentTitle: string;
    excerpt: string;
    relevanceScore: number;
    citationIndex: number;
  }>;
  metadata: {
    model: string; // AI model used (e.g., "gemini-2.0-flash-exp")
    processingTimeMs: number; // Total processing time
    vectorSearchTimeMs: number; // Vector search duration
    chunksRetrieved: number; // Number of relevant chunks found
  }
}
```

**Behavior:**

- If `conversationId` is provided, loads conversation history (up to 5 previous exchanges) for context
- Performs vector similarity search (top 5 chunks, 0.7 threshold)
- Uses LangChain with Google Gemini to generate response
- Automatically creates conversation if this is the first message (using first 100 chars as title)
- Updates conversation's `updatedAt` timestamp
- Stores metadata in message table for analytics

**Errors:**

- `NOT_FOUND`: Conversation not found (if conversationId provided)
- `FORBIDDEN`: User doesn't own the conversation
- `PRECONDITION_FAILED`: No relevant information found in documents
- `INTERNAL_SERVER_ERROR`: LLM or database error (with user-friendly message)

---

#### `list` - List Messages

Retrieve all messages for a conversation.

**Input:**

```typescript
{
  conversationId: string; // The conversation to fetch messages from
}
```

**Output:**

```typescript
Array<{
  id: number;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown | null; // Raw citation data
  metadata: unknown | null; // Processing metadata
  createdAt: Date;
  updatedAt: Date;
}>;
```

**Behavior:**

- Returns messages ordered by creation time (descending)
- Verifies user owns the conversation

**Errors:**

- `NOT_FOUND`: Conversation not found
- `FORBIDDEN`: User doesn't own the conversation

---

#### `getWithCitations` - Get Message with Citations

Retrieve a specific message with full citation details.

**Input:**

```typescript
{
  messageId: number; // The message ID to retrieve
}
```

**Output:**

```typescript
{
  id: number;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: Array<{
    id: number;
    messageId: number;
    chunkId: number;
    chunk: {
      id: number;
      documentId: number;
      content: string;
      chunkIndex: number;
      metadata: unknown | null;
      document: {
        id: number;
        spaceId: string;
        title: string;
        // ... other document fields
      };
    };
    relevanceScore: number;
    excerpt: string;
    citationIndex: number;
  }>;
  conversation: {
    id: string;
    userId: string;
    spaceId: string;
    title: string;
    // ... other conversation fields
  }
  // ... other message fields
}
```

**Behavior:**

- Returns message with full citation details and document information
- Verifies user owns the conversation

**Errors:**

- `NOT_FOUND`: Message not found
- `FORBIDDEN`: User doesn't own the conversation

---

### Conversation Router (`chat.conversation`)

#### `list` - List Conversations

List all conversations for a space with pagination.

**Input:**

```typescript
{
  spaceId: string;  // The space to list conversations from
  limit?: number;   // Number of conversations to return (default: 20, max: 100)
  cursor?: string;  // Conversation ID to start from (for pagination)
}
```

**Output:**

```typescript
{
  conversations: Array<{
    id: string;
    spaceId: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    latestMessage?: {
      content: string;  // Preview of the latest message
      createdAt: Date;
    };
  }>;
  nextCursor?: string;  // ID for next page (if more results exist)
}
```

**Behavior:**

- Returns conversations ordered by `updatedAt` (most recent first)
- Includes preview of latest message
- Cursor-based pagination for efficient loading
- Verifies user owns the space

**Errors:**

- `NOT_FOUND`: Space not found
- `FORBIDDEN`: User doesn't own the space

---

#### `get` - Get Conversation

Retrieve a single conversation with all its messages.

**Input:**

```typescript
{
  conversationId: string; // The conversation to retrieve
}
```

**Output:**

```typescript
{
  id: string;
  spaceId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  space: {
    id: string;
    name: string;
    // ... other space fields
  }
  messages: Array<{
    id: number;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    citations: unknown | null;
    metadata: unknown | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}
```

**Behavior:**

- Returns conversation with all related data
- Verifies user owns the conversation

**Errors:**

- `NOT_FOUND`: Conversation not found
- `FORBIDDEN`: User doesn't own the conversation

---

#### `delete` - Delete Conversation

Delete a conversation and all its messages/citations.

**Input:**

```typescript
{
  conversationId: string; // The conversation to delete
}
```

**Output:**

```typescript
{
  success: boolean; // Always true if no error thrown
}
```

**Behavior:**

- Cascades deletion to all messages and citations
- Verifies user owns the conversation

**Errors:**

- `NOT_FOUND`: Conversation not found
- `FORBIDDEN`: User doesn't own the conversation

---

#### `create` - Create Conversation

Create a new conversation (typically called automatically by `message.ask`).

**Input:**

```typescript
{
  spaceId: string;  // The space to create the conversation in
  title?: string;   // Optional title (auto-generated if omitted)
}
```

**Output:**

```typescript
{
  id: string;
  spaceId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Behavior:**

- Creates a new conversation for the authenticated user
- Generates a nanoid for the conversation ID
- Auto-generates title if not provided

**Errors:**

- `NOT_FOUND`: Space not found
- `FORBIDDEN`: User doesn't own the space

---

## Usage Examples

### Basic Q&A

```typescript
// Frontend: Ask a question
const response = await trpc.chat.message.ask.mutate({
  spaceId: "space_123",
  question: "What is photosynthesis?",
});

console.log(response.answer);
// "Photosynthesis is the process by which plants convert light energy..."

console.log(response.citations);
// [
//   {
//     chunkId: 42,
//     documentTitle: "Biology Textbook",
//     excerpt: "Photosynthesis occurs in the chloroplasts...",
//     relevanceScore: 0.92,
//     citationIndex: 1
//   },
//   ...
// ]
```

### Continue Conversation with Context

```typescript
// First question
const response1 = await trpc.chat.message.ask.mutate({
  spaceId: "space_123",
  question: "What is photosynthesis?",
});

// Follow-up question with context
const response2 = await trpc.chat.message.ask.mutate({
  spaceId: "space_123",
  question: "How does it work in low light?",
  conversationId: response1.conversationId,
});
// The AI now has context from the first Q&A
```

### List Conversations

```typescript
// Get first page
const page1 = await trpc.chat.conversation.list.query({
  spaceId: "space_123",
  limit: 20,
});

console.log(page1.conversations.length); // 20
console.log(page1.nextCursor); // "conv_xyz"

// Get next page
const page2 = await trpc.chat.conversation.list.query({
  spaceId: "space_123",
  limit: 20,
  cursor: page1.nextCursor,
});
```

### Load Conversation History

```typescript
// Get full conversation
const conversation = await trpc.chat.conversation.get.query({
  conversationId: "conv_xyz",
});

console.log(conversation.title);
console.log(conversation.messages.length);

// Get specific message with citations
const message = await trpc.chat.message.getWithCitations.query({
  messageId: 123,
});

console.log(message.citations[0].chunk.document.title);
```

### Delete Conversation

```typescript
await trpc.chat.conversation.delete.mutate({
  conversationId: "conv_xyz",
});
```

---

## Implementation Details

### RAG Pipeline

1. **Query Embedding**: Generate embedding for user question using Google Gemini
2. **Vector Search**: Find top 5 most similar chunks (cosine similarity ≥ 0.7)
3. **Context Building**: Combine chunks with document titles
4. **Conversation History**: Load up to 5 previous Q&A pairs for context
5. **Prompt Construction**: Assemble system prompt + context + history + question
6. **LLM Invocation**: Send to Google Gemini (temperature=0 for consistency)
7. **Citation Tracking**: Store chunk references with relevance scores

### Conversation Context

- **History Limit**: Last 5 exchanges (10 messages total)
- **Token Budget**: Approximately 8K tokens for context + history
- **Ordering**: Most recent messages appear last in prompt
- **Formatting**: Human/AI labels for clear turn-taking

### Vector Search

- **Model**: Google Gemini text embedding (1536 dimensions)
- **Similarity Metric**: Cosine distance (lower = more similar)
- **Threshold**: 0.7 (scores range 0-1, where 1 = identical)
- **Top-K**: 5 chunks per query
- **Filters**: Only searches READY documents in the specified space

### Performance

- **Average Query Time**: 2-4 seconds (including vector search and LLM)
- **Vector Search**: ~100-200ms
- **LLM Generation**: ~2-3 seconds
- **Database Queries**: ~50ms total

### Error Handling

- **LLM Failures**: Graceful degradation with user-friendly messages
- **Vector Search Failures**: Returns empty results, lets caller handle
- **Empty Results**: Explicit error message when no relevant documents found
- **Cleanup**: Failed LLM calls clean up placeholder messages

---

## Development

### Running Locally

```bash
# Start database
bun run db:migrate

# Start API server
bun run dev
```

### Testing

```bash
# Run tests
bun test

# Test specific endpoint
bun test message.ask
```

### Configuration

Required environment variables:

- `GOOGLE_GENAI_API_KEY`: Google Gemini API key
- `DATABASE_URL`: PostgreSQL connection string with pgvector support

---

## Troubleshooting

### "No relevant information found"

- Check that documents are fully processed (`processingStatus = 'READY'`)
- Verify embeddings exist in `documentChunk.embedding`
- Try lowering similarity threshold (< 0.7)
- Check document content quality and relevance

### "LLM response timeout"

- Google Gemini has rate limits (check your quota)
- Very long contexts may exceed token limits
- Consider reducing history limit or chunk count

### "Conversation not found"

- Verify conversationId is correct
- Check that user owns the conversation
- Ensure conversation wasn't deleted

---

## Future Enhancements

- [ ] Streaming responses (SSE or WebSocket)
- [ ] Multi-model support (OpenAI, Anthropic, local models)
- [ ] Conversation folders/tags
- [ ] Export conversations (PDF, Markdown)
- [ ] Advanced citation highlighting in source documents
- [ ] Conversation sharing/collaboration
- [ ] Rate limiting per user (currently none)
- [ ] Caching for frequently asked questions
- [ ] Analytics dashboard (queries per day, response time, etc.)
