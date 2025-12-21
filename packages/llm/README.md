# @hocbaichua/llm

Centralized LLM and AI service library for the HocBaiChua platform.

## Features

- **Embedding Services**: Generate vector embeddings using OpenAI and other providers
- **Chat Models**: Unified interface for chat/completion models (OpenAI, Google, OpenRouter)
- **Configuration Management**: Centralized model configurations and API key management
- **Provider Abstraction**: Easy switching between different LLM providers
- **Batch Processing**: Built-in support for batch operations with rate limiting

## Installation

This is a workspace package and is automatically available to other packages in the monorepo.

```json
{
  "dependencies": {
    "@hocbaichua/llm": "workspace:*"
  }
}
```

## Usage

### Embeddings

```typescript
import {
  createEmbeddingService,
  embedText,
  embedQuery,
} from "@hocbaichua-v0/llm";

// Quick usage with defaults (OpenAI text-embedding-3-small)
const embedding = await embedText("Hello world");
const queryEmbedding = await embedQuery("search query");

// Advanced usage with custom configuration
const service = createEmbeddingService({
  model: "text-embedding-3-large",
  dimensions: 3072,
});

const embeddings = await service.embedTexts(["text 1", "text 2"]);
const batchEmbeddings = await service.embedTextsInBatches(
  largeTextArray,
  100, // batch size
  100 // delay in ms
);
```

### Chat Models

```typescript
import {
  createChatModel,
  createChatModelService,
  complete,
  LLMProvider,
} from "@hocbaichua-v0/llm";

// Quick completion with defaults (Gemini 2.5 Flash)
const response = await complete("What is the capital of France?");

// Streaming response
for await (const chunk of streamComplete("Tell me a story")) {
  console.log(chunk);
}

// Advanced usage with custom configuration
const service = createChatModelService({
  provider: LLMProvider.OPENAI,
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2000,
});

const response = await service.invoke("Your prompt here");

// Use with LangChain
const chatModel = createChatModel({ provider: LLMProvider.GOOGLE });
// Use chatModel in LangChain chains, agents, etc.
```

### Configuration

```typescript
import {
  EMBEDDING_MODELS,
  CHAT_MODELS,
  DEFAULT_CONFIG,
  LLMProvider,
} from "@hocbaichua/llm/config";

// Access model configurations
console.log(EMBEDDING_MODELS.OPENAI_SMALL);
console.log(CHAT_MODELS.GPT_4O);
console.log(DEFAULT_CONFIG);
```

## Environment Variables

The package requires the following environment variables depending on which providers you use:

- `OPENAI_API_KEY` - For OpenAI models (embeddings and chat)
- `OPENROUTER_API_KEY` - For OpenRouter models
- `GOOGLE_API_KEY` - For Google Gemini models

## Architecture

```
packages/llm/
├── src/
│   ├── index.ts          # Main exports
│   ├── config.ts         # Model configurations and provider settings
│   ├── embeddings.ts     # Embedding services
│   └── chat.ts           # Chat model services
├── package.json
└── tsconfig.json
```

## Benefits

- **Centralized**: All LLM logic in one place
- **Reusable**: Use across API, tasks, and other packages
- **Type-safe**: Full TypeScript support
- **Flexible**: Easy to add new providers and models
- **Maintainable**: Single source of truth for LLM configurations
