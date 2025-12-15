/**
 * Document Status Badge Component
 * T040: Visual indicator for document processing status
 *
 * Displays the current processing status of a document with
 * appropriate colors and icons for each stage.
 */

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Scissors,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DocumentStatus =
  | "UPLOADED"
  | "EXTRACTING"
  | "CHUNKING"
  | "EMBEDDING"
  | "READY"
  | "ERROR";

type StatusConfig = {
  label: string;
  icon: typeof Circle;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  isAnimated: boolean;
};

const STATUS_CONFIG: Record<DocumentStatus, StatusConfig> = {
  UPLOADED: {
    label: "Uploaded",
    icon: Circle,
    variant: "outline",
    className: "border-gray-300 text-gray-600",
    isAnimated: false,
  },
  EXTRACTING: {
    label: "Extracting",
    icon: FileText,
    variant: "secondary",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    isAnimated: true,
  },
  CHUNKING: {
    label: "Chunking",
    icon: Scissors,
    variant: "secondary",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    isAnimated: true,
  },
  EMBEDDING: {
    label: "Embedding",
    icon: Sparkles,
    variant: "secondary",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    isAnimated: true,
  },
  READY: {
    label: "Ready",
    icon: CheckCircle2,
    variant: "default",
    className: "bg-green-100 text-green-700 border-green-200",
    isAnimated: false,
  },
  ERROR: {
    label: "Error",
    icon: AlertCircle,
    variant: "destructive",
    className: "",
    isAnimated: false,
  },
};

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Displays the processing status of a document as a badge
 *
 * @example
 * ```tsx
 * <DocumentStatusBadge status="EXTRACTING" />
 * <DocumentStatusBadge status="READY" showLabel={false} />
 * <DocumentStatusBadge status="ERROR" size="lg" />
 * ```
 */
export function DocumentStatusBadge({
  status,
  showLabel = true,
  size = "md",
  className,
}: DocumentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.isAnimated ? Loader2 : config.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      className={cn(sizeClasses[size], config.className, className)}
      variant={config.variant}
    >
      <Icon
        className={cn(iconSizes[size], config.isAnimated && "animate-spin")}
      />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}

/**
 * Returns the processing stage as a number (1-5) for progress tracking
 */
export function getStatusStage(status: DocumentStatus): number {
  const stages: Record<DocumentStatus, number> = {
    UPLOADED: 1,
    EXTRACTING: 2,
    CHUNKING: 3,
    EMBEDDING: 4,
    READY: 5,
    ERROR: 0,
  };
  return stages[status];
}

/**
 * Returns true if the document is currently being processed
 */
export function isProcessing(status: DocumentStatus): boolean {
  return ["EXTRACTING", "CHUNKING", "EMBEDDING"].includes(status);
}

/**
 * Returns true if the document processing is complete
 */
export function isComplete(status: DocumentStatus): boolean {
  return status === "READY";
}

/**
 * Returns true if the document processing has failed
 */
export function hasError(status: DocumentStatus): boolean {
  return status === "ERROR";
}
