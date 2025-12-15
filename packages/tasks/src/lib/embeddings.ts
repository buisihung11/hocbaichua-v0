/**
 * Embeddings Utility
 * T011: LangChain embeddings abstraction for vector generation
 *
 * Uses OpenAI embeddings with text-embedding-3-small model.
 * Embedding dimension: 1536 (text-embedding-3-small)
 */

import type { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * Embedding model configuration
 * Using text-embedding-3-small - most cost-effective OpenAI embedding model
 * Cost: $0.02 per 1M tokens (62% cheaper than text-embedding-ada-002)
 */
export const EMBEDDING_CONFIG = {
  model: "text-embedding-3-small",
  dimensions: 1536,
  batchSize: 100, // Max documents per batch for rate limiting
} as const;

/**
 * Creates the default embeddings instance using OpenAI
 *
 * Requires OPENAI_API_KEY environment variable
 */
export function createEmbeddings(): Embeddings {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return new OpenAIEmbeddings({
    apiKey,
    model: EMBEDDING_CONFIG.model,
    dimensions: EMBEDDING_CONFIG.dimensions,
  });
}

/**
 * Creates embeddings instance for query (retrieval) tasks
 * OpenAI embeddings don't distinguish between document and query task types
 */
export function createQueryEmbeddings(): Embeddings {
  return createEmbeddings();
}

/**
 * Generates embedding for a single text
 *
 * @param text - Text to embed
 * @returns Vector embedding as number array
 */
export async function embedText(text: string): Promise<number[]> {
  const embeddings = createEmbeddings();
  return await embeddings.embedQuery(text);
}

/**
 * Generates embedding for a search query
 * Uses query-optimized task type for better retrieval
 *
 * @param query - Search query to embed
 * @returns Vector embedding as number array
 */
export async function embedQuery(query: string): Promise<number[]> {
  const embeddings = createQueryEmbeddings();
  return await embeddings.embedQuery(query);
}

/**
 * Generates embeddings for multiple texts in batch
 *
 * @param texts - Array of texts to embed
 * @returns Array of vector embeddings
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings = createEmbeddings();
  return await embeddings.embedDocuments(texts);
}

/**
 * Generates embeddings for texts in batches to handle rate limiting
 *
 * @param texts - Array of texts to embed
 * @param batchSize - Number of texts per batch (default: 100)
 * @param delayMs - Delay between batches in milliseconds (default: 100)
 * @returns Array of vector embeddings
 */
export async function embedTextsInBatches(
  texts: string[],
  batchSize = EMBEDDING_CONFIG.batchSize,
  delayMs = 100
): Promise<number[][]> {
  const embeddings = createEmbeddings();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await embeddings.embedDocuments(batch);
    results.push(...batchEmbeddings);

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < texts.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Validates that an embedding has the expected dimensions
 *
 * @param embedding - Vector embedding to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_CONFIG.dimensions &&
    embedding.every((n) => typeof n === "number" && !Number.isNaN(n))
  );
}
