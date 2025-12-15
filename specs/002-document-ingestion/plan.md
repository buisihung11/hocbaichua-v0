# Implementation Plan: Document Ingestion Pipeline

**Branch**: `002-document-ingestion` | **Date**: 2024-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-document-ingestion/spec.md`

## Summary

Build an automated document ingestion pipeline that extracts text from uploaded files (PDF, DOC, DOCX, TXT), splits content into semantic chunks, and generates vector embeddings for semantic search. The pipeline uses Trigger.dev for async processing, LangChain for AI abstraction, Unstructured.io for document parsing, and pgvector for embedding storage.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:

- LangChain.js (`@langchain/core`, `@langchain/textsplitters`, `langchain`) - AI abstraction layer
- Trigger.dev (`@trigger.dev/sdk`) - Background task processing
- Unstructured.io (`unstructured-client`) - Document parsing and extraction
- Drizzle ORM (`drizzle-orm`) - Database operations
- pgvector extension - Vector storage and similarity search

**Storage**: PostgreSQL (Supabase) with pgvector extension, Cloudflare R2 for file storage
**Testing**: Vitest (unit tests), Trigger.dev test mode (integration)
**Target Platform**: Node.js serverless (Trigger.dev workers)
**Project Type**: Monorepo (apps/web, apps/server, packages/\*)
**Performance Goals**: <2 min end-to-end processing for files under 10MB
**Constraints**: Max 100MB file size, 3 retry attempts per task
**Scale/Scope**: 50 concurrent document uploads, 1536-dimension embeddings

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                        | Applicable | Status  | Justification                                                                                                                |
| -------------------------------- | ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| I. User-Centric AI Quality       | ✅ Yes     | ✅ PASS | Embedding generation uses validated LangChain SDK with schema validation; extraction accuracy criteria (95%) defined in spec |
| II. Educational Integrity        | ⚪ N/A     | -       | Feature is infrastructure; no direct student content generation                                                              |
| III. Type Safety & Accessibility | ✅ Yes     | ✅ PASS | All AI model inputs/outputs typed via Zod schemas; document status enables accessible UI feedback                            |
| IV. Testing & Validation         | ✅ Yes     | ✅ PASS | Integration tests required for AI model API contracts; retry logic with exponential backoff specified                        |
| V. Privacy & Data Protection     | ✅ Yes     | ✅ PASS | Documents processed within user's space (spaceId); no cross-user data access; files stored in user-scoped R2 paths           |

## Project Structure

### Documentation (this feature)

```text
specs/002-document-ingestion/
├── plan.md              # This file
├── research.md          # Phase 0 output - technology decisions
├── data-model.md        # Phase 1 output - schema extensions
├── quickstart.md        # Phase 1 output - developer guide
├── contracts/           # Phase 1 output - API contracts
│   └── ingestion-api.ts # tRPC router types
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── db/
│   └── src/
│       ├── schema/
│       │   └── space.ts           # Extended: document status, chunk, embedding tables
│       └── migrations/
│           └── XXXX_document_ingestion.sql
├── tasks/
│   └── src/
│       ├── trigger/
│       │   ├── extract-document.ts    # Modified: full text extraction
│       │   ├── chunk-document.ts      # New: text splitting task
│       │   └── embed-chunks.ts        # New: embedding generation task
│       └── lib/
│           ├── document-loaders/      # LangChain document loader wrappers
│           │   ├── index.ts
│           │   ├── pdf-loader.ts
│           │   ├── docx-loader.ts
│           │   └── text-loader.ts
│           ├── text-splitter.ts       # LangChain text splitter config
│           └── embeddings.ts          # LangChain embeddings abstraction
├── api/
│   └── src/
│       └── routers/
│           └── upload.ts              # Extended: status tracking endpoints
apps/
└── web/
    └── src/
        └── components/
            └── document-status.tsx    # New: processing status UI
```

**Structure Decision**: Monorepo structure with feature code distributed across existing packages. AI abstraction layer in `packages/tasks/src/lib/` enables provider switching via LangChain.

## Complexity Tracking

> No Constitution Check violations requiring justification.
