# Tasks: Document Ingestion Pipeline

**Input**: Design documents from `/specs/002-document-ingestion/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in spec - test tasks omitted. Add manually if TDD approach desired.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, US4)
- Exact file paths included in descriptions

## Path Conventions (Monorepo)

- **packages/db/src/**: Database schema and migrations
- **packages/tasks/src/**: Trigger.dev tasks and LangChain libs
- **packages/api/src/**: tRPC routers
- **apps/web/src/**: Web UI components

---

## Phase 1: Setup

**Purpose**: Install dependencies and configure environment

- [x] T001 Install LangChain dependencies in packages/tasks/package.json (`@langchain/core`, `@langchain/textsplitters`, `@langchain/google-genai`, `unstructured-client`)
- [x] T002 [P] Add environment variables to `.env.example` (UNSTRUCTURED_API_URL, UNSTRUCTURED_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY)
- [x] T003 [P] Add `drizzle-orm/pg-core` vector import to packages/db (verify pgvector support)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `documentStatusEnum` to packages/db/src/schema/space.ts (UPLOADED, EXTRACTING, CHUNKING, EMBEDDING, READY, ERROR)
- [x] T005 Extend `document` table in packages/db/src/schema/space.ts with new columns (processingStatus, processingError, extractedContent, chunkCount)
- [x] T006 Create `documentChunk` table in packages/db/src/schema/space.ts with embedding vector(768) column
- [x] T007 Add document-chunk relations in packages/db/src/schema/relations.ts
- [x] T008 Export new schemas from packages/db/src/index.ts
- [x] T009 Generate and run migration for document ingestion schema changes (`bun run db:generate && bun run db:push`)
- [x] T010 [P] Create LangChain text splitter utility in packages/tasks/src/lib/text-splitter.ts
- [x] T011 [P] Create LangChain embeddings abstraction in packages/tasks/src/lib/embeddings.ts

**Checkpoint**: Foundation ready - schema deployed, LangChain utilities available

---

## Phase 3: User Story 1 - Extract Text from Uploaded Documents (Priority: P1) 🎯 MVP

**Goal**: Automatically extract readable text from uploaded files (PDF, DOC, DOCX, TXT) using Unstructured.io

**Independent Test**: Upload a PDF document → verify `extracted_content` column is populated with full text content

### Implementation for User Story 1

- [x] T012 [US1] Create Unstructured.io client wrapper in packages/tasks/src/lib/document-loaders/unstructured-client.ts
- [x] T013 [P] [US1] Create PDF loader using Unstructured in packages/tasks/src/lib/document-loaders/pdf-loader.ts
- [x] T014 [P] [US1] Create DOCX loader using Unstructured in packages/tasks/src/lib/document-loaders/docx-loader.ts
- [x] T015 [P] [US1] Create TXT loader (direct read) in packages/tasks/src/lib/document-loaders/text-loader.ts
- [x] T016 [US1] Create document loader factory in packages/tasks/src/lib/document-loaders/index.ts (selects loader by MIME type)
- [x] T017 [US1] Modify existing extract-document task in packages/tasks/src/trigger/extract-document.ts to use LangChain loaders
- [x] T018 [US1] Add status update logic in extract-document task (UPLOADED → EXTRACTING → trigger next task or ERROR)
- [x] T019 [US1] Store extracted text in document.extractedContent after successful extraction

**Checkpoint**: Upload any supported file → text is extracted and stored. Document shows EXTRACTING status during processing.

---

## Phase 4: User Story 2 - Chunk Documents for Retrieval (Priority: P2)

**Goal**: Split extracted text into semantic chunks for retrieval

**Independent Test**: Document with extracted text → verify document_chunk records created with proper indices and offsets

### Implementation for User Story 2

- [x] T020 [US2] Create chunk-document task in packages/tasks/src/trigger/chunk-document.ts
- [x] T021 [US2] Implement text splitting using RecursiveCharacterTextSplitter in chunk-document task
- [x] T022 [US2] Insert document_chunk records with content, chunkIndex, startOffset, endOffset
- [x] T023 [US2] Update document.chunkCount after successful chunking
- [x] T024 [US2] Add status update logic (EXTRACTING → CHUNKING → trigger embed task or ERROR)
- [x] T025 [US2] Chain chunk-document task from extract-document using `triggerAndWait()`
- [x] T026 [US2] Export chunk-document task from packages/tasks/src/index.ts

**Checkpoint**: Extracted documents are automatically chunked. Chunk records visible in database with metadata.

---

## Phase 5: User Story 3 - Generate Embeddings for Semantic Search (Priority: P3)

**Goal**: Generate vector embeddings for each chunk using Google AI

**Independent Test**: Document with chunks → verify all chunks have non-null embedding vectors → perform similarity search

### Implementation for User Story 3

- [x] T027 [US3] Create embed-chunks task in packages/tasks/src/trigger/embed-chunks.ts
- [x] T028 [US3] Implement batch embedding using GoogleGenerativeAIEmbeddings in embed-chunks task
- [x] T029 [US3] Update document_chunk.embedding for each chunk with generated vectors
- [x] T030 [US3] Add status update logic (CHUNKING → EMBEDDING → READY or ERROR)
- [x] T031 [US3] Chain embed-chunks task from chunk-document using `triggerAndWait()`
- [x] T032 [US3] Handle rate limiting with retry and exponential backoff in embed-chunks task
- [x] T033 [US3] Export embed-chunks task from packages/tasks/src/index.ts
- [x] T034 [US3] Create similarity search helper in packages/tasks/src/lib/similarity-search.ts (raw SQL with pgvector)

**Checkpoint**: All chunks have embeddings. Documents reach READY status. Similarity search returns relevant chunks.

---

## Phase 6: User Story 4 - Track Document Processing Status (Priority: P2)

**Goal**: Expose processing status via API and UI for user visibility

**Independent Test**: Upload document → API returns current status → UI shows status transitions

### Implementation for User Story 4

- [x] T035 [US4] Add `getDocumentStatus` procedure to packages/api/src/routers/upload.ts
- [x] T036 [P] [US4] Add `listDocumentsByStatus` procedure to packages/api/src/routers/upload.ts
- [x] T037 [P] [US4] Add `getDocumentChunks` procedure to packages/api/src/routers/upload.ts
- [x] T038 [P] [US4] Add `reprocessDocument` mutation to packages/api/src/routers/upload.ts
- [x] T039 [US4] Add `similaritySearch` procedure to packages/api/src/routers/upload.ts
- [x] T040 [US4] Create DocumentStatusBadge component in apps/web/src/components/document-status-badge.tsx
- [x] T041 [US4] Create DocumentProcessingProgress component in apps/web/src/components/document-processing-progress.tsx
- [x] T042 [US4] Integrate status display into document list view (update existing document list component)

**Checkpoint**: Users see real-time processing status. Error details visible. Reprocess action available for failed documents.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, logging, and validation

- [x] T043 Add error handling with AbortTaskRunError for permanent failures in all Trigger tasks
- [x] T044 [P] Add logging for pipeline stages in all Trigger tasks (extraction, chunking, embedding)
- [x] T045 [P] Update packages/tasks/README.md with document ingestion pipeline documentation
- [x] T046 Run quickstart.md validation (verify all setup steps work end-to-end)
- [x] T047 Verify HNSW index exists for vector similarity search (check migration applied correctly)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup → Phase 2: Foundational → [Phase 3, 4, 5, 6] → Phase 7: Polish
                        ↓
                  BLOCKS ALL
                  USER STORIES
```

### User Story Dependencies

| Story         | Depends On        | Can Parallelize With |
| ------------- | ----------------- | -------------------- |
| US1 (Extract) | Foundational only | US4 (Status API)     |
| US2 (Chunk)   | US1 completion    | US4 (Status API)     |
| US3 (Embed)   | US2 completion    | US4 (Status API)     |
| US4 (Status)  | Foundational only | US1, US2, US3        |

### Within Each User Story

1. Loaders/utilities before tasks
2. Core task implementation before chaining
3. Status updates integrated with task logic
4. Export tasks from index.ts

### Parallel Opportunities

**Phase 2 (Foundational)**:

- T010 and T011 can run in parallel (different files)

**Phase 3 (US1)**:

- T013, T014, T015 can run in parallel (different loader files)

**Phase 6 (US4)**:

- T035, T036, T037, T038 can run in parallel (different procedures, same file but independent)
- T040, T041 can run in parallel (different components)

---

## Parallel Example: User Story 1

```bash
# After T012 completes, launch all loaders together:
Task T013: "Create PDF loader in packages/tasks/src/lib/document-loaders/pdf-loader.ts"
Task T014: "Create DOCX loader in packages/tasks/src/lib/document-loaders/docx-loader.ts"
Task T015: "Create TXT loader in packages/tasks/src/lib/document-loaders/text-loader.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T011) ⚠️ CRITICAL
3. Complete Phase 3: User Story 1 (T012-T019)
4. **STOP and VALIDATE**: Upload PDF → text extracted
5. Deploy/demo if ready (documents now have extracted content)

### Incremental Delivery

| Increment   | Stories         | Value Delivered                        |
| ----------- | --------------- | -------------------------------------- |
| MVP         | US1             | Text extraction from documents         |
| +Chunking   | US1 + US2       | Documents split into searchable chunks |
| +Embeddings | US1 + US2 + US3 | Semantic search enabled                |
| +Status UI  | All             | Full user visibility and control       |

### Suggested Execution Order

```
T001 → T002 ∥ T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 ∥ T011
→ T012 → T013 ∥ T014 ∥ T015 → T016 → T017 → T018 → T019 (MVP COMPLETE)
→ T020 → T021 → T022 → T023 → T024 → T025 → T026
→ T027 → T028 → T029 → T030 → T031 → T032 → T033 → T034
→ T035 ∥ T036 ∥ T037 ∥ T038 → T039 → T040 ∥ T041 → T042
→ T043 ∥ T044 ∥ T045 → T046 → T047
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- Each user story is independently testable after completion
- Commit after each task or logical group
- Stop at any checkpoint to validate progress
- LangChain abstractions enable easy provider switching (see research.md)
