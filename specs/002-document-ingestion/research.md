# Research: Document Ingestion Pipeline

**Feature**: 002-document-ingestion
**Date**: 2024-12-14
**Status**: Complete

## Overview

This document captures research findings and technology decisions for the document ingestion pipeline. All "NEEDS CLARIFICATION" items from the Technical Context have been resolved.

---

## Decision 1: Document Parsing Library

**Decision**: Unstructured.io via `unstructured-client` SDK

**Rationale**:

- Unified API for multiple file types (PDF, DOCX, TXT, Markdown)
- Handles complex document structures (tables, images, headers)
- Returns structured elements with metadata (element type, coordinates)
- Cloud-hosted API reduces infrastructure complexity
- Supports chunking strategies natively

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| pdf-parse + mammoth | Self-hosted, no API costs | Different APIs per format, less accurate | Maintenance burden, inconsistent output |
| LangChain PDFLoader | LangChain integration | Limited to PDF, basic extraction | Doesn't cover DOCX well |
| Apache Tika | Enterprise-grade, comprehensive | Heavy Java dependency, complex setup | Overkill for current scale |

**Integration Pattern**:

```typescript
import { UnstructuredClient } from "unstructured-client";

const client = new UnstructuredClient({
  serverURL: process.env.UNSTRUCTURED_API_URL,
  security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY },
});

// Partition file into elements
const response = await client.general.partition({
  files: { content: fileBuffer, fileName: "document.pdf" },
  chunkingStrategy: "by_title", // Optional: let Unstructured chunk
});
```

---

## Decision 2: Text Chunking Strategy

**Decision**: LangChain `RecursiveCharacterTextSplitter` with semantic awareness

**Rationale**:

- Provider-agnostic through LangChain abstraction
- Configurable chunk size and overlap (1000 chars / 200 overlap default)
- Recursive splitting respects document structure (paragraphs > sentences > words)
- Widely adopted pattern with proven performance

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Unstructured chunking | Integrated with parsing | Less control, API-dependent | Want local control over chunking |
| Fixed-size splitting | Simple, predictable | Breaks mid-sentence, loses context | Poor semantic coherence |
| Sentence-based splitting | Respects grammar | Variable chunk sizes, may be too small | Inconsistent retrieval performance |

**Configuration**:

```typescript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""], // Hierarchical separators
});

const chunks = await splitter.createDocuments(
  [extractedText],
  [{ documentId }]
);
```

---

## Decision 3: Embedding Model & Provider

**Decision**: Google Generative AI Embeddings via LangChain (`@langchain/google-genai`)

**Rationale**:

- Already using Google AI SDK in project (`@ai-sdk/google` in catalog)
- `text-embedding-004` model: 768 dimensions, good quality/cost balance
- LangChain wrapper enables easy provider switching
- Supports batch embedding for efficiency

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| OpenAI `text-embedding-3-small` | High quality, 1536 dims | Additional API key, cost | Already have Google AI setup |
| Supabase `gte-small` (local) | Free, 384 dims, runs in Edge Functions | Lower quality, limited languages | Need multilingual support |
| Cohere Embed | Good multilingual | Additional dependency | Google already sufficient |

**Integration Pattern**:

```typescript
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

// Embed single text
const vector = await embeddings.embedQuery(text);

// Batch embed
const vectors = await embeddings.embedDocuments(texts);
```

**Provider Switching**: To switch providers, change the import and constructor:

```typescript
// OpenAI alternative
import { OpenAIEmbeddings } from "@langchain/openai";
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

// Cohere alternative
import { CohereEmbeddings } from "@langchain/cohere";
const embeddings = new CohereEmbeddings();
```

---

## Decision 4: Vector Storage

**Decision**: pgvector extension with Drizzle ORM `vector` column type

**Rationale**:

- Already using Supabase PostgreSQL
- pgvector is production-ready and well-documented
- Supabase has native pgvector support
- Keep all data in same database (no separate vector DB)
- HNSW index for fast similarity search

**Implementation**:

```sql
-- Enable extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to chunks table
ALTER TABLE document_chunk
ADD COLUMN embedding vector(768);

-- Create HNSW index for cosine similarity
CREATE INDEX ON document_chunk
USING hnsw (embedding vector_cosine_ops);
```

**Drizzle Schema** (using `drizzle-orm/pg-core`):

```typescript
import { vector } from "drizzle-orm/pg-core";

export const documentChunk = pgTable("document_chunk", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  documentId: integer("document_id")
    .notNull()
    .references(() => document.id),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  // ...
});
```

---

## Decision 5: Background Task Architecture

**Decision**: Multi-stage Trigger.dev tasks with task chaining

**Rationale**:

- Already using Trigger.dev in project
- Task chaining enables independent retry per stage
- Each stage can be monitored separately
- Supports idempotency for partial progress recovery

**Task Flow**:

```
Upload → [extractDocument] → [chunkDocument] → [embedChunks]
              ↓                    ↓                 ↓
         Update status        Update status     Update status
         EXTRACTING           CHUNKING          EMBEDDING → READY
```

**Trigger.dev Patterns Used**:

1. **Task chaining**: `triggerAndWait()` for sequential execution
2. **Retry with exponential backoff**: `retry: { maxAttempts: 3, factor: 2 }`
3. **AbortTaskRunError**: For permanent failures (don't retry)
4. **Idempotency keys**: Prevent duplicate processing on retries

**Implementation**:

```typescript
import { task, AbortTaskRunError } from "@trigger.dev/sdk";

export const extractDocument = task({
  id: "extract-document",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload) => {
    // ... extraction logic

    // Chain to next task
    await chunkDocument.triggerAndWait({
      documentId: payload.documentId,
      extractedText,
    });
  },
  onFailure: async ({ payload, error }) => {
    // Update document status to ERROR
    await updateDocumentStatus(payload.documentId, "ERROR", error.message);
  },
});
```

---

## Decision 6: Document Status Tracking

**Decision**: Enum column on document table with error details in JSONB

**Rationale**:

- Simple query for status filtering
- JSONB error field supports structured error info
- Status updates are atomic with Drizzle transactions
- Enables real-time UI updates via polling or subscriptions

**Status Flow**:

```
UPLOADED → EXTRACTING → CHUNKING → EMBEDDING → READY
    ↓           ↓           ↓           ↓
  ERROR       ERROR       ERROR       ERROR
```

**Schema Extension**:

```typescript
export const documentStatusEnum = pgEnum("document_status", [
  "UPLOADED",
  "EXTRACTING",
  "CHUNKING",
  "EMBEDDING",
  "READY",
  "ERROR",
]);

// Add to document table
processingStatus: documentStatusEnum("processing_status").notNull().default("UPLOADED"),
processingError: jsonb("processing_error"), // { message, stage, timestamp }
extractedContent: text("extracted_content"), // Full extracted text
```

---

## Decision 7: Error Handling Strategy

**Decision**: Stage-specific error classification with retry policies

**Rationale**:

- Different errors require different handling
- Transient errors (API timeout) should retry
- Permanent errors (corrupt file) should abort immediately
- Error details stored for debugging

**Error Categories**:
| Error Type | Example | Action |
|------------|---------|--------|
| Transient | API timeout, rate limit | Retry with backoff |
| Permanent | Corrupt file, unsupported format | Abort, mark ERROR |
| Partial | Some chunks failed embedding | Resume from last success |

**Implementation**:

```typescript
import { AbortTaskRunError, retry } from "@trigger.dev/sdk";

// Permanent error - don't retry
if (!isValidMimeType(mimeType)) {
  throw new AbortTaskRunError(`Unsupported file type: ${mimeType}`);
}

// Transient error - use retry wrapper
const result = await retry.onThrow(
  async () => {
    return await unstructuredClient.partition(file);
  },
  { maxAttempts: 3 }
);
```

---

## Dependencies to Install

```bash
# LangChain core and text processing
bun add @langchain/core @langchain/textsplitters langchain

# Google AI embeddings
bun add @langchain/google-genai @google/generative-ai

# Document parsing
bun add unstructured-client

# pgvector support in Drizzle (already supported in drizzle-orm)
# No additional package needed - vector type is built-in
```

---

## Environment Variables Required

```env
# Unstructured.io API
UNSTRUCTURED_API_URL=https://api.unstructured.io/general/v0/general
UNSTRUCTURED_API_KEY=your-api-key

# Google AI (may already exist for other features)
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
```

---

## Open Questions (Resolved)

| Question              | Resolution                               |
| --------------------- | ---------------------------------------- |
| Embedding dimensions? | 768 (Google text-embedding-004)          |
| Chunk size/overlap?   | 1000 chars / 200 overlap (configurable)  |
| Vector index type?    | HNSW with cosine similarity              |
| Error storage format? | JSONB with message, stage, timestamp     |
| Task timeout?         | 5 minutes per task (Trigger.dev default) |
