import { db, document, documentChunk } from "@hocbaichua-v0/db";
import { embeddings } from "@hocbaichua-v0/llm";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";

/**
 * Result from vector similarity search
 */
export type VectorSearchResult = {
  chunkId: number;
  documentId: number;
  documentTitle: string;
  content: string;
  similarity: number;
  chunkIndex: number;
  metadata: Record<string, unknown> | null;
};

/**
 * Perform vector similarity search on document chunks
 * @param query - Question text to search for
 * @param spaceId - Space ID to limit search scope
 * @param topK - Number of top results to return (default: 5)
 * @param threshold - Minimum similarity score (default: 0.7)
 * @returns Promise<VectorSearchResult[]> - Array of relevant chunks with metadata
 */
export async function vectorSearch(
  query: string,
  spaceId: string,
  topK = 5,
  threshold = 0.7
): Promise<VectorSearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await embeddings.embedQuery(query);

    // Convert array to pgvector string format
    const embeddingVector = `[${queryEmbedding.join(",")}]`;

    // Perform cosine similarity search with pgvector
    const results = await db
      .select({
        chunkId: documentChunk.id,
        documentId: documentChunk.documentId,
        documentTitle: document.title,
        content: documentChunk.content,
        chunkIndex: documentChunk.chunkIndex,
        metadata: sql<Record<
          string,
          unknown
        > | null>`${documentChunk.metadata}`,
        // Calculate similarity score (1 - cosineDistance for 0-1 range where 1 is most similar)
        similarity: sql<number>`1 - (${cosineDistance(
          documentChunk.embedding,
          embeddingVector
        )})`,
      })
      .from(documentChunk)
      .innerJoin(document, eq(documentChunk.documentId, document.id))
      .where(
        sql`${document.spaceId} = ${spaceId}
        AND ${document.processingStatus} = 'READY'
        AND ${documentChunk.embedding} IS NOT NULL
        AND (1 - (${cosineDistance(
          documentChunk.embedding,
          embeddingVector
        )})) >= ${threshold}`
      )
      .orderBy(
        desc(
          sql`1 - (${cosineDistance(documentChunk.embedding, embeddingVector)})`
        )
      )
      .limit(topK);

    return results;
  } catch (error) {
    // Log error for debugging while providing graceful failure
    console.error("Vector search failed:", error);

    // Return empty results instead of throwing - allows chat to continue with limited context
    // The calling code will handle the empty results appropriately
    return [];
  }
}
