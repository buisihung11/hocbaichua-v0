/**
 * Document Processing Progress Component
 * T041: Shows the pipeline progress and current stage
 *
 * Displays a visual progress indicator for the document ingestion
 * pipeline with stage labels and percentage completion.
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Scissors,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  type DocumentStatus,
  getStatusStage,
  hasError,
  isProcessing,
} from "./document-status-badge";

type PipelineStage = {
  status: DocumentStatus;
  label: string;
  icon: LucideIcon;
};

const PIPELINE_STAGES: PipelineStage[] = [
  { status: "UPLOADED", label: "Uploaded", icon: FileUp },
  { status: "EXTRACTING", label: "Extract", icon: FileText },
  { status: "CHUNKING", label: "Chunk", icon: Scissors },
  { status: "EMBEDDING", label: "Embed", icon: Sparkles },
  { status: "READY", label: "Ready", icon: CheckCircle2 },
];

type DocumentProcessingProgressProps = {
  status: DocumentStatus;
  error?: {
    message: string;
    stage: string;
    timestamp: string;
  } | null;
  chunkCount?: number;
  showStages?: boolean;
  className?: string;
};

/**
 * Displays the document processing pipeline progress
 */
export function DocumentProcessingProgress({
  status,
  error,
  chunkCount,
  showStages = true,
  className,
}: DocumentProcessingProgressProps) {
  const currentStage = getStatusStage(status);
  const progressPercentage = hasError(status) ? 0 : (currentStage / 5) * 100;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {hasError(status) ? "Processing Failed" : getStatusLabel(status)}
          </span>
          {!hasError(status) && (
            <span className="text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          )}
        </div>
        <Progress
          className={cn(
            hasError(status) && "bg-destructive/20",
            isProcessing(status) && "animate-pulse"
          )}
          value={progressPercentage}
        />
      </div>

      {/* Stage Indicators */}
      {showStages && (
        <StageIndicators currentStage={currentStage} status={status} />
      )}

      {/* Error Message */}
      {hasError(status) && error && <ErrorMessage error={error} />}

      {/* Stats */}
      {status === "READY" && chunkCount !== undefined && (
        <div className="flex gap-4 text-muted-foreground text-sm">
          <span>
            <strong className="font-medium text-foreground">
              {chunkCount}
            </strong>{" "}
            chunks created
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Stage indicator icons
 */
function StageIndicators({
  status,
  currentStage,
}: {
  status: DocumentStatus;
  currentStage: number;
}) {
  return (
    <div className="flex items-center justify-between">
      {PIPELINE_STAGES.map((stage, index) => (
        <StageIcon
          currentStage={currentStage}
          currentStatus={status}
          key={stage.status}
          stage={stage}
          stageNumber={index + 1}
        />
      ))}
    </div>
  );
}

/**
 * Individual stage icon
 */
function StageIcon({
  stage,
  stageNumber,
  currentStage,
  currentStatus,
}: {
  stage: PipelineStage;
  stageNumber: number;
  currentStage: number;
  currentStatus: DocumentStatus;
}) {
  const isCurrentStage = currentStatus === stage.status;
  const isCompletedStage = currentStage > stageNumber;

  const circleClass = getStageCircleClass(
    isCurrentStage,
    isCompletedStage,
    currentStatus
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={circleClass}>
        <StageIconContent
          currentStatus={currentStatus}
          isCompletedStage={isCompletedStage}
          isCurrentStage={isCurrentStage}
          stage={stage}
        />
      </div>
      <span
        className={cn(
          "text-xs",
          isCurrentStage || isCompletedStage
            ? "font-medium text-foreground"
            : "text-muted-foreground"
        )}
      >
        {stage.label}
      </span>
    </div>
  );
}

function getStageCircleClass(
  isCurrentStage: boolean,
  isCompletedStage: boolean,
  status: DocumentStatus
): string {
  const baseClass =
    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors";

  if (isCompletedStage) {
    return cn(baseClass, "border-green-500 bg-green-100 text-green-600");
  }
  if (isCurrentStage && isProcessing(status)) {
    return cn(baseClass, "border-blue-500 bg-blue-100 text-blue-600");
  }
  if (isCurrentStage && status === "READY") {
    return cn(baseClass, "border-green-500 bg-green-100 text-green-600");
  }
  if (isCurrentStage && hasError(status)) {
    return cn(
      baseClass,
      "border-destructive bg-destructive/10 text-destructive"
    );
  }
  return cn(baseClass, "border-muted-foreground/30 text-muted-foreground/50");
}

function StageIconContent({
  stage,
  isCurrentStage,
  isCompletedStage,
  currentStatus,
}: {
  stage: PipelineStage;
  isCurrentStage: boolean;
  isCompletedStage: boolean;
  currentStatus: DocumentStatus;
}) {
  if (isCurrentStage && isProcessing(currentStatus)) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }
  if (isCurrentStage && hasError(currentStatus)) {
    return <AlertCircle className="h-4 w-4" />;
  }
  if (isCompletedStage) {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  const Icon = stage.icon;
  return <Icon className="h-4 w-4" />;
}

/**
 * Error message display
 */
function ErrorMessage({
  error,
}: {
  error: { message: string; stage: string; timestamp: string };
}) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-destructive">
            Error during {error.stage?.toLowerCase() ?? "processing"}
          </p>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    UPLOADED: "Waiting to process...",
    EXTRACTING: "Extracting text...",
    CHUNKING: "Splitting into chunks...",
    EMBEDDING: "Generating embeddings...",
    READY: "Processing complete",
    ERROR: "Processing failed",
  };
  return labels[status];
}

/**
 * Compact version of the progress component for list views
 */
export function DocumentProcessingProgressCompact({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
}) {
  const currentStage = getStatusStage(status);
  const progressPercentage = hasError(status) ? 0 : (currentStage / 5) * 100;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress
        className={cn("h-1.5 w-20", hasError(status) && "bg-destructive/20")}
        value={progressPercentage}
      />
      <span className="text-muted-foreground text-xs">
        {Math.round(progressPercentage)}%
      </span>
    </div>
  );
}
