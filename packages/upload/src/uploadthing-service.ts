import { type PreviousUpload, Upload } from "tus-js-client";
import { BaseUploadService } from "./base-upload-service";
import type {
  UploadConfig,
  UploadOptions,
  UploadProgress,
  UploadResult,
} from "./types";

export type UploadThingConfig = UploadConfig & {
  endpoint: string;
  apiKey?: string;
};

export class UploadThingService extends BaseUploadService {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly activeUploads: Map<string, Upload>;

  constructor(config: UploadThingConfig) {
    super(config);
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.activeUploads = new Map();
  }

  uploadFile(file: File, options?: UploadOptions): Promise<UploadResult> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadId = `${Date.now()}-${file.name}`;

      const upload = new Upload(file, {
        endpoint: this.endpoint,
        retryDelays: [0, 3000, 5000, 10_000, 20_000],
        chunkSize: 5 * 1024 * 1024, // 5MB chunks for resumable uploads
        metadata: {
          filename: file.name,
          filetype: file.type,
          ...options?.metadata,
        },
        headers: this.apiKey
          ? {
              Authorization: `Bearer ${this.apiKey}`,
            }
          : {},
        onError: (error: Error) => {
          this.activeUploads.delete(uploadId);
          options?.onError?.(error);
          reject(error);
        },
        onProgress: (bytesUploaded: number, bytesTotal: number) => {
          const progress: UploadProgress = {
            loaded: bytesUploaded,
            total: bytesTotal,
            percentage: Math.round((bytesUploaded / bytesTotal) * 100),
          };
          options?.onProgress?.(progress);
        },
        onSuccess: () => {
          const url = upload.url ?? "";
          const result: UploadResult = {
            key: uploadId,
            url,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date(),
            metadata: options?.metadata,
          };

          this.activeUploads.delete(uploadId);
          options?.onSuccess?.(result);
          resolve(result);
        },
      });

      // Store upload instance for cancellation/resumption
      this.activeUploads.set(uploadId, upload);

      // Check if previous upload exists
      if (options?.resumable) {
        upload
          .findPreviousUploads()
          .then((previousUploads: PreviousUpload[]) => {
            const previousUpload = previousUploads[0];
            if (previousUploads.length > 0 && previousUpload) {
              upload.resumeFromPreviousUpload(previousUpload);
            }
            upload.start();
          })
          .catch(() => {
            // If finding previous uploads fails, start new upload
            upload.start();
          });
      } else {
        upload.start();
      }
    });
  }

  uploadFiles(files: File[], options?: UploadOptions): Promise<UploadResult[]> {
    this.validateFiles(files);

    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  cancelUpload(uploadId: string): Promise<void> {
    const upload = this.activeUploads.get(uploadId);
    if (upload) {
      upload.abort();
      this.activeUploads.delete(uploadId);
    }
    return Promise.resolve();
  }

  resumeUpload(uploadId: string): Promise<void> {
    const upload = this.activeUploads.get(uploadId);
    if (upload) {
      upload.start();
    }
    return Promise.resolve();
  }

  deleteFile(_key: string): Promise<void> {
    // UploadThing deletion would be handled via API
    // This is a placeholder for the interface requirement
    throw new Error("Delete file not implemented for UploadThing service");
  }

  getPresignedUrl(_key: string, _expiresIn?: number): Promise<string> {
    // UploadThing doesn't use presigned URLs
    throw new Error("Presigned URLs not supported for UploadThing service");
  }
}
