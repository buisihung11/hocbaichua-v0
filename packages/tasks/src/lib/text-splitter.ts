/**
 * Text Splitter Utility
 * T010: LangChain text splitter configuration for document chunking
 *
 * Uses RecursiveCharacterTextSplitter for semantic-aware text splitting
 * with configurable chunk size and overlap.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Default configuration for text splitting
 */
export const DEFAULT_CHUNK_CONFIG = {
  chunkSize: 1000, // Characters per chunk
  chunkOverlap: 200, // Overlap between chunks for context preservation
} as const;

/**
 * Hierarchical separators for recursive splitting
 * Prioritizes splitting at paragraph > sentence > word boundaries
 */
const SEPARATORS = [
  "\n\n", // Paragraph breaks (highest priority)
  "\n", // Line breaks
  ". ", // Sentence endings
  "! ", // Exclamation endings
  "? ", // Question endings
  "; ", // Semicolons
  ", ", // Commas
  " ", // Spaces
  "", // Character level (last resort)
];

export type ChunkConfig = {
  chunkSize?: number;
  chunkOverlap?: number;
};

export type TextChunk = {
  content: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
};

/**
 * Creates a text splitter with the specified configuration
 */
export function createTextSplitter(
  config: ChunkConfig = {}
): RecursiveCharacterTextSplitter {
  const { chunkSize, chunkOverlap } = {
    ...DEFAULT_CHUNK_CONFIG,
    ...config,
  };

  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: SEPARATORS,
  });
}

/**
 * Splits text into chunks with metadata including offsets
 *
 * @param text - The full text to split
 * @param config - Optional chunk configuration
 * @returns Array of text chunks with metadata
 */
export async function splitText(
  text: string,
  config: ChunkConfig = {}
): Promise<TextChunk[]> {
  const splitter = createTextSplitter(config);

  // Create documents from text to leverage LangChain's splitting
  const documents = await splitter.createDocuments([text]);

  // Calculate offsets for each chunk
  const chunks: TextChunk[] = [];
  let searchStart = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!doc) continue;

    const content = doc.pageContent;

    // Find the start offset in the original text
    const startOffset = text.indexOf(content, searchStart);
    const endOffset = startOffset + content.length;

    chunks.push({
      content,
      chunkIndex: i,
      startOffset: startOffset >= 0 ? startOffset : searchStart,
      endOffset: startOffset >= 0 ? endOffset : searchStart + content.length,
      metadata: doc.metadata,
    });

    // Move search start forward (accounting for overlap)
    if (startOffset >= 0) {
      searchStart = startOffset + 1;
    }
  }

  return chunks;
}

/**
 * Estimates token count for a text chunk
 * Uses a simple heuristic: ~4 characters per token for English text
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // Simple heuristic: average 4 characters per token for English
  // This is a rough estimate; for precise counts, use a tokenizer
  return Math.ceil(text.length / 4);
}
