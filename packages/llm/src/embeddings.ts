/**
 * Embeddings Service
 * Centralized service for generating vector embeddings using LangChain
 *
 * Features:
 * - Multiple embedding model support (OpenAI, Google, etc.)
 * - Batch processing with rate limiting
 * - Query vs document embedding optimization
 * - Validation and error handling
 */

import type { Embeddings } from "@langchain/core/embeddings";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { DEFAULT_CONFIG, getProviderApiKey, LLMProvider } from "./config";

/**
 * Embedding service configuration
 */
export type EmbeddingConfig = {
  model?: string;
  dimensions?: number;
  provider?: LLMProvider;
  apiKey?: string;
  batchSize?: number;
};

/**
 * Embeddings service class
 */
export class EmbeddingService {
  private readonly embeddings: Embeddings;
  private readonly dimensions: number;
  private readonly batchSize: number;

  constructor(config?: EmbeddingConfig) {
    const embeddingModel = config?.model || DEFAULT_CONFIG.embedding.model;
    const provider = config?.provider || DEFAULT_CONFIG.embedding.provider;
    const apiKey = config?.apiKey || getProviderApiKey(provider);
    this.dimensions = config?.dimensions || DEFAULT_CONFIG.embedding.dimensions;
    this.batchSize = config?.batchSize || DEFAULT_CONFIG.batchSize;

    // Currently only supports OpenAI, can be extended to other providers
    if (provider === LLMProvider.OPENAI) {
      this.embeddings = new OpenAIEmbeddings({
        apiKey,
        model: embeddingModel,
        dimensions: this.dimensions,
      });
    } else if (provider === LLMProvider.GOOGLE) {
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey,
        model: embeddingModel,
      });
    } else {
      throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  }

  /**
   * Generates embedding for a single text
   */
  async embedText(text: string): Promise<number[]> {
    return await this.embeddings.embedQuery(text);
  }

  /**
   * Generates embedding for a search query
   * Optimized for retrieval tasks
   */
  async embedQuery(query: string): Promise<number[]> {
    return await this.embeddings.embedQuery(query);
  }

  /**
   * Generates embeddings for multiple texts
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    return await this.embeddings.embedDocuments(texts);
  }

  /**
   * Generates embeddings in batches with rate limiting
   * Useful for processing large datasets without hitting API limits
   */
  async embedTextsInBatches(
    texts: string[],
    batchSize?: number,
    delayMs = 100
  ): Promise<number[][]> {
    const effectiveBatchSize = batchSize || this.batchSize;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += effectiveBatchSize) {
      const batch = texts.slice(i, i + effectiveBatchSize);
      const batchEmbeddings = await this.embeddings.embedDocuments(batch);
      results.push(...batchEmbeddings);

      // Add delay between batches to avoid rate limiting
      if (i + effectiveBatchSize < texts.length && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Validates that an embedding has the expected dimensions
   */
  isValidEmbedding(embedding: number[]): boolean {
    return (
      Array.isArray(embedding) &&
      embedding.length === this.dimensions &&
      embedding.every((n) => typeof n === "number" && !Number.isNaN(n))
    );
  }

  /**
   * Gets the expected embedding dimensions
   */
  getDimensions(): number {
    return this.dimensions;
  }
}

/**
 * Factory function to create embeddings service
 */
export function createEmbeddingService(
  config?: EmbeddingConfig
): EmbeddingService {
  return new EmbeddingService(config);
}

export const embeddings = createEmbeddingService();
