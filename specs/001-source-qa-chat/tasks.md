# Tasks: Source-Based Q&A Chat with Citations

**Feature**: `001-source-qa-chat` | **Date**: December 16, 2025  
**Input**: Design documents from `/specs/001-source-qa-chat/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Architecture**: LangChain SDK for backend LLM processing + AI SDK for frontend UI hooks  
**Tests**: Not explicitly requested - tests are OPTIONAL and NOT included in this breakdown

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency management

- [x] T001 Install LangChain dependencies in packages/api: @langchain/google-genai, @langchain/core
- [x] T002 [P] Verify AI SDK React dependencies in apps/web: @ai-sdk/react v2.0.39
- [x] T003 [P] Verify pgvector extension is enabled in PostgreSQL database
- [x] T004 [P] Add GOOGLE_API_KEY to environment configuration in .env.example and deployment configs

**Checkpoint**: Dependencies installed, environment ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create database migrations for conversation table in packages/db/src/migrations/
- [x] T006 [P] Create database migrations for message table in packages/db/src/migrations/
- [x] T007 [P] Create database migrations for citation table in packages/db/src/migrations/
- [x] T008 Define conversation schema with Drizzle ORM in packages/db/src/schema/conversation.ts
- [x] T009 [P] Define message schema with Drizzle ORM in packages/db/src/schema/message.ts
- [x] T010 [P] Define citation schema with Drizzle ORM in packages/db/src/schema/citation.ts
- [x] T011 Add schema relations for conversation → messages → citations in packages/db/src/schema/relations.ts
- [x] T012 Export new schemas from packages/db/src/index.ts
- [x] T013 Run database migrations to create tables
- [x] T014 Create embedding helper using LangChain GoogleGenerativeAIEmbeddings in packages/api/src/lib/embeddings.ts
- [x] T015 Create vector similarity search helper with pgvector in packages/api/src/lib/vector-search.ts
- [x] T016 [P] Initialize LangChain ChatGoogleGenerativeAI model config in packages/api/src/lib/langchain-config.ts
- [x] T017 [P] Create rate limiter setup with Upstash Redis (20 req/min) in packages/api/src/lib/rate-limit.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Ask Questions About Uploaded Documents (Priority: P1) 🎯 MVP

**Goal**: Enable students to ask natural language questions and receive AI-generated answers based exclusively on their uploaded documents

**Independent Test**: Upload a document with specific content, ask a question that can be answered from that document, verify the response correctly answers using only the uploaded source content

### Implementation for User Story 1

- [x] T018 [P] [US1] Create conversation router stub in packages/api/src/routers/conversation.ts
- [x] T019 [P] [US1] Create message router stub in packages/api/src/routers/message.ts
- [x] T020 [US1] Implement chat.conversation.create procedure in packages/api/src/routers/conversation.ts
- [x] T021 [US1] Implement chat.message.ask procedure with LangChain streaming in packages/api/src/routers/message.ts
- [x] T022 [US1] Create LangChain RAG chain with ChatPromptTemplate for context injection in packages/api/src/routers/message.ts
- [x] T023 [US1] Implement stream conversion from LangChain to AI SDK SSE format in packages/api/src/routers/message.ts
- [x] T024 [US1] Add validation logic to detect when no relevant chunks found (threshold < 0.7) in packages/api/src/routers/message.ts
- [x] T025 [US1] Add "I cannot find information" fallback response logic in packages/api/src/routers/message.ts
- [x] T026 [US1] Wire up conversation and message routers to main chat router in packages/api/src/routers/chat.ts
- [x] T027 [US1] Export chat router from packages/api/src/index.ts
- [x] T028 [P] [US1] Create ChatInterface component in apps/web/src/components/chat/ChatInterface.tsx
- [x] T029 [P] [US1] Implement useChat hook integration with tRPC endpoint in apps/web/src/components/chat/ChatInterface.tsx
- [x] T030 [US1] Add chat input field with submit handler in apps/web/src/components/chat/ChatInterface.tsx
- [x] T031 [US1] Add message list display with user/assistant role styling in apps/web/src/components/chat/ChatInterface.tsx
- [x] T032 [US1] Add loading indicator during streaming in apps/web/src/components/chat/ChatInterface.tsx
- [x] T033 [US1] Add empty state UI when no documents uploaded in apps/web/src/components/chat/ChatInterface.tsx
- [x] T034 [P] [US1] Create chat route in apps/web/src/routes/app/spaces/$spaceId.chat.tsx
- [x] T035 [US1] Mount ChatInterface component in chat route with space context

**Checkpoint**: User Story 1 complete - students can ask questions and receive answers from uploaded documents

---

## Phase 4: User Story 2 - View Source Citations for Answers (Priority: P1) 🎯 MVP

**Goal**: Display clickable citations showing which documents and sections were used to generate each answer

**Independent Test**: Ask a question, verify the answer includes document name, text excerpt, and clickable navigation to source

### Implementation for User Story 2

- [x] T036 [US2] Update chat.message.ask to save citations to database after streaming in packages/api/src/routers/message.ts
- [x] T037 [US2] Implement chat.message.getWithCitations procedure in packages/api/src/routers/message.ts
- [x] T038 [US2] Add citation metadata to streaming SSE events in packages/api/src/routers/message.ts (returned in response object)
- [x] T039 [P] [US2] Create Citation component in apps/web/src/components/chat/Citation.tsx
- [x] T040 [P] [US2] Create CitationList component in apps/web/src/components/chat/CitationList.tsx
- [x] T041 [US2] Add citation display logic to ChatInterface component in apps/web/src/components/chat/ChatInterface.tsx
- [x] T042 [US2] Implement citation click handler to navigate to document in apps/web/src/components/chat/Citation.tsx
- [x] T043 [US2] Add aria-label attributes to citation links for screen readers in apps/web/src/components/chat/Citation.tsx
- [x] T044 [US2] Style citations with document name, excerpt preview, and relevance indicator in apps/web/src/components/chat/Citation.tsx

**Checkpoint**: User Stories 1 AND 2 complete - students see and can navigate citations

---

## Phase 5: User Story 3 - Maintain Conversation Context (Priority: P2)

**Goal**: Enable follow-up questions in the same conversation without repeating context

**Independent Test**: Ask initial question, receive answer, then ask follow-up using pronouns (e.g., "What about the second method?"), verify system understands context

### Implementation for User Story 3

- [x] T045 [US3] Update chat.message.ask to include conversation history in LangChain messages array in packages/api/src/routers/message.ts
- [x] T046 [US3] Add contextLimit parameter to control how many previous exchanges to include in packages/api/src/routers/message.ts
- [x] T047 [US3] Format conversation history as LangChain message format [(role, content)] in packages/api/src/routers/message.ts
- [x] T048 [US3] Update ChatPromptTemplate to handle conversation history messages in packages/api/src/routers/message.ts
- [x] T049 [US3] Add includeContext boolean parameter to chat.message.ask procedure schema in packages/api/src/routers/message.ts
- [x] T050 [P] [US3] Add conversation context UI toggle in ChatInterface component in apps/web/src/components/chat/ChatInterface.tsx
- [x] T051 [US3] Display conversation history in message list with timestamp grouping in apps/web/src/components/chat/ChatInterface.tsx

**Checkpoint**: User Stories 1, 2, AND 3 complete - students can have multi-turn conversations

---

## Phase 6: User Story 4 - Search Across All Space Documents (Priority: P2)

**Goal**: Search and synthesize information from all documents in the user's space

**Independent Test**: Upload multiple related documents, ask question requiring info from multiple sources, verify answer synthesizes content with citations from each

### Implementation for User Story 4

- [x] T052 [US4] Update vector-search helper to filter by spaceId in packages/api/src/lib/vector-search.ts
- [x] T053 [US4] Add topK parameter (default: 5) to retrieve multiple relevant chunks in packages/api/src/lib/vector-search.ts
- [x] T054 [US4] Update context building to include document titles for multi-source tracking in packages/api/src/routers/message.ts
- [x] T055 [US4] Format context chunks with [Source N - DocumentTitle] prefixes in packages/api/src/routers/message.ts
- [x] T056 [US4] Update LangChain system prompt to instruct citing multiple sources in packages/api/src/routers/message.ts
- [x] T057 [US4] Enhance CitationList to group citations by document in apps/web/src/components/chat/CitationList.tsx
- [x] T058 [US4] Add document count badge showing how many sources used in apps/web/src/components/chat/CitationList.tsx

**Checkpoint**: User Stories 1-4 complete - students can search across all space documents

---

## Phase 7: User Story 5 - View Chat History (Priority: P3)

**Goal**: Review previous questions and answers, track learning progress

**Independent Test**: Have multiple Q&A exchanges, close chat interface, reopen, verify all previous conversations are visible

### Implementation for User Story 5

- [x] T059 [P] [US5] Implement chat.conversation.list procedure with pagination in packages/api/src/routers/conversation.ts
- [x] T060 [P] [US5] Implement chat.conversation.get procedure with full message history in packages/api/src/routers/conversation.ts
- [x] T061 [P] [US5] Implement chat.conversation.delete procedure in packages/api/src/routers/conversation.ts
- [x] T062 [P] [US5] Implement chat.message.list procedure for conversation in packages/api/src/routers/message.ts
- [x] T063 [P] [US5] Create ConversationList component in apps/web/src/components/chat/ConversationList.tsx
- [x] T064 [P] [US5] Create ConversationListItem component with title/timestamp in apps/web/src/components/chat/ConversationListItem.tsx
- [x] T065 [US5] Add conversation sidebar to ChatInterface with list/delete actions in apps/web/src/routes/app/spaces/$spaceId.chat.tsx
- [x] T066 [US5] Implement conversation selection to load history in apps/web/src/components/chat/ChatInterface.tsx
- [x] T067 [US5] Add "New Conversation" button to start fresh chat in apps/web/src/components/chat/ConversationList.tsx
- [x] T068 [US5] Implement conversation title auto-generation from first message in packages/api/src/routers/conversation.ts
- [x] T069 [US5] Add conversation updatedAt timestamp update on new messages in packages/api/src/routers/message.ts

**Checkpoint**: All 5 user stories complete - full chat history and persistence

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories, accessibility, and production readiness

- [x] T070 [P] Add markdown rendering with react-markdown + remark-gfm in apps/web/src/components/chat/MarkdownMessage.tsx
- [x] T071 [P] Add syntax highlighting for code blocks in markdown in apps/web/src/components/chat/MarkdownMessage.tsx
- [x] T072 Implement ARIA live regions (role="log", aria-live="polite") for streaming messages in apps/web/src/components/chat/ChatInterface.tsx
- [x] T073 [P] Add keyboard navigation (Tab, Enter) for chat input and citations in apps/web/src/components/chat/ChatInterface.tsx
- [x] T074 [P] Prevent focus theft during streaming - keep focus in input field in apps/web/src/components/chat/ChatInterface.tsx
- [ ] T075 Add rate limiting middleware to chat.message.ask endpoint (20 req/min) in packages/api/src/routers/message.ts
- [x] T076 [P] Add error handling for LLM API failures with user-friendly messages in packages/api/src/routers/message.ts
- [x] T077 [P] Add error handling for vector search failures in packages/api/src/lib/vector-search.ts
- [x] T078 Add logging for question processing metrics (time, chunks retrieved) in packages/api/src/routers/message.ts
- [x] T079 [P] Add empty state when space has no documents in apps/web/src/components/chat/ChatInterface.tsx
- [x] T080 [P] Add loading skeleton UI while loading chat history in apps/web/src/components/chat/ChatInterface.tsx
- [ ] T081 Implement "Show more" truncation for very long answers (>1000 words) in apps/web/src/components/chat/MarkdownMessage.tsx
- [x] T082 [P] Add metadata tracking (model, processingTime, chunksRetrieved) in message table in packages/api/src/routers/message.ts
- [x] T083 [P] Document chat API endpoints in packages/api/README.md
- [ ] T084 Run quickstart.md validation steps and update documentation as needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Setup - **BLOCKS all user stories**
- **Phase 3 (US1 - P1)**: Depends on Foundational - Core MVP functionality
- **Phase 4 (US2 - P1)**: Can run in parallel with US1 OR after US1 - Also MVP
- **Phase 5 (US3 - P2)**: Depends on US1 and US2 being complete
- **Phase 6 (US4 - P2)**: Can run in parallel with US3 - Independent of conversation context
- **Phase 7 (US5 - P3)**: Depends on US1 and US2 - Can run in parallel with US3/US4
- **Phase 8 (Polish)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (Ask Questions)**: Can start after Foundational - No dependencies on other stories
- **US2 (Citations)**: Integrates with US1 but can develop in parallel (needs message streaming)
- **US3 (Conversation Context)**: Extends US1 by adding history to prompt - Depends on US1
- **US4 (Multi-Document Search)**: Enhances vector search from US1 - Independent of US2/US3
- **US5 (Chat History)**: Extends UI to persist and list conversations - Depends on US1/US2 for chat to exist

### Critical Path (MVP)

**Minimum viable product = US1 + US2 only**

1. Phase 1: Setup (T001-T004)
2. Phase 2: Foundational (T005-T017) ⚠️ BLOCKS everything
3. Phase 3: US1 (T018-T035) - Ask questions, get answers
4. Phase 4: US2 (T036-T044) - Show citations
5. Selected Polish tasks: T070-T074 (markdown + accessibility)

**Total MVP Tasks**: 57 tasks  
**Estimated Time**: 15-21 hours (per quickstart.md)

### Parallel Opportunities

#### Within Setup (Phase 1)

```bash
# All Phase 1 tasks except T001 can run in parallel:
T002 [P] - Verify AI SDK dependencies
T003 [P] - Verify pgvector extension
T004 [P] - Add environment config
```

#### Within Foundational (Phase 2)

```bash
# After migration framework setup, all schema tasks can run in parallel:
T006 [P] - message table migration
T007 [P] - citation table migration
T009 [P] - message schema
T010 [P] - citation schema
T016 [P] - LangChain model config
T017 [P] - Rate limiter setup
```

#### Within User Story 1

```bash
# Frontend and backend can proceed in parallel after T020:
Backend track: T021 → T022 → T023 → T024 → T025 → T026 → T027
Frontend track: T028 [P] + T029 [P] → T030 → T031 → T032 → T033 → T034 [P] → T035
```

#### Within User Story 2

```bash
# Backend and frontend components can develop in parallel:
Backend: T036 → T037 → T038
Frontend: T039 [P] + T040 [P] → T041 → T042 → T043 → T044
```

#### User Stories After Foundational

```bash
# Once Phase 2 complete, multiple stories can proceed:
Team A: US1 (T018-T035) - Core Q&A
Team B: US2 (T036-T044) - Citations (starts after US1 streaming works)
Then parallel:
Team A: US3 (T045-T051) - Conversation context
Team B: US4 (T052-T058) - Multi-doc search
Team C: US5 (T059-T069) - Chat history
```

#### Within Polish (Phase 8)

```bash
# Most polish tasks are independent:
T070 [P] - Markdown rendering
T071 [P] - Syntax highlighting
T073 [P] - Keyboard navigation
T074 [P] - Focus management
T076 [P] - Error handling LLM
T077 [P] - Error handling vector search
T079 [P] - Empty state UI
T080 [P] - Loading skeleton
T082 [P] - Metadata tracking
T083 [P] - API documentation
```

---

## Parallel Example: User Story 1 Backend + Frontend

```bash
# After conversation router created (T020), launch in parallel:

Backend Track:
  Task T021: "Implement chat.message.ask with LangChain"
  Task T022: "Create RAG chain with ChatPromptTemplate"
  Task T023: "Convert LangChain stream to AI SDK format"

Frontend Track (while backend develops):
  Task T028 [P]: "Create ChatInterface component"
  Task T029 [P]: "Implement useChat hook integration"
  Task T034 [P]: "Create chat route"

# Frontend can build UI shell while backend builds streaming logic
# Integration happens when T023 (stream conversion) complete
```

---

## Implementation Strategy

### 🎯 MVP First (US1 + US2 Only) - Recommended

**Goal**: Deliver core Q&A with citations as quickly as possible

1. **Phase 1**: Setup (T001-T004) - ~1 hour
2. **Phase 2**: Foundational (T005-T017) - ~4-6 hours ⚠️ CRITICAL
3. **Phase 3**: US1 - Ask Questions (T018-T035) - ~6-8 hours
4. **Phase 4**: US2 - Citations (T036-T044) - ~3-4 hours
5. **Selected Polish**: Markdown + Accessibility (T070-T074) - ~2 hours

**Total MVP**: ~16-21 hours  
**Result**: Students can ask questions, get cited answers from their documents

**STOP and VALIDATE**: Test independently before adding more features

### 📈 Incremental Delivery

After MVP validation, add features one story at a time:

1. **MVP (US1 + US2)** → Deploy/Demo ✅
2. **+ US3 (Conversation Context)** → Deploy/Demo (now multi-turn)
3. **+ US4 (Multi-Document Search)** → Deploy/Demo (now comprehensive)
4. **+ US5 (Chat History)** → Deploy/Demo (now persistent)
5. **+ Remaining Polish** → Production ready

Each increment adds value without breaking previous functionality.

### 👥 Parallel Team Strategy

With 3+ developers available:

1. **All together**: Phase 1 (Setup) + Phase 2 (Foundational) - ~5-7 hours
2. **Once Foundational complete**:
   - **Developer A**: US1 (Core Q&A) - ~6-8 hours
   - **Developer B**: Wait for US1 streaming, then US2 (Citations) - ~3-4 hours
3. **After MVP (US1+US2)**:
   - **Developer A**: US3 (Conversation Context) - ~3-4 hours
   - **Developer B**: US4 (Multi-Document) - ~3-4 hours
   - **Developer C**: US5 (Chat History) - ~4-5 hours
4. **All together**: Phase 8 (Polish) - ~3-4 hours

**Total parallel time**: ~15-20 hours (vs 30+ hours sequential)

---

## Success Validation

### After US1 Complete

- [ ] Can ask question about uploaded document
- [ ] Receive answer within 10 seconds
- [ ] Answer uses only document content (no external knowledge)
- [ ] "No relevant information" shown when threshold not met

### After US2 Complete (MVP)

- [ ] Every answer includes citations
- [ ] Citations show document name and excerpt
- [ ] Can click citation to navigate to source
- [ ] All MVP acceptance criteria passing

### After US3 Complete

- [ ] Can ask follow-up question using pronouns
- [ ] System maintains context from previous exchanges
- [ ] Context limited to last 3-5 exchanges

### After US4 Complete

- [ ] Questions search all documents in space
- [ ] Answers synthesize multiple sources
- [ ] Each source properly cited
- [ ] Search completes within 5 seconds

### After US5 Complete

- [ ] Previous conversations persist after closing
- [ ] Can view and restore chat history
- [ ] Can delete old conversations
- [ ] Conversation titles auto-generated

### Production Ready (After Phase 8)

- [ ] All Success Criteria from spec.md met (SC-001 through SC-008)
- [ ] WCAG 2.1 Level AA accessibility compliance
- [ ] Rate limiting active (20 req/min)
- [ ] Error handling covers all edge cases
- [ ] Markdown rendering with syntax highlighting
- [ ] Documentation complete

---

## Notes

- **[P]** = Parallelizable (different files, no shared dependencies)
- **[Story]** = Maps task to user story (US1-US5) for traceability
- **LangChain Architecture**: Backend uses LangChain for RAG, Frontend uses AI SDK for UI
- **Tests**: Not included - feature spec did not explicitly request test-driven development
- **Streaming**: LangChain `.stream()` → Convert to AI SDK SSE format → Frontend `useChat` hook
- **MVP Scope**: US1 + US2 = Core Q&A with citations (~57 tasks, 16-21 hours)
- **Commit Strategy**: Commit after each task or logical task group
- **Validation**: Stop at each checkpoint to test story independently before proceeding

**Total Tasks**: 84 tasks across 8 phases  
**Critical Path**: Phase 2 (Foundational) blocks all user stories  
**MVP Tasks**: 57 tasks (Phases 1-4 + selected polish)  
**Full Feature**: All 84 tasks for complete implementation
