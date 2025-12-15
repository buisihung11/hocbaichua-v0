import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db, document } from "@hocbaichua-v0/db";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { AbortTaskRunError, task } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { chunkDocument } from "./chunk-document";

/**
 * Downloads file from R2 and returns buffer
 */
async function downloadFromR2(
  fileKey: string
): Promise<{ buffer: Buffer; contentType?: string }> {
  const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  console.log("[Extract Task] Downloading file from R2...");

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("No file body received from R2");
  }

  // Convert stream to buffer
  console.log("[Extract Task] Converting stream to buffer...");
  const chunks: Uint8Array[] = [];

  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);

  console.log("[Extract Task] ✅ Successfully downloaded file");
  console.log(
    `[Extract Task] Content type: ${response.ContentType ?? "unknown"}`
  );

  return { buffer, contentType: response.ContentType };
}

/**
 * Extracts text from PDF file
 */
async function extractTextFromPDF(
  tempFilePath: string
): Promise<{ text: string; pageCount: number | null }> {
  console.log("[Extract Task] Extracting text content with PDFLoader...");
  const loader = new PDFLoader(tempFilePath, {
    splitPages: false, // Get full document content
  });

  const docs = await loader.load();

  if (!docs || docs.length === 0 || !docs[0]) {
    throw new Error("No content extracted from PDF");
  }

  const text = docs[0].pageContent;
  const pageCount = docs[0].metadata?.pdf?.totalPages || null;

  console.log(`[Extract Task] ✅ Extracted ${text.length} characters`);
  console.log(`[Extract Task] Page count: ${pageCount || "unknown"}`);

  return { text, pageCount };
}

/**
 * Extract document task - Downloads file from R2, extracts text content, and stores it
 *
 * This task:
 * 1. Updates document status to EXTRACTING
 * 2. Downloads file from R2 using S3 client
 * 3. Saves file to temp directory
 * 4. Extracts text content using PDFLoader
 * 5. Stores extracted content in document.content
 * 6. Triggers chunk-document task with temp file path
 */
export const extractDocument = task({
  id: "extract-document",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10_000,
    randomize: true,
  },
  run: async (payload: {
    documentId: number;
    fileKey: string;
    fileMimeType: string;
  }) => {
    const { documentId, fileKey, fileMimeType } = payload;

    console.log(
      `[Extract Task] Starting extraction for document ${documentId}`
    );
    console.log(`[Extract Task] File key: ${fileKey}`);
    console.log(`[Extract Task] MIME type: ${fileMimeType}`);
    console.log(`[Extract Task] Endpoint: ${process.env.R2_ENDPOINT}`);

    // Update status to EXTRACTING
    await updateDocumentStatus(documentId, "EXTRACTING");

    try {
      // Download file from R2
      const { buffer, contentType } = await downloadFromR2(fileKey);
      const fileSizeBytes = buffer.length;

      // Validate file size
      if (fileSizeBytes === 0) {
        throw new Error("Downloaded file is empty");
      }

      // Create temp directory for this document
      const tempDir = join(tmpdir(), "hocbaichua-docs", documentId.toString());
      await mkdir(tempDir, { recursive: true });

      // Create temp file path with proper extension
      const fileExtension = fileMimeType.includes("pdf") ? ".pdf" : "";
      const tempFilePath = join(tempDir, `document${fileExtension}`);

      // Write buffer to temp file
      console.log("[Extract Task] Writing file to temp directory...");
      await writeFile(tempFilePath, buffer);
      console.log(`[Extract Task] ✅ Saved to: ${tempFilePath}`);

      // Extract text content using PDFLoader
      const { text: extractedText, pageCount } =
        await extractTextFromPDF(tempFilePath);

      // Store extracted content in document.content
      await db
        .update(document)
        .set({
          content: extractedText,
          documentMetadata: {
            pageCount,
            contentLength: extractedText.length,
            extractedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(document.id, documentId));

      console.log(
        "[Extract Task] ✅ Stored extracted content in document record"
      );

      // Trigger chunk-document task with temp file path
      console.log(
        `[Extract Task] ⏩ Triggering chunk-document for document ${documentId}`
      );
      await chunkDocument.triggerAndWait({
        documentId,
        tempFilePath,
      });

      // Return extraction results
      return {
        success: true,
        documentId,
        fileKey,
        fileMimeType,
        downloadedAt: new Date().toISOString(),
        fileSize: fileSizeBytes,
        fileSizeKB: Number((fileSizeBytes / 1024).toFixed(2)),
        contentType,
        extractedLength: extractedText.length,
        pageCount,
        tempFilePath,
      };
    } catch (error) {
      console.error("[Extract Task] ❌ Failed to extract document:", error);

      // If it's an AbortTaskRunError, let it propagate
      if (error instanceof AbortTaskRunError) {
        throw error;
      }

      // Re-throw to trigger retry mechanism
      throw new Error(
        `Failed to extract document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
  onFailure: async ({ payload, error }) => {
    console.error(
      `[Extract Task] Final failure for document ${payload.documentId}`
    );
    console.error("[Extract Task] Error:", error);

    await updateDocumentError(
      payload.documentId,
      "EXTRACTING",
      error instanceof Error ? error.message : "Unknown extraction error"
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
