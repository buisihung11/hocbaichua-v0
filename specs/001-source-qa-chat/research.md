# Research: Source-Based Q&A Chat with Citations

**Branch**: `001-source-qa-chat` | **Date**: December 16, 2025  
**Status**: Phase 0 Complete

This document consolidates research findings for implementing the Q&A chat feature with streaming responses, markdown formatting, and source citations.

---

## 1. Testing Framework

**Decision**: Vitest + @testing-library/react

**Rationale**:

- Already installed in apps/web (`@testing-library/react: ^16.2.0`)
- Native Vite integration (Vitest) matches existing build tooling
- Fast execution with ESM support
- Compatible with React 19 Testing Library

**Implementation**:

- Unit tests: Vitest for business logic (vector search, citation extraction)
- Component tests: @testing-library/react for UI components
- Integration tests: Mock tRPC procedures and AI SDK responses
- E2E tests: Consider Playwright for full chat flow (optional for MVP)

**Alternatives Considered**:

- Jest: Slower, requires additional Babel configuration with Vite
- No testing: Violates Constitution Principle IV (test-first for critical paths)

---

## 2. LangChain SDK for Backend LLM Processing

**Decision**: LangChain.js with Google Gemini provider for backend, AI SDK for UI only

**Rationale**:

- **Backend**: LangChain.js provides robust RAG (Retrieval-Augmented Generation) primitives
- **Frontend**: AI SDK's `useChat` hook provides excellent streaming UI experience
- LangChain has built-in support for citations, retrieval tools, and conversation memory
- Type-safe with TypeScript
- LangChain's streaming is compatible with AI SDK's UI hooks via proper response format

**Implementation Pattern**:

### Backend (tRPC Procedure with LangChain)

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Initialize LangChain model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  temperature: 0,
  streaming: true,
});

// tRPC procedure for streaming chat
export const chat = publicProcedure
  .input(
    z.object({
      message: z.string(),
      conversationId: z.string(),
      spaceId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // 1. Retrieve relevant document chunks via vector search
    const chunks = await vectorSearch(input.message, input.spaceId);

    // 2. Build context from chunks (with citations)
    const contextWithSources = chunks
      .map(
        (c, idx) => `[Source ${idx + 1} - ${c.documentTitle}]:\n${c.content}`
      )
      .join("\n\n");

    // 3. Create RAG chain with LangChain
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "Answer based ONLY on the provided context. Include source numbers [1], [2] in your answer.\n\nContext:\n{context}",
      ],
      ["human", "{question}"],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    // 4. Stream response (compatible with AI SDK's useChat)
    const stream = await chain.stream({
      context: contextWithSources,
      question: input.message,
    });

    // 5. Convert to AI SDK compatible format
    return toAISDKStreamResponse(stream, chunks);
  });
```

### Frontend (React Component)

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export function ChatInterface({ spaceId }: Props) {
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/trpc/chat',
    body: { spaceId },
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.role}: {msg.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

**Best Practices**:

- Use LangChain's `.stream()` method for token-by-token streaming
- Convert LangChain stream to AI SDK compatible format for `useChat` hook
- Set `maxDuration: 30` in route config for long-running streams
- Implement `stop()` function from `useChat` for user cancellation
- Handle errors gracefully with try-catch and error boundaries
- Use LangChain's built-in retrieval tools for cleaner RAG implementation

**Why This Architecture**:

- **Backend (LangChain)**: Better RAG primitives, conversation memory, retrieval chains
- **Frontend (AI SDK)**: Better React hooks, simpler UI streaming, excellent DX
- **Best of both worlds**: LangChain's power + AI SDK's UI simplicity

**Alternatives Considered**:

- AI SDK for everything: Lacks sophisticated RAG features and retrieval tools
- LangChain for UI: More complex than AI SDK's useChat hook
- Custom implementation: Reinventing the wheel, both SDKs are battle-tested

---

## 3. Markdown Rendering

**Decision**: react-markdown with syntax highlighting

**Rationale**:

- Standard library for markdown in React (40M+ weekly downloads)
- Supports GitHub Flavored Markdown (GFM) for code blocks, tables
- Extensible with remark/rehype plugins
- Sanitizes HTML by default (security)

**Implementation**:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function MarkdownMessage({ content }: { content: string }) {
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
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
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

**Required Dependencies**:

```bash
bun add react-markdown remark-gfm react-syntax-highlighter
bun add -D @types/react-syntax-highlighter
```

**Alternatives Considered**:

- marked: Not React-specific, requires dangerouslySetInnerHTML
- MDX: Overkill for rendering user responses (compile-time not needed)
- Plain text: Loses formatting for code examples, lists, emphasis

---

## 4. Vector Similarity Search with pgvector

**Decision**: pgvector with cosine similarity and HNSW index

**Rationale**:

- Already integrated in document ingestion (feature 002)
- Existing `documentChunk` table has `embedding` column (vector 1536)
- HNSW index provides fast approximate nearest neighbor search

**Implementation**:

```typescript
import { db } from "@hocbaichua-v0/db";
import { documentChunk, document } from "@hocbaichua-v0/db/schema";
import { sql } from "drizzle-orm";

export async function vectorSearch(
  questionEmbedding: number[],
  spaceId: string,
  topK: number = 5
) {
  // Convert array to pgvector format
  const embeddingVector = `[${questionEmbedding.join(",")}]`;

  return db
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
}
```

**Performance Considerations**:

- HNSW index already created in document ingestion migration
- Cosine distance operator `<=>` is optimized by index
- Limit to top 5-10 chunks to stay within LLM context window
- Similarity threshold: 0.7 (70% similarity) - configurable

**Best Practices**:

- Use same embedding model for questions as documents (consistency)
- Cache embeddings for repeated questions (future optimization)
- Monitor query latency (<500ms target)

**Alternatives Considered**:

- Elasticsearch: Separate infrastructure, overkill for MVP
- In-memory vector search: Doesn't scale beyond 10K chunks
- Supabase Vector: Already using pgvector, no need to switch

---

## 5. Zod Schemas for AI Model I/O

**Decision**: Define explicit schemas for LLM requests and responses

**Rationale**:

- Constitution Principle III: Type safety for AI inputs/outputs
- Validates streaming chunks contain expected structure
- Enables structured output parsing (citations format)

**Implementation**:

```typescript
import { z } from "zod";

// Question input schema
export const questionInputSchema = z.object({
  text: z.string().min(1).max(2000),
  spaceId: z.string(),
  conversationId: z.string().optional(),
});

// Citation schema (extracted from LLM response)
export const citationSchema = z.object({
  chunkId: z.number(),
  documentTitle: z.string(),
  excerpt: z.string().max(200),
  relevanceScore: z.number().min(0).max(1),
});

// LLM response schema
export const chatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(citationSchema),
  confidence: z.enum(["high", "medium", "low"]),
});

// Streaming chunk schema
export const streamChunkSchema = z.object({
  type: z.enum(["text-delta", "citation", "finish"]),
  content: z.string().optional(),
  citation: citationSchema.optional(),
});
```

**Usage in tRPC**:

```typescript
export const askQuestion = publicProcedure
  .input(questionInputSchema)
  .output(chatResponseSchema)
  .mutation(async ({ input }) => {
    // Type-safe I/O guaranteed
  });
```

**Best Practices**:

- Validate streaming chunks in real-time
- Parse citations from structured LLM output (JSON mode)
- Log validation errors for debugging

---

## 6. Accessible Chat UI Patterns

**Decision**: WCAG 2.1 Level AA compliant streaming chat interface

**Rationale**: Constitution Principle III mandates accessibility

**Implementation Summary**:

### Key ARIA Patterns

```typescript
// Message container - announces new messages
<div
  role="log"
  aria-label="Chat messages"
  aria-live="polite"
  aria-atomic="false"
  tabIndex={0}
>
  {messages.map(msg => (
    <div
      role="article"
      aria-labelledby={`author-${msg.id}`}
      tabIndex={0}
    >
      <span id={`author-${msg.id}`} className="sr-only">
        {msg.role === 'user' ? 'You' : 'AI Assistant'}
      </span>
      {msg.content}
    </div>
  ))}
</div>

// Streaming message - debounced announcements
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {streamingContent}
</div>

// Citation link - descriptive labels
<a
  href={`#citation-${cit.id}`}
  aria-label={`View citation ${index + 1}: ${cit.title}`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCitationClick(cit);
    }
  }}
>
  [{index + 1}]
</a>
```

### Focus Management Rules

1. Keep focus in input during streaming
2. Return focus to input after response completes
3. Auto-scroll without stealing focus (`scrollIntoView({ block: 'nearest' })`)
4. Disable input during streaming with `aria-disabled`

### Keyboard Navigation

- `Tab`: Navigate between input, send button, citations
- `Enter`: Submit message
- `Shift+Enter`: New line (multi-line input)
- `Escape`: Cancel streaming (optional)

**Testing Requirements**:

- [ ] Screen reader announces new messages
- [ ] Streaming content announced at intervals (not every token)
- [ ] Citation links keyboard accessible
- [ ] Focus visible with 2px outline
- [ ] 4.5:1 contrast ratio for text

---

## 7. Google AI API Data Retention Policy

**Decision**: Verified - Google AI API does NOT retain data for model training

**Source**: [Google AI for Developers - Data Usage FAQ](https://ai.google.dev/gemini-api/terms)

**Key Points**:

- API requests and responses are NOT used to train or improve models
- Data is retained only for abuse detection (30 days maximum)
- No personally identifiable information (PII) stored
- Complies with GDPR and educational data privacy standards

**Implementation**:

- Document this in privacy policy
- User consent covers AI processing of their uploaded documents
- Citations reference chunk IDs, not raw embeddings

**Action**: Update privacy documentation to clarify Google AI usage.

---

## 8. Conversation Context Management

**Decision**: Store last 5 exchanges in database, include in LLM context

**Rationale**:

- Enables follow-up questions without repeating context
- 5 exchanges ≈ 10 messages (user + assistant) = ~2K tokens
- Stays within typical LLM context window (8K-32K tokens)

**Implementation**:

```typescript
// Retrieve conversation history
const conversationHistory = await db
  .select()
  .from(message)
  .where(eq(message.conversationId, conversationId))
  .orderBy(desc(message.createdAt))
  .limit(10); // Last 5 exchanges (10 messages)

// Format for LLM
const messages = conversationHistory.reverse().map((msg) => ({
  role: msg.role === "user" ? "user" : "assistant",
  content: msg.text,
}));

// Add new question
messages.push({
  role: "user",
  content: questionText,
});
```

**Best Practices**:

- Trim old messages when conversation exceeds 20 exchanges
- Allow users to start new conversation (clear context)
- Include system message with grounding instructions every time

---

## 9. Response Validation (Hallucination Detection)

**Decision**: Implement basic grounding check using citation matching

**Rationale**: Constitution Principle I requires AI output validation

**Implementation**:

```typescript
function validateResponse(answer: string, retrievedChunks: Chunk[]): boolean {
  // Extract key facts from answer (simple keyword extraction)
  const answerKeywords = extractKeywords(answer);

  // Check if keywords appear in retrieved chunks
  const contextKeywords = retrievedChunks.flatMap((c) =>
    extractKeywords(c.content)
  );

  const matchRatio =
    answerKeywords.filter((kw) =>
      contextKeywords.some((ckw) => similarity(kw, ckw) > 0.8)
    ).length / answerKeywords.length;

  // Flag if less than 70% of answer content is in context
  return matchRatio >= 0.7;
}
```

**Future Improvements**:

- Use NLI (Natural Language Inference) model for deeper validation
- Implement confidence scores from LLM (via structured output)
- Log low-confidence answers for manual review

---

## 10. Rate Limiting Strategy

**Decision**: 20 questions per minute per user (tRPC middleware)

**Implementation**:

```typescript
import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
});

export const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const userId = ctx.session?.user?.id;
  if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

  const { success } = await ratelimit.limit(userId);
  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please wait before asking more questions.",
    });
  }

  return next();
});
```

**Alternatives Considered**:

- In-memory rate limiting: Doesn't work across multiple server instances
- No rate limiting: Vulnerable to abuse, high AI API costs

---

## Summary of Decisions

| Area               | Decision                          | Rationale                                        |
| ------------------ | --------------------------------- | ------------------------------------------------ |
| Testing Framework  | Vitest + @testing-library/react   | Already installed, fast, native Vite integration |
| Streaming          | LangChain (backend) + AI SDK (UI) | LangChain for RAG, AI SDK for React hooks        |
| Markdown           | react-markdown + remark-gfm       | Standard, secure, extensible                     |
| Vector Search      | pgvector with cosine similarity   | Already integrated, fast with HNSW               |
| Type Safety        | Zod schemas for AI I/O            | Constitution requirement, validation             |
| Accessibility      | WCAG 2.1 Level AA                 | Constitution requirement, ARIA live regions      |
| Data Retention     | Google AI API (no retention)      | Privacy-compliant, documented                    |
| Context Management | Last 5 exchanges in DB            | Balances context vs. token cost                  |
| Validation         | Basic keyword grounding check     | Detects obvious hallucinations                   |
| Rate Limiting      | 20 questions/min via Upstash      | Prevents abuse, cost control                     |

---

## Next Steps (Phase 1)

1. ✅ **research.md complete** - All NEEDS CLARIFICATION resolved
2. → **data-model.md** - Define conversation, message, citation tables
3. → **contracts/** - API contracts for chat procedures
4. → **quickstart.md** - Developer guide for implementing chat
5. → **Update agent context** - Add AI SDK, react-markdown to copilot context

**Phase 0 Status**: ✅ COMPLETE - All unknowns resolved, ready for design phase.
