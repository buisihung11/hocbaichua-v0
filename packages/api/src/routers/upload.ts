import { db } from "@hocbaichua-v0/db";
import { document } from "@hocbaichua-v0/db/schema/space";
import type { extractDocument } from "@hocbaichua-v0/tasks";
import { tasks } from "@hocbaichua-v0/tasks/trigger";
import type { IUploadService } from "@hocbaichua-v0/upload";
import { createUploadService } from "@hocbaichua-v0/upload";
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
        where: (doc, { eq }) => eq(doc.spaceId, input.spaceId),
        orderBy: (doc, { desc }) => [desc(doc.createdAt)],
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
});
