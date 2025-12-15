# API Contracts: Document Ingestion Pipeline

**Feature**: 002-document-ingestion
**Date**: 2024-12-14
**Status**: Complete

## Overview

This document defines the tRPC API contracts for document ingestion, extending the existing `uploadRouter`.

---

## Router Extensions

### packages/api/src/routers/upload.ts

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@hocbaichua-v0/db";
import { document, documentChunk } from "@hocbaichua-v0/db/schema/space";
import { eq, and, desc, asc, sql } from "drizzle-orm";

// ============================================
// Zod Schemas
// ============================================

const documentStatusSchema = z.enum([
  "UPLOADED",
  "EXTRACTING",
  "CHUNKING",
  "EMBEDDING",
  "READY",
  "ERROR",
]);

const processingErrorSchema = z.object({
  message: z.string(),
  stage: z.enum(["EXTRACTING", "CHUNKING", "EMBEDDING"]),
  timestamp: z.string(),
  details: z.record(z.unknown()).optional(),
});

const documentWithStatusSchema = z.object({
  id: z.number(),
  title: z.string(),
  documentType: z.string(),
  processingStatus: documentStatusSchema,
  processingError: processingErrorSchema.nullable(),
  chunkCount: z.number(),
  fileUrl: z.string().nullable(),
  fileMimeType: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const chunkSchema = z.object({
  id: z.number(),
  content: z.string(),
  chunkIndex: z.number(),
  startOffset: z.number(),
  endOffset: z.number(),
  tokenCount: z.number().nullable(),
  hasEmbedding: z.boolean(),
});

const similarChunkSchema = z.object({
  id: z.number(),
  content: z.string(),
  documentId: z.number(),
  documentTitle: z.string(),
  similarity: z.number(),
});

// ============================================
// Input Schemas
// ============================================

const getDocumentStatusInput = z.object({
  documentId: z.number(),
});

const listDocumentsByStatusInput = z.object({
  spaceId: z.string(),
  status: documentStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const getDocumentChunksInput = z.object({
  documentId: z.number(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const reprocessDocumentInput = z.object({
  documentId: z.number(),
});

const similaritySearchInput = z.object({
  spaceId: z.string(),
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.7),
});

// ============================================
// Router Definition
// ============================================

export const uploadRouter = router({
  // ... existing procedures ...

  /**
   * Get processing status for a specific document
   * @returns Document with current processing status and error details
   */
  getDocumentStatus: protectedProcedure
    .input(getDocumentStatusInput)
    .output(documentWithStatusSchema)
    .query(async ({ input, ctx }) => {
      const doc = await db.query.document.findFirst({
        where: eq(document.id, input.documentId),
      });

      if (!doc) {
        throw new Error("Document not found");
      }

      // Verify user has access via space ownership
      const space = await db.query.space.findFirst({
        where: and(
          eq(space.id, doc.spaceId),
          eq(space.userId, ctx.session.user.id)
        ),
      });

      if (!space) {
        throw new Error("Access denied");
      }

      return {
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        processingStatus: doc.processingStatus,
        processingError: doc.processingError,
        chunkCount: doc.chunkCount,
        fileUrl: doc.fileUrl,
        fileMimeType: doc.fileMimeType,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }),

  /**
   * List documents in a space with optional status filter
   * @returns Paginated list of documents with status
   */
  listDocumentsByStatus: protectedProcedure
    .input(listDocumentsByStatusInput)
    .output(
      z.object({
        documents: z.array(documentWithStatusSchema),
        total: z.number(),
        hasMore: z.boolean(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { spaceId, status, limit, offset } = input;

      // Verify space ownership
      const space = await db.query.space.findFirst({
        where: and(
          eq(space.id, spaceId),
          eq(space.userId, ctx.session.user.id)
        ),
      });

      if (!space) {
        throw new Error("Space not found or access denied");
      }

      const whereClause = status
        ? and(
            eq(document.spaceId, spaceId),
            eq(document.processingStatus, status)
          )
        : eq(document.spaceId, spaceId);

      const [docs, countResult] = await Promise.all([
        db.query.document.findMany({
          where: whereClause,
          orderBy: [desc(document.createdAt)],
          limit: limit + 1, // Fetch one extra to check hasMore
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(document)
          .where(whereClause),
      ]);

      const hasMore = docs.length > limit;
      const documents = docs.slice(0, limit);

      return {
        documents: documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          documentType: doc.documentType,
          processingStatus: doc.processingStatus,
          processingError: doc.processingError,
          chunkCount: doc.chunkCount,
          fileUrl: doc.fileUrl,
          fileMimeType: doc.fileMimeType,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })),
        total: countResult[0]?.count ?? 0,
        hasMore,
      };
    }),

  /**
   * Get chunks for a processed document
   * @returns Paginated list of document chunks
   */
  getDocumentChunks: protectedProcedure
    .input(getDocumentChunksInput)
    .output(
      z.object({
        chunks: z.array(chunkSchema),
        total: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { documentId, limit, offset } = input;

      // Verify document access
      const doc = await db.query.document.findFirst({
        where: eq(document.id, documentId),
        with: { space: true },
      });

      if (!doc || doc.space.userId !== ctx.session.user.id) {
        throw new Error("Document not found or access denied");
      }

      const [chunks, countResult] = await Promise.all([
        db.query.documentChunk.findMany({
          where: eq(documentChunk.documentId, documentId),
          orderBy: [asc(documentChunk.chunkIndex)],
          limit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(documentChunk)
          .where(eq(documentChunk.documentId, documentId)),
      ]);

      return {
        chunks: chunks.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          tokenCount: chunk.tokenCount,
          hasEmbedding: chunk.embedding !== null,
        })),
        total: countResult[0]?.count ?? 0,
      };
    }),

  /**
   * Reprocess a failed document
   * @returns Success status
   */
  reprocessDocument: protectedProcedure
    .input(reprocessDocumentInput)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { documentId } = input;

      // Verify document access and status
      const doc = await db.query.document.findFirst({
        where: eq(document.id, documentId),
        with: { space: true },
      });

      if (!doc || doc.space.userId !== ctx.session.user.id) {
        throw new Error("Document not found or access denied");
      }

      if (doc.processingStatus !== "ERROR") {
        throw new Error("Only failed documents can be reprocessed");
      }

      // Reset status and trigger reprocessing
      await db
        .update(document)
        .set({
          processingStatus: "UPLOADED",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(document.id, documentId));

      // Delete existing chunks
      await db
        .delete(documentChunk)
        .where(eq(documentChunk.documentId, documentId));

      // Trigger extraction task
      const { tasks } = await import("@hocbaichua-v0/tasks/trigger");
      await tasks.trigger("extract-document", {
        documentId,
        fileKey: doc.fileKey!,
        fileMimeType: doc.fileMimeType!,
      });

      return { success: true };
    }),

  /**
   * Semantic similarity search across document chunks
   * Note: This is a preview endpoint for testing; full implementation in Q&A feature
   * @returns Similar chunks with relevance scores
   */
  similaritySearch: protectedProcedure
    .input(similaritySearchInput)
    .output(
      z.object({
        results: z.array(similarChunkSchema),
      })
    )
    .query(async ({ input, ctx }) => {
      const { spaceId, query, limit, threshold } = input;

      // Verify space ownership
      const space = await db.query.space.findFirst({
        where: and(
          eq(space.id, spaceId),
          eq(space.userId, ctx.session.user.id)
        ),
      });

      if (!space) {
        throw new Error("Space not found or access denied");
      }

      // Generate embedding for query
      const { generateEmbedding } = await import(
        "@hocbaichua-v0/tasks/lib/embeddings"
      );
      const queryEmbedding = await generateEmbedding(query);
      const embeddingVector = `[${queryEmbedding.join(",")}]`;

      // Similarity search using pgvector
      const results = await db.execute(sql`
        SELECT 
          dc.id,
          dc.content,
          dc.document_id as "documentId",
          d.title as "documentTitle",
          1 - (dc.embedding <=> ${embeddingVector}::vector) as similarity
        FROM document_chunk dc
        JOIN document d ON dc.document_id = d.id
        WHERE d.space_id = ${spaceId}
          AND dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> ${embeddingVector}::vector) > ${threshold}
        ORDER BY dc.embedding <=> ${embeddingVector}::vector
        LIMIT ${limit}
      `);

      return {
        results: results.rows.map((row) => ({
          id: row.id as number,
          content: row.content as string,
          documentId: row.documentId as number,
          documentTitle: row.documentTitle as string,
          similarity: row.similarity as number,
        })),
      };
    }),
});
```

---

## API Summary

| Procedure               | Type     | Description                                |
| ----------------------- | -------- | ------------------------------------------ |
| `getDocumentStatus`     | Query    | Get processing status for a document       |
| `listDocumentsByStatus` | Query    | List documents with optional status filter |
| `getDocumentChunks`     | Query    | Get chunks for a processed document        |
| `reprocessDocument`     | Mutation | Retry processing for a failed document     |
| `similaritySearch`      | Query    | Search chunks by semantic similarity       |

---

## Error Codes

| Error                                      | HTTP Status | Description                                |
| ------------------------------------------ | ----------- | ------------------------------------------ |
| `Document not found`                       | 404         | Document ID doesn't exist                  |
| `Access denied`                            | 403         | User doesn't own the space                 |
| `Only failed documents can be reprocessed` | 400         | Document status is not ERROR               |
| `Space not found or access denied`         | 403         | Space doesn't exist or user doesn't own it |

---

## Client Usage Examples

```typescript
import { trpc } from "@/utils/trpc";

// Get document status
const { data: doc } = trpc.upload.getDocumentStatus.useQuery({
  documentId: 123,
});

// List documents by status
const { data: list } = trpc.upload.listDocumentsByStatus.useQuery({
  spaceId: "space_abc",
  status: "READY",
  limit: 20,
});

// Get document chunks
const { data: chunks } = trpc.upload.getDocumentChunks.useQuery({
  documentId: 123,
  limit: 50,
});

// Reprocess failed document
const reprocess = trpc.upload.reprocessDocument.useMutation();
await reprocess.mutateAsync({ documentId: 123 });

// Similarity search
const { data: results } = trpc.upload.similaritySearch.useQuery({
  spaceId: "space_abc",
  query: "What is machine learning?",
  limit: 5,
  threshold: 0.7,
});
```
