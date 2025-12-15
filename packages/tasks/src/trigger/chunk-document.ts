/**
 * Chunk Document Task
 * T020-T024: Splits extracted text into semantic chunks
 *
 * This task:
 * 1. Updates document status to CHUNKING
 * 2. Retrieves content from database or uses PDFLoader if tempFilePath provided
 * 3. Splits text using RecursiveCharacterTextSplitter
 * 4. Creates document_chunk records with metadata
 * 5. Updates document.chunkCount
 * 6. Triggers embed-chunks task for next stage
 */

import { db, document, documentChunk } from "@hocbaichua-v0/db";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { AbortTaskRunError, task } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { estimateTokenCount, splitText } from "../lib/text-splitter";
import { embedChunks } from "./embed-chunks";

export const chunkDocument = task({
  id: "chunk-document",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  run: async (payload: { documentId: number; tempFilePath?: string }) => {
    const { documentId, tempFilePath } = payload;

    console.log(`[Chunk] Starting chunking for document ${documentId}`);

    // T024: Update status to CHUNKING
    await updateDocumentStatus(documentId, "CHUNKING");

    try {
      // Retrieve document
      const doc = await db.query.document.findFirst({
        where: eq(document.id, documentId),
        columns: {
          id: true,
          title: true,
          content: true,
          fileMimeType: true,
        },
      });

      if (!doc) {
        throw new AbortTaskRunError(`Document ${documentId} not found`);
      }

      let contentToChunk: string;

      // If tempFilePath is provided, use PDFLoader for more detailed extraction
      if (tempFilePath) {
        console.log(`[Chunk] Loading content from temp file: ${tempFilePath}`);
        const loader = new PDFLoader(tempFilePath, {
          splitPages: false, // Get full document content
        });

        const docs = await loader.load();

        if (!docs || docs.length === 0 || !docs[0]) {
          throw new AbortTaskRunError(
            `Failed to load content from temp file: ${tempFilePath}`
          );
        }

        contentToChunk = docs[0].pageContent;
        console.log(
          `[Chunk] Loaded ${contentToChunk.length} characters from PDF`
        );
      } else {
        // Fall back to content from database
        if (!doc.content || doc.content.trim().length === 0) {
          throw new AbortTaskRunError(
            `Document ${documentId} has no content. Run extraction first.`
          );
        }

        contentToChunk = doc.content;
      }

      console.log(`[Chunk] Processing "${doc.title}"`);
      console.log(
        `[Chunk] Content length: ${contentToChunk.length} characters`
      );

      // T021: Split text into chunks
      const chunks = await splitText(contentToChunk);
      console.log(`[Chunk] Split into ${chunks.length} chunks`);

      // T022: Delete any existing chunks for this document (for reprocessing)
      await db
        .delete(documentChunk)
        .where(eq(documentChunk.documentId, documentId));

      // T022: Insert new chunks
      const chunkRecords = chunks.map((chunk) => ({
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        tokenCount: estimateTokenCount(chunk.content),
        metadata: chunk.metadata || null,
      }));

      // Batch insert chunks
      if (chunkRecords.length > 0) {
        await db.insert(documentChunk).values(chunkRecords);
      }

      console.log(`[Chunk] ✅ Inserted ${chunkRecords.length} chunk records`);

      // T023: Update document chunk count
      await db
        .update(document)
        .set({
          chunkCount: chunkRecords.length,
          updatedAt: new Date(),
        })
        .where(eq(document.id, documentId));

      // T031: Chain to embed-chunks task
      console.log(
        `[Chunk] ⏩ Triggering embed-chunks for document ${documentId}`
      );
      await embedChunks.triggerAndWait({
        documentId,
        chunkCount: chunkRecords.length,
      });

      // Return results for chaining to embed task
      return {
        success: true,
        documentId,
        chunkCount: chunkRecords.length,
        totalCharacters: contentToChunk.length,
        averageChunkSize: Math.round(contentToChunk.length / chunks.length),
        chunkedAt: new Date().toISOString(),
      };
    } catch (error) {
      // If it's an AbortTaskRunError, let it propagate
      if (error instanceof AbortTaskRunError) {
        throw error;
      }

      console.error("[Chunk] ❌ Chunking failed:", error);

      throw new Error(
        `Failed to chunk document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
  onFailure: async ({ payload, error }) => {
    console.error(`[Chunk] Final failure for document ${payload.documentId}`);
    console.error("[Chunk] Error:", error);

    await updateDocumentError(
      payload.documentId,
      "CHUNKING",
      error instanceof Error ? error.message : "Unknown chunking error"
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
