/**
 * Embed Chunks Task
 * T027-T032: Generates vector embeddings for document chunks
 *
 * This task:
 * 1. Updates document status to EMBEDDING
 * 2. Retrieves chunks without embeddings
 * 3. Generates embeddings using Google AI
 * 4. Updates chunk records with embedding vectors
 * 5. Sets document status to READY
 */

import { db, document, documentChunk } from "@hocbaichua-v0/db";
import { AbortTaskRunError, task } from "@trigger.dev/sdk";
import { and, eq, isNull } from "drizzle-orm";
import {
  EMBEDDING_CONFIG,
  embedTextsInBatches,
  isValidEmbedding,
} from "../lib/embeddings";

// Type for chunk from database
type DocumentChunkRecord = {
  id: number;
  content: string;
  chunkIndex: number;
};

/**
 * Handle the case when no chunks need embedding
 */
async function handleNoChunksToEmbed(documentId: number): Promise<{
  success: boolean;
  documentId: number;
  embeddedCount: number;
  totalChunks: number;
  skipped: boolean;
  embeddedAt: string;
}> {
  // Check if document has any chunks at all
  const allChunks = await db.query.documentChunk.findMany({
    where: eq(documentChunk.documentId, documentId),
  });

  if (allChunks.length === 0) {
    throw new AbortTaskRunError(
      `Document ${documentId} has no chunks. Run chunking first.`
    );
  }

  // All chunks already have embeddings
  console.log("[Embed] All chunks already have embeddings");
  await updateDocumentStatus(documentId, "READY");

  return {
    success: true,
    documentId,
    embeddedCount: 0,
    totalChunks: allChunks.length,
    skipped: true,
    embeddedAt: new Date().toISOString(),
  };
}

/**
 * Update chunk records with embeddings
 */
async function updateChunksWithEmbeddings(
  chunks: DocumentChunkRecord[],
  embeddings: number[][]
): Promise<number> {
  let updatedCount = 0;

  for (const [index, chunk] of chunks.entries()) {
    const embedding = embeddings[index];

    if (embedding === undefined) {
      console.warn(`[Embed] Missing embedding at index ${index}`);
      continue;
    }

    if (!isValidEmbedding(embedding)) {
      console.warn(`[Embed] Invalid embedding for chunk ${chunk.id}`);
      continue;
    }

    await db
      .update(documentChunk)
      .set({ embedding })
      .where(eq(documentChunk.id, chunk.id));

    updatedCount += 1;
  }

  return updatedCount;
}

/**
 * Process chunks and generate embeddings
 */
async function processChunks(
  documentId: number,
  chunks: DocumentChunkRecord[]
): Promise<{
  success: boolean;
  documentId: number;
  embeddedCount: number;
  totalChunks: number;
  embeddingDimensions: number;
  embeddedAt: string;
}> {
  console.log(`[Embed] Processing ${chunks.length} chunks`);

  // Extract text content for embedding
  const texts = chunks.map((chunk) => chunk.content);

  // T028: Generate embeddings in batches
  console.log(
    `[Embed] Generating embeddings (batch size: ${EMBEDDING_CONFIG.batchSize})...`
  );
  const embeddings = await embedTextsInBatches(
    texts,
    EMBEDDING_CONFIG.batchSize,
    200
  );
  console.log(`[Embed] Generated ${embeddings.length} embeddings`);

  // T029: Update chunks with embeddings
  const updatedCount = await updateChunksWithEmbeddings(chunks, embeddings);
  console.log(`[Embed] ✅ Updated ${updatedCount} chunks with embeddings`);

  // T030: Update document status to READY
  await updateDocumentStatus(documentId, "READY");

  return {
    success: true,
    documentId,
    embeddedCount: updatedCount,
    totalChunks: chunks.length,
    embeddingDimensions: EMBEDDING_CONFIG.dimensions,
    embeddedAt: new Date().toISOString(),
  };
}

export const embedChunks = task({
  id: "embed-chunks",
  // T032: Retry with exponential backoff for rate limiting
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 120_000, // 2 minutes for large batches
    randomize: true,
  },
  run: async (payload: { documentId: number; chunkCount?: number }) => {
    const { documentId, chunkCount } = payload;

    console.log(
      `[Embed] Starting embedding for document ${documentId}${chunkCount ? ` (${chunkCount} chunks)` : ""}`
    );

    // T030: Update status to EMBEDDING
    await updateDocumentStatus(documentId, "EMBEDDING");

    try {
      // Retrieve chunks that need embeddings
      const chunks = await db.query.documentChunk.findMany({
        where: and(
          eq(documentChunk.documentId, documentId),
          isNull(documentChunk.embedding)
        ),
        orderBy: (chunk, { asc }) => [asc(chunk.chunkIndex)],
      });

      if (chunks.length === 0) {
        console.log("[Embed] No chunks found to embed");
        return handleNoChunksToEmbed(documentId);
      }

      return processChunks(documentId, chunks);
    } catch (error) {
      if (error instanceof AbortTaskRunError) {
        throw error;
      }

      console.error("[Embed] ❌ Embedding failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check if it's a rate limit error - let it retry
      if (errorMessage.includes("rate") || errorMessage.includes("429")) {
        throw new Error(`Rate limit exceeded: ${errorMessage}`);
      }

      throw new Error(`Failed to generate embeddings: ${errorMessage}`);
    }
  },
  onFailure: async ({ payload, error }) => {
    console.error(`[Embed] Final failure for document ${payload.documentId}`);
    console.error("[Embed] Error:", error);

    await updateDocumentError(
      payload.documentId,
      "EMBEDDING",
      error instanceof Error ? error.message : "Unknown embedding error"
    );
  },
});

/**
 * Updates document processing status
 */
async function updateDocumentStatus(
  documentId: number,
  status:
    | "UPLOADED"
    | "EXTRACTING"
    | "CHUNKING"
    | "EMBEDDING"
    | "READY"
    | "ERROR"
): Promise<void> {
  await db
    .update(document)
    .set({
      processingStatus: status,
      processingError: null,
      updatedAt: new Date(),
    })
    .where(eq(document.id, documentId));
}

/**
 * Updates document with error status and details
 */
async function updateDocumentError(
  documentId: number,
  stage: string,
  message: string
): Promise<void> {
  await db
    .update(document)
    .set({
      processingStatus: "ERROR",
      processingError: {
        stage,
        message,
        timestamp: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(document.id, documentId));
}
