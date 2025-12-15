/**
 * Similarity Search Utility
 * T034: Vector similarity search using pgvector
 *
 * Provides functions for semantic search over document chunks
 * using cosine distance with HNSW index for efficient retrieval.
 */

import { db } from "@hocbaichua-v0/db";
import { sql } from "drizzle-orm";
import { embedQuery } from "./embeddings";

/**
 * Result from similarity search
 */
export type SimilaritySearchResult = {
  chunkId: number;
  documentId: number;
  content: string;
  chunkIndex: number;
  similarity: number;
  documentTitle: string | null;
  spaceId: string;
};

/**
 * Search options for similarity search
 */
export type SimilaritySearchOptions = {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.5) */
  threshold?: number;
  /** Filter by specific space ID */
  spaceId?: string;
  /** Filter by specific document IDs */
  documentIds?: number[];
  /** Only include documents with READY status */
  onlyReady?: boolean;
};

const DEFAULT_LIMIT = 10;
const DEFAULT_THRESHOLD = 0.5;

/**
 * Performs semantic similarity search over document chunks
 *
 * Uses cosine distance with pgvector's HNSW index for fast retrieval.
 * Converts similarity to 0-1 scale (1 = most similar).
 *
 * @param query - Search query text
 * @param options - Search configuration options
 * @returns Array of matching chunks with similarity scores
 *
 * @example
 * ```ts
 * const results = await similaritySearch("machine learning concepts", {
 *   limit: 5,
 *   threshold: 0.7,
 *   spaceId: "space-123"
 * });
 * ```
 */
export async function similaritySearch(
  query: string,
  options: SimilaritySearchOptions = {}
): Promise<SimilaritySearchResult[]> {
  const {
    limit = DEFAULT_LIMIT,
    threshold = DEFAULT_THRESHOLD,
    spaceId,
    documentIds,
    onlyReady = true,
  } = options;

  // Generate embedding for the query
  const queryEmbedding = await embedQuery(query);

  // Build the vector string for pgvector
  const vectorString = `[${queryEmbedding.join(",")}]`;

  // Build filter conditions
  const conditions: string[] = [];

  if (onlyReady) {
    conditions.push(`d.processing_status = 'READY'`);
  }

  if (spaceId) {
    conditions.push(`d.space_id = '${spaceId}'`);
  }

  if (documentIds && documentIds.length > 0) {
    conditions.push(`dc.document_id IN (${documentIds.join(",")})`);
  }

  // Only include chunks with embeddings
  conditions.push("dc.embedding IS NOT NULL");

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Execute similarity search with raw SQL
  // Cosine distance: 1 - (a <=> b) gives similarity (0 = different, 1 = identical)
  const results = await db.execute<{
    chunk_id: number;
    document_id: number;
    content: string;
    chunk_index: number;
    similarity: number;
    document_title: string | null;
    space_id: string;
  }>(sql`
    SELECT 
      dc.id as chunk_id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      1 - (dc.embedding <=> ${vectorString}::vector) as similarity,
      d.title as document_title,
      d.space_id
    FROM document_chunk dc
    INNER JOIN document d ON d.id = dc.document_id
    ${sql.raw(whereClause)}
    ORDER BY dc.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `);

  // Filter by threshold and map to result type
  // RowList is array-like, convert to array for filtering
  const rows = [...results];
  return rows
    .filter((row) => row.similarity >= threshold)
    .map((row) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      content: row.content,
      chunkIndex: row.chunk_index,
      similarity: row.similarity,
      documentTitle: row.document_title,
      spaceId: row.space_id,
    }));
}

/**
 * Finds similar chunks within a specific document
 *
 * Useful for finding related sections within a single document.
 *
 * @param documentId - Document to search within
 * @param query - Search query text
 * @param limit - Maximum results (default: 5)
 * @returns Array of matching chunks
 */
export function findSimilarInDocument(
  documentId: number,
  query: string,
  limit = 5
): Promise<SimilaritySearchResult[]> {
  return similaritySearch(query, {
    limit,
    threshold: 0.3, // Lower threshold for within-document search
    documentIds: [documentId],
    onlyReady: false, // Allow searching during processing
  });
}

/**
 * Finds similar chunks across all documents in a space
 *
 * @param spaceId - Space to search within
 * @param query - Search query text
 * @param limit - Maximum results (default: 10)
 * @returns Array of matching chunks
 */
export function findSimilarInSpace(
  spaceId: string,
  query: string,
  limit = 10
): Promise<SimilaritySearchResult[]> {
  return similaritySearch(query, {
    limit,
    threshold: 0.5,
    spaceId,
    onlyReady: true,
  });
}

/**
 * Gets chunks most similar to a given chunk
 *
 * Useful for finding related content or detecting duplicates.
 *
 * @param chunkId - Source chunk to find similar chunks for
 * @param limit - Maximum results (default: 5)
 * @returns Array of similar chunks (excluding the source chunk)
 */
export async function findSimilarChunks(
  chunkId: number,
  limit = 5
): Promise<SimilaritySearchResult[]> {
  // Get the source chunk
  const sourceChunk = await db.query.documentChunk.findFirst({
    where: (chunk, { eq }) => eq(chunk.id, chunkId),
    with: {
      document: true,
    },
  });

  if (!sourceChunk?.embedding) {
    return [];
  }

  // Build the vector string from the source chunk's embedding
  const vectorString = `[${sourceChunk.embedding.join(",")}]`;

  const results = await db.execute<{
    chunk_id: number;
    document_id: number;
    content: string;
    chunk_index: number;
    similarity: number;
    document_title: string | null;
    space_id: string;
  }>(sql`
    SELECT 
      dc.id as chunk_id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      1 - (dc.embedding <=> ${vectorString}::vector) as similarity,
      d.title as document_title,
      d.space_id
    FROM document_chunk dc
    INNER JOIN document d ON d.id = dc.document_id
    WHERE dc.embedding IS NOT NULL
      AND dc.id != ${chunkId}
      AND d.processing_status = 'READY'
    ORDER BY dc.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `);

  // RowList is array-like, convert to array
  return [...results].map((row) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
    documentTitle: row.document_title,
    spaceId: row.space_id,
  }));
}
