import { db, documentChunk } from "@hocbaichua-v0/db";
import { document } from "@hocbaichua-v0/db/schema/space";
import type { extractDocument } from "@hocbaichua-v0/tasks";
import { tasks } from "@hocbaichua-v0/tasks/trigger";
import type { IUploadService } from "@hocbaichua-v0/upload";
import { createUploadService } from "@hocbaichua-v0/upload";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const createDocumentFromUploadSchema = z.object({
  spaceId: z.string(),
  title: z.string(),
  content: z.string(),
  fileUrl: z.string(),
  fileKey: z.string(),
  fileSize: z.string(),
  fileMimeType: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// Lazy initialization of R2 upload service
let uploadServiceInstance: IUploadService | null = null;

function getUploadService(): IUploadService {
  if (!uploadServiceInstance) {
    uploadServiceInstance = createUploadService({
      provider: "r2",
      endpoint: process.env.R2_ENDPOINT ?? "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      bucket: process.env.R2_BUCKET_NAME ?? "",
      region: "auto",
      urlExpirationSeconds: 86_400, // 24 hours
    });
  }
  return uploadServiceInstance;
}

export const uploadRouter = router({
  createDocumentFromUpload: protectedProcedure
    .input(createDocumentFromUploadSchema)
    .mutation(async ({ input }) => {
      try {
        const {
          spaceId,
          title,
          content,
          fileUrl,
          fileKey,
          fileSize,
          fileMimeType,
          metadata,
        } = input;

        // Create content hash for deduplication (includes spaceId to prevent cross-space duplication)
        const contentHash = Buffer.from(`${spaceId}-${content}`).toString(
          "base64"
        );
        const uniqueIdentifierHash = `${spaceId}-${fileKey}`;

        const insertedDocument = await db
          .insert(document)
          .values({
            title,
            documentType: "FILE",
            documentMetadata: metadata,
            content,
            contentHash,
            uniqueIdentifierHash,
            fileUrl,
            fileKey,
            fileSize,
            fileMimeType,
            spaceId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (insertedDocument.length === 0) {
          throw new Error(
            "Failed to insert document. This may be due to duplicate content in this space."
          );
        }

        const insertedDoc = insertedDocument[0];
        if (!insertedDoc) {
          throw new Error("Document was not properly inserted");
        }

        const documentId = insertedDoc.id;

        // Trigger background extraction task
        await tasks.trigger<typeof extractDocument>("extract-document", {
          documentId,
          fileKey,
          fileMimeType,
        });

        return {
          id: documentId,
          success: true,
        };
      } catch (error) {
        console.error("Failed to create document from upload:", error);
        throw new Error("Failed to create document");
      }
    }),

  listDocumentsBySpace: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ input }) => {
      const documents = await db.query.document.findMany({
        where: (row, { eq: equals }) => equals(row.spaceId, input.spaceId),
        orderBy: (row, { desc }) => [desc(row.createdAt)],
      });
      return documents;
    }),

  uploadFile: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileBuffer: z.string(), // base64 encoded file
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { spaceId, fileName, fileType, fileBuffer } = input;
      const userId = ctx.session.user.id;

      // Decode base64 buffer to File
      const buffer = Buffer.from(fileBuffer, "base64");
      const file = new File([buffer], fileName, { type: fileType });

      // Extract file extension
      const extension = fileName.split(".").pop() ?? "bin";
      const fileKey = `${userId}/${spaceId}/${nanoid()}.${extension}`;

      // Upload to R2
      const uploadService = getUploadService();
      const result = await uploadService.uploadFile(file, {
        metadata: {
          key: fileKey,
          userId,
          spaceId,
        },
      });

      return {
        key: result.key,
        url: result.url,
        presignedUrl: result.presignedUrl,
        name: result.name,
        size: result.size,
        type: result.type,
        uploadedAt: result.uploadedAt,
      };
    }),

  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        expiresIn: z.number().optional().default(86_400), // 24 hours default
      })
    )
    .query(async ({ input }) => {
      const { key, expiresIn } = input;

      const uploadService = getUploadService();
      const presignedUrl = await uploadService.getPresignedUrl(key, expiresIn);

      return {
        presignedUrl,
        expiresIn,
      };
    }),
  // T038: Reprocess document (restart pipeline)
  reprocessDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input }) => {
      const { documentId } = input;

      // Get the document to verify it exists and get file info
      const doc = await db.query.document.findFirst({
        where: (row, { eq: equals }) => equals(row.id, documentId),
      });

      if (!doc) {
        throw new Error("Document not found");
      }

      const hasFileInfo = doc.fileKey !== null && doc.fileMimeType !== null;
      if (!hasFileInfo) {
        throw new Error(
          "Document does not have file information for reprocessing"
        );
      }

      // Reset document status
      await db
        .update(document)
        .set({
          processingStatus: "UPLOADED",
          processingError: null,
          chunkCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(document.id, documentId));

      // Delete existing chunks
      await db
        .delete(documentChunk)
        .where(eq(documentChunk.documentId, documentId));

      // Re-trigger extraction
      await tasks.trigger<typeof extractDocument>("extract-document", {
        documentId,
        fileKey: doc.fileKey as string,
        fileMimeType: doc.fileMimeType as string,
      });

      return {
        success: true,
        documentId,
        message: "Document reprocessing started",
      };
    }),

  // Sync all uploaded documents in a space (trigger extraction for UPLOADED status)
  syncUploadedDocuments: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .mutation(async ({ input }) => {
      const { spaceId } = input;

      console.log(`Starting sync of uploaded documents in space ${spaceId}`);

      // Get all documents with UPLOADED status
      const uploadedDocs = await db.query.document.findMany({
        where: (row, { eq: equals, and }) =>
          and(
            equals(row.spaceId, spaceId),
            equals(row.processingStatus, "UPLOADED")
          ),
      });

      console.log(
        `Found ${uploadedDocs.length} uploaded documents to sync in space ${spaceId}`
      );

      if (uploadedDocs.length === 0) {
        return {
          success: true,
          processedCount: 0,
          message: "No uploaded documents to sync",
        };
      }

      // Trigger extraction for each uploaded document
      const results = await Promise.allSettled(
        uploadedDocs.map(async (doc) => {
          if (!(doc.fileKey && doc.fileMimeType)) {
            throw new Error(
              `Document ${doc.id} missing file information for extraction`
            );
          }

          await tasks.trigger<typeof extractDocument>("extract-document", {
            documentId: doc.id,
            fileKey: doc.fileKey,
            fileMimeType: doc.fileMimeType,
          });

          return doc.id;
        })
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failedCount = results.filter((r) => r.status === "rejected").length;

      return {
        success: true,
        processedCount: successCount,
        failedCount,
        totalCount: uploadedDocs.length,
        message: `Started extraction for ${successCount} of ${uploadedDocs.length} uploaded documents`,
      };
    }),
});
