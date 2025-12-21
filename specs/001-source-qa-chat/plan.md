# Implementation Plan: Source-Based Q&A Chat with Citations

**Branch**: `001-source-qa-chat` | **Date**: December 16, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-source-qa-chat/spec.md` + streaming with AI SDK, markdown preview format

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a Q&A chat system that answers user questions based exclusively on their uploaded documents within a space. The system performs vector similarity search on document chunks, retrieves relevant context, and uses AI SDK streaming to generate responses in markdown format with source citations. Users can see the response stream in real-time and navigate to source documents via interactive citations.

## Technical Context

**Language/Version**: TypeScript 5.8+  
**Primary Dependencies**:

- LangChain.js (@langchain/google-genai) for backend LLM processing and RAG
- AI SDK (@ai-sdk/react v2.0.39) for frontend streaming UI hooks only
- tRPC v11.5.0 for type-safe API
- Drizzle ORM v0.44.2 for PostgreSQL queries
- pgvector extension for vector similarity search
- React 19 + TanStack Router for web UI

**Storage**: PostgreSQL (Supabase) with pgvector extension for embeddings

- Existing: document, documentChunk tables with embeddings (1536 dimensions)
- New: conversation, message, citation tables for chat history

**Testing**: NEEDS CLARIFICATION (testing framework TBD - Vitest likely based on monorepo)

**Target Platform**: Web application (React 19 + TanStack Start) with future mobile support (React Native + Expo)

**Project Type**: Monorepo web application (Turborepo)

- Frontend: apps/web (React 19 + TanStack Start)
- Backend: packages/api (tRPC routers)
- Database: packages/db (Drizzle ORM schemas)
- Background: packages/tasks (Trigger.dev - if needed for async processing)

**Performance Goals**:

- Response streaming starts within 2 seconds
- First token from LLM within 3 seconds
- Vector similarity search < 500ms
- Full answer generation within 10 seconds

**Constraints**:

- MUST use only user's uploaded documents (no external knowledge)
- MUST stream responses for real-time user feedback
- MUST render markdown format with proper syntax highlighting
- MUST support conversation context (last 3-5 exchanges)
- Rate limit: 20 questions per minute per user

**Scale/Scope**:

- ~5 new API endpoints (tRPC procedures)
- ~8 new React components (chat interface, message list, citation display)
- 3 new database tables (conversation, message, citation)
- Supports up to 10,000 document chunks per space search
- Conversation history up to 20 exchanges per session

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. User-Centric AI Quality ✅ PASS

- **AI Output Validation**: REQUIRED - Answer generation must validate that responses are grounded in retrieved context (FR-007). System must refuse to answer when similarity scores fall below threshold (FR-010).
- **Model Selection Justification**: Google Gemini via AI SDK chosen for:
  - Strong factual accuracy for summarization tasks
  - Native streaming support for real-time feedback
  - Cost-effective for educational use case
- **Educational Value**: System explicitly designed to enhance learning by providing verifiable citations (FR-008, FR-009), enabling students to trace answers back to source material.

**Action**: Implement response validation logic to detect hallucinations and off-context answers.

### II. Educational Integrity ✅ PASS

- **AI Transparency**: Citations clearly distinguish AI-generated summaries from original source material (FR-008). Each answer includes explicit source references.
- **Academic Honesty**: System refuses external knowledge (FR-007), preventing students from accessing information beyond their uploaded materials, which maintains academic boundaries.
- **Critical Thinking**: Interactive citations (FR-009) encourage students to verify AI answers against source documents rather than blindly accepting responses.

**Action**: Add UI messaging explaining that answers are AI-generated summaries of source material.

### III. Type Safety & Accessibility ✅ PASS (Post-Design)

- **Type Safety**:
  - ✅ TypeScript-first with tRPC ensures end-to-end type safety for API boundaries
  - ✅ Drizzle ORM provides typed database schemas
  - ✅ AI model inputs/outputs defined with Zod schemas (see contracts/api-contracts.md)
  - ✅ Streaming chunks typed with AI SDK protocol
- **Accessibility**:
  - ✅ WCAG 2.1 Level AA patterns defined (see research.md section 6)
  - ✅ Chat interface uses role="log" and aria-live="polite" for screen readers
  - ✅ Keyboard navigation implemented (Tab, Enter, focus management)
  - ✅ Citation links have descriptive aria-label attributes
  - ✅ Focus remains in input during streaming (no focus theft)

**Action Complete**: Zod schemas defined in API contracts. Accessible chat patterns specified in research.md and implemented in quickstart.md.

### IV. Testing & Validation (Critical Paths) ✅ PASS (Post-Research)

**Test-First MANDATORY for**:

1. ✅ AI output validation logic (response grounding detection) - Vitest
2. ✅ Message/citation persistence and retrieval - Vitest + @testing-library/react
3. ✅ Vector similarity search accuracy (threshold testing) - Vitest
4. ✅ Testing framework confirmed: Vitest + @testing-library/react (already installed)

**Integration Tests REQUIRED for**:

- ✅ LLM API streaming contract (mock responses) - Specified in quickstart.md
- ✅ Database schema for conversation/message/citation tables - Migration tests
- ✅ Vector search with pgvector - Unit tests in vector-search.test.ts

**Action Complete**: Testing framework clarified in research.md. Test examples provided in quickstart.md. Test specs will be detailed in Phase 2 (tasks.md).

### V. Privacy & Data Protection ✅ PASS

- **Data Minimization**: Conversations only store question text, answer text, and chunk references. No raw document content duplicated (FR-011).
- **User Consent**: Questions only access documents within user's space (FR-004), ensuring explicit boundary control.
- **AI Provider Data Retention**: Must verify Google AI API data retention policy - typically no retention for API calls per their terms.
- **Secure Processing**: Citations reference chunk IDs rather than exposing raw embeddings or sensitive metadata.

**Action**: Document Google AI API data retention policy in research.md. Ensure conversation data is scoped to user/space.

---

**GATE STATUS: ✅ PASS (Post-Phase 1 Design)**

**Phase 0 Requirements Resolved**:

1. ✅ Resolved testing framework: Vitest + @testing-library/react (Principle IV)
2. ✅ Researched accessibility patterns: ARIA live regions, keyboard nav (Principle III)
3. ✅ Defined Zod schemas for AI model I/O in API contracts (Principle III)
4. ✅ Verified Google AI API data retention policy: No retention (Principle V)

**All 5 Principles Compliant** - Ready for Phase 2 (task breakdown in tasks.md).

## Project Structure

### Documentation (this feature)

```text
specs/001-source-qa-chat/
├── spec.md                       # Feature specification (input)
├── plan.md                       # This file (Phase 0-1 output)
├── research.md                   # Research findings (Phase 0)
├── data-model.md                 # Database schema design (Phase 1)
├── quickstart.md                 # Implementation guide (Phase 1)
├── contracts/
│   └── api-contracts.md          # tRPC API specifications (Phase 1)
├── checklists/
│   └── requirements.md           # Acceptance criteria checklist
└── tasks.md                      # GitHub issues breakdown (Phase 2 - NOT yet created)
```

### Source Code (repository root)

**Structure Decision**: Monorepo with Turborepo, web application with backend packages

```text
packages/
├── db/
│   └── src/
│       └── schema/
│           ├── chat.ts           # NEW: conversation, message, citation tables
│           └── relations.ts      # UPDATE: Add chat relations
│
├── api/
│   └── src/
│       ├── routers/
│       │   ├── chat.ts           # NEW: Chat router export
│       │   ├── conversation.ts   # NEW: Conversation procedures
│       │   └── message.ts        # NEW: Message procedures with streaming
│       ├── lib/
│       │   ├── vector-search.ts  # NEW: Vector similarity search helper
│       │   └── embeddings.ts     # NEW: Generate embeddings for questions
│       └── middleware/
│           └── rate-limit.ts     # NEW: Rate limiting (20/min)
│
apps/
└── web/
    └── src/
        ├── components/
        │   └── chat/
        │       ├── chat-interface.tsx      # NEW: Main chat UI
        │       ├── markdown-message.tsx    # NEW: Markdown renderer
        │       └── citation-list.tsx       # NEW: Citation display
        │
        └── routes/
            └── spaces/
                └── $spaceId/
                    └── chat/
                        └── $conversationId.tsx  # NEW: Chat page route
```

**Key Additions**:

- 3 new database tables (conversation, message, citation)
- 2 new tRPC routers (conversation, message)
- 3 new React components (chat interface, markdown, citations)
- 2 new utility modules (vector search, embeddings)
- 1 new middleware (rate limiting)

**Existing Integrations**:

- Uses existing `documentChunk` table with embeddings
- Integrates with existing `space` and `user` tables
- Follows existing monorepo patterns (tRPC, Drizzle, AI SDK)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
