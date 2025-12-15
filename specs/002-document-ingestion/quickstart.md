# Quickstart: Document Ingestion Pipeline

**Feature**: 002-document-ingestion
**Date**: 2024-12-14

## Overview

This guide walks you through setting up and using the document ingestion pipeline for extracting, chunking, and embedding documents.

---

## Prerequisites

1. **Database**: pgvector extension enabled on Supabase
2. **API Keys**:
   - Unstructured.io API key
   - Google AI API key (for embeddings)
3. **Trigger.dev**: Dev server running locally

---

## Step 1: Install Dependencies

```bash
cd packages/tasks
bun add @langchain/core @langchain/textsplitters @langchain/google-genai unstructured-client
```

---

## Step 2: Configure Environment Variables

Add to `.env` in the root or `packages/tasks/.env`:

```env
# Unstructured.io Document Parsing
UNSTRUCTURED_API_URL=https://api.unstructured.io/general/v0/general
UNSTRUCTURED_API_KEY=your-unstructured-api-key

# Google AI Embeddings
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key
```

---

## Step 3: Run Database Migration

Generate and apply the migration:

```bash
bun run db:generate
bun run db:push
```

Or apply the SQL manually:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add document status enum
CREATE TYPE document_status AS ENUM (
  'UPLOADED', 'EXTRACTING', 'CHUNKING', 'EMBEDDING', 'READY', 'ERROR'
);

-- Extend document table
ALTER TABLE document
ADD COLUMN processing_status document_status NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN processing_error jsonb,
ADD COLUMN extracted_content text,
ADD COLUMN chunk_count integer NOT NULL DEFAULT 0;

-- Create document_chunk table
CREATE TABLE document_chunk (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  document_id integer NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  content text NOT NULL,
  chunk_index integer NOT NULL,
  start_offset integer NOT NULL,
  end_offset integer NOT NULL,
  token_count integer,
  metadata jsonb,
  embedding vector(768),
  created_at timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX chunk_document_id_idx ON document_chunk (document_id);
CREATE INDEX chunk_embedding_hnsw_idx ON document_chunk
  USING hnsw (embedding vector_cosine_ops);
```

---

## Step 4: Start Trigger.dev Dev Server

```bash
cd packages/tasks
bunx trigger dev
```

---

## Step 5: Upload a Document

Upload via the web UI or API:

```typescript
// Using tRPC client
const result = await trpc.upload.uploadFile.mutate({
  spaceId: "your-space-id",
  fileName: "study-guide.pdf",
  fileType: "application/pdf",
  fileSize: 1024000,
  fileBuffer: base64EncodedFile,
});

console.log("Upload started:", result.key);
```

---

## Step 6: Monitor Processing Status

```typescript
// Poll for status updates
const { data } = await trpc.upload.getDocumentStatus.query({
  documentId: 123,
});

console.log("Status:", data.processingStatus);
// UPLOADED → EXTRACTING → CHUNKING → EMBEDDING → READY

if (data.processingStatus === "ERROR") {
  console.error("Error:", data.processingError);
}
```

---

## Step 7: Search Documents

Once documents are READY, use similarity search:

```typescript
const { data } = await trpc.upload.similaritySearch.query({
  spaceId: "your-space-id",
  query: "What is photosynthesis?",
  limit: 5,
  threshold: 0.7,
});

for (const result of data.results) {
  console.log(`[${result.similarity.toFixed(2)}] ${result.documentTitle}`);
  console.log(result.content.slice(0, 200) + "...");
}
```

---

## Processing Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        UPLOAD                                    │
│  User uploads PDF/DOCX/TXT file                                 │
│  Status: UPLOADED                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTRACT DOCUMENT                              │
│  - Download file from R2                                        │
│  - Send to Unstructured.io API                                  │
│  - Store extracted text in document.extracted_content           │
│  Status: EXTRACTING → triggers chunkDocument                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CHUNK DOCUMENT                               │
│  - Split text using RecursiveCharacterTextSplitter             │
│  - Create document_chunk records                                │
│  - Store chunk metadata (offsets, index)                        │
│  Status: CHUNKING → triggers embedChunks                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EMBED CHUNKS                                 │
│  - Generate embeddings via Google AI                            │
│  - Store vectors in document_chunk.embedding                    │
│  - Update document.chunk_count                                  │
│  Status: EMBEDDING → READY                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Retry Failed Document

```typescript
await trpc.upload.reprocessDocument.mutate({
  documentId: 123,
});
```

### View Error Details

```typescript
const doc = await trpc.upload.getDocumentStatus.query({
  documentId: 123,
});

if (doc.processingStatus === "ERROR" && doc.processingError) {
  console.log("Failed at stage:", doc.processingError.stage);
  console.log("Error message:", doc.processingError.message);
  console.log("Failed at:", doc.processingError.timestamp);
}
```

---

## Configuration Options

### Chunk Size

Adjust in `packages/tasks/src/lib/text-splitter.ts`:

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000, // Characters per chunk (default)
  chunkOverlap: 200, // Overlap between chunks (default)
});
```

### Embedding Model

Switch providers in `packages/tasks/src/lib/embeddings.ts`:

```typescript
// Google (default)
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
});

// Or switch to OpenAI
import { OpenAIEmbeddings } from "@langchain/openai";
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});
```

---

## Troubleshooting

### "pgvector extension not found"

Enable in Supabase dashboard: Database → Extensions → Search "vector" → Enable

### "Unstructured API timeout"

Large files may take longer. Increase timeout in task config:

```typescript
export const extractDocument = task({
  id: "extract-document",
  retry: { maxAttempts: 3, maxTimeoutInMs: 120_000 }, // 2 min
});
```

### "Embedding rate limit"

Google AI has rate limits. The task includes automatic retry with exponential backoff.

### "Chunks not showing in search"

1. Verify document status is "READY"
2. Check chunks have embeddings: `SELECT COUNT(*) FROM document_chunk WHERE embedding IS NOT NULL`
3. Ensure HNSW index exists: Check for `chunk_embedding_hnsw_idx`

---

## Next Steps

- **Q&A Feature**: Use `similaritySearch` as foundation for RAG-based Q&A
- **YouTube Support**: Extend extractDocument for video transcript extraction
- **OCR**: Add image-to-text for scanned PDFs via Unstructured.io OCR mode
