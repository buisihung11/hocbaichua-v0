/**
 * Model Configuration
 * Centralized configuration for all LLM models and providers
 */

/**
 * Supported LLM providers
 */
export enum LLMProvider {
  OPENAI = "openai",
  OPENROUTER = "openrouter",
  GOOGLE = "google",
}

/**
 * Model configuration interface
 */
export type ModelConfig = {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  apiKey?: string;
  baseURL?: string;
};

/**
 * Embedding model configurations
 */
export const EMBEDDING_MODELS = {
  OPENAI_SMALL: {
    provider: LLMProvider.OPENAI,
    model: "text-embedding-3-small",
    dimensions: 1536,
    cost: 0.02, // per 1M tokens
  },
  OPENAI_LARGE: {
    provider: LLMProvider.OPENAI,
    model: "text-embedding-3-large",
    dimensions: 3072,
    cost: 0.13, // per 1M tokens
  },
} as const;

/**
 * Chat model configurations
 */
export const CHAT_MODELS = {
  GPT_4O: {
    provider: LLMProvider.OPENAI,
    model: "gpt-4o",
    contextWindow: 128_000,
  },
  GPT_4O_MINI: {
    provider: LLMProvider.OPENAI,
    model: "gpt-4o-mini",
    contextWindow: 128_000,
  },
  GEMINI_2_FLASH: {
    provider: LLMProvider.OPENROUTER,
    model: "google/gemini-2.5-flash",
    contextWindow: 1_000_000,
  },
  GEMINI_2_PRO: {
    provider: LLMProvider.GOOGLE,
    model: "gemini-2.0-pro",
    contextWindow: 2_000_000,
  },
} as const;

/**
 * Default configurations
 */
export const DEFAULT_CONFIG = {
  embedding: EMBEDDING_MODELS.OPENAI_SMALL,
  chat: CHAT_MODELS.GEMINI_2_FLASH,
  batchSize: 100,
  temperature: 0.7,
  maxTokens: 4096,
} as const;

/**
 * Gets API key for a provider from environment variables
 */
export function getProviderApiKey(provider: LLMProvider): string {
  const key = (() => {
    switch (provider) {
      case LLMProvider.OPENAI:
        return process.env.OPENAI_API_KEY;
      case LLMProvider.OPENROUTER:
        return process.env.OPENROUTER_API_KEY;
      case LLMProvider.GOOGLE:
        return process.env.GOOGLE_API_KEY;
      default:
        return;
    }
  })();

  if (!key) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  return key;
}

/**
 * Gets base URL for a provider
 */
export function getProviderBaseURL(provider: LLMProvider): string | undefined {
  switch (provider) {
    case LLMProvider.OPENROUTER:
      return "https://openrouter.ai/api/v1";
    default:
      return;
  }
}
