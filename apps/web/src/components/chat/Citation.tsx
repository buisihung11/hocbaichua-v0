import { IconExternalLink, IconFileText } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CitationProps {
  citationIndex: number;
  documentTitle: string;
  excerpt: string;
  relevanceScore: number;
  chunkId: number;
  onNavigate?: (chunkId: number) => void;
}

export function Citation({
  citationIndex,
  documentTitle,
  excerpt,
  relevanceScore,
  chunkId,
  onNavigate,
}: CitationProps) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate(chunkId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      aria-label={`Citation ${citationIndex}: ${documentTitle}`}
      className="rounded-lg border bg-card p-3 text-sm shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-accent/50"
      role="article"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-label={`Citation number ${citationIndex}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-xs"
          >
            {citationIndex}
          </span>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <IconFileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="line-clamp-1">{documentTitle}</span>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`View source document: ${documentTitle}`}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              size="icon-sm"
              variant="ghost"
            >
              <IconExternalLink className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View source document</TooltipContent>
        </Tooltip>
      </div>

      <p className="mb-2 line-clamp-3 text-muted-foreground text-xs leading-relaxed">
        {excerpt}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs">Relevance:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                className={cn(
                  "h-2 w-1.5 rounded-sm",
                  relevanceScore >= level * 0.2
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                )}
                key={level}
              />
            ))}
          </div>
          <span className="text-muted-foreground text-xs">
            {Math.round(relevanceScore * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
