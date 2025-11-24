export type UploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};

export type UploadOptions = {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
  metadata?: Record<string, string>;
  resumable?: boolean;
};

export type UploadResult = {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  metadata?: Record<string, string>;
  presignedUrl?: string;
};

export type UploadConfig = {
  maxFileSize?: number;
  allowedFileTypes?: string[];
  maxFiles?: number;
};

export type IUploadService = {
  /**
   * Upload a single file
   */
  uploadFile(file: File, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Upload multiple files
   */
  uploadFiles(files: File[], options?: UploadOptions): Promise<UploadResult[]>;

  /**
   * Cancel an ongoing upload
   */
  cancelUpload(uploadId: string): Promise<void>;

  /**
   * Resume a paused upload
   */
  resumeUpload(uploadId: string): Promise<void>;

  /**
   * Delete an uploaded file
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Get a presigned URL for a file
   */
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Get upload configuration
   */
  getConfig(): UploadConfig;
};

export type UploadServiceProvider = "uploadthing" | "s3" | "cloudinary" | "r2";

export type UploadServiceConfig = {
  provider: UploadServiceProvider;
  apiKey?: string;
  secret?: string;
  region?: string;
  bucket?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  urlExpirationSeconds?: number;
};
