import type {
  IUploadService,
  UploadConfig,
  UploadOptions,
  UploadResult,
} from "./types";

export abstract class BaseUploadService implements IUploadService {
  protected config: UploadConfig;

  constructor(config: UploadConfig = {}) {
    this.config = {
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB default
      allowedFileTypes: config.allowedFileTypes ?? [],
      maxFiles: config.maxFiles ?? 10,
    };
  }

  abstract uploadFile(
    file: File,
    options?: UploadOptions
  ): Promise<UploadResult>;

  abstract uploadFiles(
    files: File[],
    options?: UploadOptions
  ): Promise<UploadResult[]>;

  abstract cancelUpload(uploadId: string): Promise<void>;

  abstract resumeUpload(uploadId: string): Promise<void>;

  abstract deleteFile(key: string): Promise<void>;

  abstract getPresignedUrl(key: string, expiresIn?: number): Promise<string>;

  getConfig(): UploadConfig {
    return this.config;
  }

  protected validateFile(file: File): void {
    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      throw new Error(
        `File size ${file.size} exceeds maximum allowed size ${this.config.maxFileSize}`
      );
    }

    if (
      this.config.allowedFileTypes &&
      this.config.allowedFileTypes.length > 0
    ) {
      const fileType = file.type;
      const isAllowed = this.config.allowedFileTypes.some((type) => {
        if (type.endsWith("/*")) {
          const baseType = type.split("/")[0];
          return fileType.startsWith(`${baseType}/`);
        }
        return fileType === type;
      });

      if (!isAllowed) {
        throw new Error(
          `File type ${fileType} is not allowed. Allowed types: ${this.config.allowedFileTypes.join(", ")}`
        );
      }
    }
  }

  protected validateFiles(files: File[]): void {
    if (this.config.maxFiles && files.length > this.config.maxFiles) {
      throw new Error(
        `Number of files ${files.length} exceeds maximum allowed ${this.config.maxFiles}`
      );
    }

    for (const file of files) {
      this.validateFile(file);
    }
  }
}
