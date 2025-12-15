<!--
SYNC IMPACT REPORT - Constitution Update to v1.0.1
====================================================
Version Change: v1.0.0 → v1.0.1 (PATCH - routine verification)
Ratification: 2025-11-16 (initial adoption)
Last Amended: 2025-12-14 (verification and consistency check)

CHANGE TYPE: PATCH
- Routine verification of constitution completeness
- Confirmation of template alignment
- No principle changes, additions, or removals
- No semantic modifications to governance or standards

DEFINED PRINCIPLES (unchanged):
- I. User-Centric AI Quality (accuracy, reliability, appropriate AI model usage)
- II. Educational Integrity (academic honesty, transparent AI limitations)
- III. Type Safety & Accessibility (TypeScript-first, WCAG compliance)
- IV. Testing & Validation (test-first for critical paths, AI output validation)
- V. Privacy & Data Protection (student data minimization, compliance)

DEFINED SECTIONS (unchanged):
- Technical Standards (monorepo structure, React 19, tRPC type safety)
- Development Workflow (feature branches, code review, quality gates)
- Governance (amendment process, compliance verification)

TEMPLATES CONSISTENCY VERIFICATION:
✅ plan-template.md - Constitution Check gate aligns with all 5 principles
✅ spec-template.md - User scenarios prioritization supports educational integrity (Principle II)
✅ tasks-template.md - Test-first workflow enforces Principle IV requirements
✅ checklist-template.md - Generic template, no constitution-specific dependencies
✅ agent-file-template.md - Generic template, no constitution-specific dependencies

PROJECT CONTEXT ALIGNMENT:
✅ TypeScript usage across monorepo matches Principle III (Type Safety)
✅ AI SDK integration (@ai-sdk/google) aligns with Principle I (AI Quality)
✅ Biome/Ultracite enforcement supports code quality standards
✅ tRPC ensures end-to-end type safety per Technical Standards
✅ Better-Auth + Drizzle match declared stack in Technical Standards

FOLLOW-UP ACTIONS: None - all placeholders resolved, all templates verified
-->

# HocBaiChua Constitution

## Core Principles

### I. User-Centric AI Quality

Every AI-generated feature (quiz, flashcard, summary) MUST prioritize accuracy and educational value over speed or convenience. AI outputs MUST be validated for correctness and pedagogical appropriateness before presentation to students. Model selection MUST be justified based on task requirements (e.g., factual accuracy for summarization, creativity for diverse quiz questions).

**Rationale**: Students rely on this tool for learning. Inaccurate or misleading AI-generated content directly undermines educational outcomes and trust.

### II. Educational Integrity

The application MUST clearly distinguish between AI-generated content and student work. AI assistance MUST be designed to enhance learning, not enable academic dishonesty. Features MUST include transparency about AI limitations and encourage critical thinking over blind acceptance of generated content.

**Rationale**: Educational tools bear responsibility for fostering genuine learning and maintaining academic standards. Students must understand when they are using AI assistance.

### III. Type Safety & Accessibility

All code MUST be TypeScript-first with explicit types for API boundaries, database schemas, and AI model inputs/outputs. User interfaces MUST meet WCAG 2.1 Level AA accessibility standards. Components MUST be keyboard-navigable and screen-reader compatible.

**Rationale**: Type safety prevents runtime errors that could corrupt student data or learning progress. Accessibility ensures all students can benefit from the tool regardless of abilities.

### IV. Testing & Validation (Critical Paths)

Test-first development is MANDATORY for: (1) AI output validation logic, (2) user data persistence and retrieval, (3) quiz/flashcard generation algorithms, and (4) authentication flows. Tests MUST be written, approved by stakeholders, verified to fail, then implemented. Integration tests REQUIRED for AI model API contracts and database schema changes.

**Rationale**: These critical paths directly impact learning outcomes and data integrity. Bugs in these areas cause immediate harm to users.

### V. Privacy & Data Protection

Student data collection MUST be minimized to only what is necessary for core functionality. User-uploaded documents and study materials MUST be processed securely with explicit user consent. AI model providers MUST NOT retain student data beyond request processing. Compliance with educational data privacy standards (FERPA/COPPA where applicable) is MANDATORY.

**Rationale**: Students entrust the application with sensitive academic materials and personal learning data. Privacy violations erode trust and may violate legal requirements.

## Technical Standards

**Monorepo Structure**: Turborepo-managed workspace with clear separation:

- `apps/web` - React 19 + TanStack Start for web UI
- `apps/native` - React Native + Expo for mobile
- `apps/server` - Hono API server
- `packages/api` - tRPC routers and business logic
- `packages/auth` - Better-Auth authentication
- `packages/db` - Drizzle ORM schemas (PostgreSQL)
- `packages/tasks` - Trigger.dev background tasks

**AI Integration Standards**:

- All AI model calls MUST use langchain sdk
- Model responses MUST be validated against Zod schemas before use
- Error handling MUST gracefully degrade when AI services are unavailable
- Rate limiting and cost monitoring REQUIRED for production AI endpoints

**Code Quality Enforcement**:

- Biome (via Ultracite preset) for linting and formatting
- Husky pre-commit hooks for automated checks
- TypeScript strict mode enabled across all packages
- tRPC for end-to-end type safety between client and server

## Development Workflow

**Feature Development Process**:

1. Feature specification in `/specs/[###-feature-name]/spec.md` with user stories prioritized by educational impact
2. Implementation plan in `/specs/[###-feature-name]/plan.md` with Constitution Check gate
3. Test-first implementation for critical paths (Principle IV)
4. Code review verifying accessibility (Principle III) and AI quality checks (Principle I)
5. User acceptance testing with educational stakeholders

**Quality Gates** (MUST pass before merge):

- Constitution Check for principles compliance (automated checklist)
- Type checking (`bun run check-types`)
- Linting/formatting (`npx ultracite check`)
- Critical path tests passing (AI validation, auth, data persistence)
- Accessibility audit for UI changes (automated + manual review)

**Branch Strategy**:

- Feature branches: `###-feature-name` format
- All work tracked via spec documents before code changes
- Squash merges to main after approval

## Governance

**Amendment Process**:

1. Proposed changes documented with rationale and impact analysis
2. Review by project maintainers and educational stakeholders
3. Version bump per semantic versioning:
   - **MAJOR**: Principle removal/redefinition or breaking governance changes
   - **MINOR**: New principle added or section materially expanded
   - **PATCH**: Clarifications, wording fixes, non-semantic updates
4. Update all dependent templates and documentation before ratification
5. Migration plan required for changes affecting existing features

**Compliance Verification**:

- Constitution Check section MANDATORY in all plan.md files
- Code reviews MUST verify principle adherence (documented in PR comments)
- Quarterly constitution review to assess relevance and effectiveness
- User feedback channels for reporting educational integrity or privacy concerns

**Authority**: This constitution supersedes all other development practices when conflicts arise. Complexity or principle deviations MUST be explicitly justified in documentation and approved by maintainers.

**Version**: 1.0.1 | **Ratified**: 2025-11-16 | **Last Amended**: 2025-12-14
