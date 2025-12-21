# LLM Package Migration Summary

## Overview

Created a new centralized `@hocbaichua/llm` package to manage all LLM and AI service interactions across the platform.

## What Was Created

### New Package Structure

```
packages/llm/
├── src/
│   ├── index.ts          # Main exports
│   ├── config.ts         # Model configurations and provider settings
│   ├── embeddings.ts     # Embedding services
│   └── chat.ts           # Chat model services
├── package.json
├── tsconfig.json
└── README.md
```

### Key Features

#### 1. Configuration Management (`config.ts`)

- Centralized model configurations for embeddings and chat models
- Support for multiple providers: OpenAI, OpenRouter, Google
- Environment-based API key management
- Model presets with metadata (context windows, costs, etc.)

#### 2. Embedding Service (`embeddings.ts`)

- `EmbeddingService` class for managing embeddings
- Support for single and batch embedding generation
- Rate limiting with configurable batch sizes
- Validation utilities
- Helper functions for quick operations

#### 3. Chat Model Service (`chat.ts`)

- `ChatModelService` class for chat completions
- Unified interface for multiple LLM providers
- Support for streaming and batch operations
- Configurable parameters (temperature, max tokens, etc.)

## Migration Changes

### Package Updates

#### `packages/llm/package.json`

- New package with dependencies on LangChain libraries
- Exports for main module and submodules

#### `packages/api/package.json`

- Added `@hocbaichua/llm` dependency
- Removed `@langchain/google-genai` (now in llm package)
- Kept `@langchain/core` for type definitions

#### `packages/tasks/package.json`

- Added `@hocbaichua/llm` dependency
- Removed direct `@langchain/openai` and `@langchain/core` dependencies
- Kept `@langchain/community` for document loaders
- Added `@langchain/textsplitters` for text splitting

### Code Updates

#### `packages/api/src/lib/langchain-config.ts`

- Updated to use `createChatModel` from `@hocbaichua/llm`
- Simplified configuration using new service

#### `packages/api/src/lib/vector-search.ts`

- Changed from local `generateEmbedding` to `embedQuery` from `@hocbaichua/llm`

#### `packages/tasks/src/lib/embeddings.ts`

- Deprecated and converted to re-export from `@hocbaichua/llm`
- Maintains backward compatibility
- Added migration guide in comments

#### `packages/tasks/src/trigger/embed-chunks.ts`

- Updated imports to use `@hocbaichua/llm`
- Uses `EmbeddingService` for validation

#### `packages/tasks/src/lib/similarity-search.ts`

- Updated to import `embedQuery` from `@hocbaichua/llm`

## Usage Examples

### Embeddings

```typescript
import {
  createEmbeddingService,
  embedText,
  embedQuery,
} from "@hocbaichua-v0/llm";

// Quick usage with defaults
const embedding = await embedText("Hello world");

// Advanced usage
const service = createEmbeddingService({
  model: "text-embedding-3-large",
  dimensions: 3072,
});
const embeddings = await service.embedTexts(["text 1", "text 2"]);
```

### Chat Models

```typescript
import { createChatModel, complete, LLMProvider } from "@hocbaichua-v0/llm";

// Quick completion
const response = await complete("What is the capital of France?");

// Advanced usage
const service = createChatModelService({
  provider: LLMProvider.OPENAI,
  model: "gpt-4o",
  temperature: 0.7,
});
const response = await service.invoke("Your prompt");
```

## Benefits

1. **Centralized Logic**: All LLM interactions in one place
2. **Reusability**: Easily use across api, tasks, and future packages
3. **Type Safety**: Full TypeScript support with proper exports
4. **Flexibility**: Easy to switch providers and models
5. **Maintainability**: Single source of truth for configurations
6. **Extensibility**: Simple to add new providers and features

## Environment Variables Required

- `OPENAI_API_KEY` - For OpenAI models
- `OPENROUTER_API_KEY` - For OpenRouter models (Gemini via OpenRouter)
- `GOOGLE_API_KEY` - For direct Google Gemini models

## Next Steps

1. Consider adding more providers (Anthropic, Cohere, etc.)
2. Add retry logic and error handling utilities
3. Add cost tracking and usage monitoring
4. Consider adding prompt templates library
5. Add testing utilities for LLM operations
6. Eventually remove deprecated `packages/tasks/src/lib/embeddings.ts`

## Verification

All packages typecheck successfully:

- ✅ `packages/llm` - New package types check
- ✅ `packages/api` - Updated to use new llm package
- ✅ `packages/tasks` - Updated to use new llm package
