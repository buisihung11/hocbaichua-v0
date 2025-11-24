import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, FileIcon, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/utils/trpc";

type FileUploadProps = {
  spaceId: string;
  onUploadComplete?: () => void;
  onUploadError?: (error: Error) => void;
};

type FileWithProgress = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

export function FileUpload({
  spaceId,
  onUploadComplete,
  onUploadError,
}: FileUploadProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation(
    trpc.upload.uploadFile.mutationOptions({
      onSuccess: () => {
        toast.success("File uploaded successfully");
        onUploadComplete?.();
      },
      onError: (error) => {
        toast.error("File upload failed", {
          description: error.message,
        });
        onUploadError?.(new Error(error.message));
      },
    })
  );

  const createDocumentMutation = useMutation(
    trpc.upload.createDocumentFromUpload.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.upload.listDocumentsBySpace.queryKey({ spaceId }),
        });
      },
    })
  );

  const uploadFile = useCallback(
    async (fileWithProgress: FileWithProgress) => {
      const { file } = fileWithProgress;

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: "uploading" as const } : f
        )
      );

      try {
        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        // Upload to R2
        const uploadResult = await uploadMutation.mutateAsync({
          spaceId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileBuffer: base64,
        });

        // Update progress to 50% after upload
        setFiles((prev) =>
          prev.map((f) => (f.file === file ? { ...f, progress: 50 } : f))
        );

        // Create document from upload
        await createDocumentMutation.mutateAsync({
          spaceId,
          title: file.name,
          content: `Uploaded file: ${file.name}`,
          fileUrl: uploadResult.url,
          fileKey: uploadResult.key,
          fileSize: uploadResult.size.toString(),
          fileMimeType: uploadResult.type,
          metadata: {
            originalName: file.name,
            uploadedAt:
              typeof uploadResult.uploadedAt === "string"
                ? uploadResult.uploadedAt
                : new Date(uploadResult.uploadedAt).toISOString(),
            presignedUrl: uploadResult.presignedUrl ?? "",
          },
        }); // Update status to success
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file ? { ...f, progress: 100, status: "success" } : f
          )
        );
      } catch (error) {
        // Update status to error
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    },
    [spaceId, uploadMutation, createDocumentMutation]
  );

  const handleFileChange = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) {
        return;
      }

      const newFiles: FileWithProgress[] = Array.from(selectedFiles).map(
        (file) => ({
          file,
          progress: 0,
          status: "pending" as const,
        })
      );

      setFiles((prev) => [...prev, ...newFiles]);

      // Process each file
      for (const fileWithProgress of newFiles) {
        uploadFile(fileWithProgress);
      }
    },
    [uploadFile]
  );

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileChange(e.dataTransfer.files);
    },
    [handleFileChange]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <button
        className={cn(
          "w-full cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
        )}
        onClick={() => document.getElementById("file-input")?.click()}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            document.getElementById("file-input")?.click();
          }
        }}
        tabIndex={0}
        type="button"
      >
        <input
          accept=".pdf,.doc,.docx,.txt,.md,image/*"
          className="hidden"
          id="file-input"
          multiple
          onChange={(e) => handleFileChange(e.target.files)}
          type="file"
        />
        <CloudUpload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="mb-1 font-medium">Drop files here or click to browse</p>
        <p className="text-muted-foreground text-sm">
          Supports PDF, DOC, DOCX, TXT, MD, and images
        </p>
      </button>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress, index) => (
            <Card
              className="p-4"
              key={`${fileWithProgress.file.name}-${index}`}
            >
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <FileIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                      {fileWithProgress.file.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatFileSize(fileWithProgress.file.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {fileWithProgress.status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {fileWithProgress.status === "success" && (
                      <div className="rounded-full bg-green-500/10 p-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                    )}
                    {fileWithProgress.status === "error" && (
                      <div className="rounded-full bg-destructive/10 p-1">
                        <div className="h-2 w-2 rounded-full bg-destructive" />
                      </div>
                    )}
                    {fileWithProgress.status !== "uploading" && (
                      <Button
                        className="h-6 w-6"
                        onClick={() => removeFile(fileWithProgress.file)}
                        size="icon"
                        variant="ghost"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {fileWithProgress.status === "uploading" && (
                  <Progress value={fileWithProgress.progress} />
                )}

                {fileWithProgress.error && (
                  <p className="text-destructive text-xs">
                    {fileWithProgress.error}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
