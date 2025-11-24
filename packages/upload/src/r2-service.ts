import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BaseUploadService } from "./base-upload-service";
import type {
  UploadConfig,
  UploadOptions,
  UploadProgress,
  UploadResult,
} from "./types";

export type R2Config = UploadConfig & {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  urlExpirationSeconds?: number;
};

export class R2UploadService extends BaseUploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly urlExpirationSeconds: number;

  constructor(config: R2Config) {
    super(config);

    this.bucket = config.bucket;
    this.urlExpirationSeconds = config.urlExpirationSeconds ?? 86_400; // 24 hours default

    this.client = new S3Client({
      region: config.region ?? "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<UploadResult> {
    this.validateFile(file);

    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    const key = options?.metadata?.key ?? `${Date.now()}-${file.name}`;

    try {
      // Use simple PUT for files < 5MB, multipart for larger files
      if (file.size < 5 * 1024 * 1024) {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            Metadata: options?.metadata,
          })
        );

        // Report 100% progress for simple uploads
        if (options?.onProgress) {
          options.onProgress({
            loaded: file.size,
            total: file.size,
            percentage: 100,
          });
        }
      } else {
        // Use multipart upload for large files
        const upload = new Upload({
          client: this.client,
          params: {
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            Metadata: options?.metadata,
          },
          queueSize: 4,
          partSize: 5 * 1024 * 1024, // 5MB parts
          leavePartsOnError: false,
        });

        upload.on("httpUploadProgress", (progress) => {
          if (options?.onProgress && progress.loaded && progress.total) {
            const uploadProgress: UploadProgress = {
              loaded: progress.loaded,
              total: progress.total,
              percentage: Math.round((progress.loaded / progress.total) * 100),
            };
            options.onProgress(uploadProgress);
          }
        });

        await upload.done();
      }

      // Generate presigned URL
      const presignedUrl = await this.getPresignedUrl(
        key,
        this.urlExpirationSeconds
      );

      const result: UploadResult = {
        key,
        url: `${this.client.config.endpoint}/${this.bucket}/${key}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        metadata: options?.metadata,
        presignedUrl,
      };

      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const uploadError =
        error instanceof Error ? error : new Error("Upload failed");
      options?.onError?.(uploadError);
      throw uploadError;
    }
  }

  async uploadFiles(
    files: File[],
    options?: UploadOptions
  ): Promise<UploadResult[]> {
    this.validateFiles(files);

    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return await Promise.all(uploadPromises);
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async getPresignedUrl(key: string, expiresIn?: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresIn ?? this.urlExpirationSeconds,
    });

    return url;
  }

  cancelUpload(_uploadId: string): Promise<void> {
    // R2 multipart uploads are handled internally by @aws-sdk/lib-storage
    // Cancellation would require tracking Upload instances
    throw new Error("Cancel upload not implemented for R2 service");
  }

  resumeUpload(_uploadId: string): Promise<void> {
    // R2 doesn't support resumable uploads in the same way as TUS
    throw new Error("Resume upload not supported for R2 service");
  }
}
