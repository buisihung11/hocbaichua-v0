/**
 * Chat Model Service
 * Centralized service for chat/completion models using LangChain
 *
 * Features:
 * - Multiple provider support (OpenAI, OpenRouter, Google)
 * - Unified interface for different LLM providers
 * - Configurable parameters (temperature, max tokens, etc.)
 * - Streaming support
 */

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import {
  DEFAULT_CONFIG,
  getProviderApiKey,
  getProviderBaseURL,
  LLMProvider,
  type ModelConfig,
} from "./config";

/**
 * Chat model service configuration
 */
export interface ChatModelConfig extends ModelConfig {
  provider?: LLMProvider;
  streaming?: boolean;
}

/**
 * Chat model service class
 */
export class ChatModelService {
  private readonly chatModel: BaseChatModel;
  private readonly config: Required<
    Omit<ChatModelConfig, "apiKey" | "baseURL">
  > & {
    apiKey?: string;
    baseURL?: string;
  };

  constructor(config?: ChatModelConfig) {
    const provider = config?.provider || DEFAULT_CONFIG.chat.provider;
    const model = config?.model || DEFAULT_CONFIG.chat.model;
    const apiKey = config?.apiKey || getProviderApiKey(provider);
    const baseURL = config?.baseURL || getProviderBaseURL(provider);

    this.config = {
      provider,
      model,
      temperature: config?.temperature ?? DEFAULT_CONFIG.temperature,
      maxTokens: config?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
      topP: config?.topP ?? 1,
      streaming: config?.streaming ?? false,
      apiKey,
      baseURL,
    };

    this.chatModel = this.createChatModel();
  }

  /**
   * Creates the appropriate chat model based on provider
   */
  private createChatModel(): BaseChatModel {
    const {
      provider,
      model,
      temperature,
      maxTokens,
      topP,
      streaming,
      apiKey,
      baseURL,
    } = this.config;

    switch (provider) {
      case LLMProvider.OPENAI:
        return new ChatOpenAI({
          apiKey,
          model,
          temperature,
          maxTokens,
          topP,
          streaming,
        });

      case LLMProvider.OPENROUTER:
        return new ChatOpenAI({
          model,
          temperature,
          maxTokens,
          topP,
          streaming,
          configuration: {
            apiKey,
            baseURL,
          },
        });

      case LLMProvider.GOOGLE:
        return new ChatGoogleGenerativeAI({
          apiKey,
          model,
          temperature,
          maxOutputTokens: maxTokens,
          topP,
          streaming,
        });

      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }

  /**
   * Gets the underlying LangChain chat model instance
   */
  getModel(): BaseChatModel {
    return this.chatModel;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Invokes the model with a prompt
   */
  async invoke(prompt: string): Promise<string> {
    const response = await this.chatModel.invoke(prompt);
    return response.content.toString();
  }

  /**
   * Streams the model response
   */
  async *stream(prompt: string): AsyncGenerator<string> {
    const stream = await this.chatModel.stream(prompt);
    for await (const chunk of stream) {
      yield chunk.content.toString();
    }
  }

  /**
   * Batch invoke multiple prompts
   */
  async batchInvoke(prompts: string[]): Promise<string[]> {
    const responses = await this.chatModel.batch(prompts);
    return responses.map((r) => r.content.toString());
  }
}

/**
 * Factory function to create chat model service
 */
export function createChatModelService(
  config?: ChatModelConfig
): ChatModelService {
  return new ChatModelService(config);
}

export const chatModel = createChatModelService();
