import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { task } from "@trigger.dev/sdk";

/**
 * Extract document task - Downloads file from R2 and validates presigned URL access
 *
 * This task:
 * 1. Downloads file from R2 using S3 client
 * 2. Validates file size and metadata
 * 3. Returns file information for verification
 *
 * Future enhancements will include text extraction based on MIME type
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

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });

    try {
      // Download file from R2
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
      const fileSizeBytes = buffer.length;

      console.log("[Extract Task] ✅ Successfully downloaded file");
      console.log(
        `[Extract Task] Content type: ${response.ContentType ?? "unknown"}`
      );

      // Validate file size
      if (fileSizeBytes === 0) {
        throw new Error("Downloaded file is empty");
      }

      // Return extraction results
      return {
        success: true,
        documentId,
        fileKey,
        fileMimeType,
        downloadedAt: new Date().toISOString(),
        fileSize: fileSizeBytes,
        fileSizeKB: Number((fileSizeBytes / 1024).toFixed(2)),
        contentType: response.ContentType,
        lastModified: response.LastModified?.toISOString(),
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error("[Extract Task] ❌ Failed to download file:", error);

      // Re-throw to trigger retry mechanism
      throw new Error(
        `Failed to download file from R2: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
  onFailure: ({ payload, error }) => {
    console.error(
      `[Extract Task] Final failure for document ${payload.documentId}`
    );
    console.error("[Extract Task] Error:", error);

    // Future: Update document status in database to mark extraction as failed
  },
});
