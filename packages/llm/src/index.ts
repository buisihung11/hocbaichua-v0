/**
 * @hocbaichua/llm
 * Centralized LLM and AI service library for HocBaiChua platform
 *
 * This package provides:
 * - Embedding services (OpenAI, etc.)
 * - Chat model services (OpenAI, Google, OpenRouter)
 * - Unified configuration and provider management
 * - Reusable utilities for AI/ML operations
 */

// Chat model services
export {
  type ChatModelConfig,
  ChatModelService,
  chatModel,
  createChatModelService,
} from "./chat";
// Core configuration
export {
  CHAT_MODELS,
  DEFAULT_CONFIG,
  EMBEDDING_MODELS,
  getProviderApiKey,
  getProviderBaseURL,
  LLMProvider,
  type ModelConfig,
} from "./config";
// Embedding services
export {
  createEmbeddingService,
  type EmbeddingConfig,
  EmbeddingService,
  embeddings,
} from "./embeddings";
