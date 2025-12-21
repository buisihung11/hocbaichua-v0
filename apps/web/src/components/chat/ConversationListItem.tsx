import { IconMessage, IconTrash } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ConversationListItemProps {
  id: string;
  title: string | null;
  updatedAt: Date;
  messagePreview?: string;
  isActive?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationListItem({
  id,
  title,
  updatedAt,
  messagePreview,
  isActive,
  onSelect,
  onDelete,
}: ConversationListItemProps) {
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent",
        isActive && "border-primary bg-accent"
      )}
      onClick={() => onSelect(id)}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <IconMessage className="size-4 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 font-medium text-sm">
            {title || "New Conversation"}
          </h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Delete conversation"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                size="icon-sm"
                variant="ghost"
              >
                <IconTrash className="size-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete conversation</TooltipContent>
          </Tooltip>
        </div>

        {messagePreview && (
          <p className="mb-1 line-clamp-2 text-muted-foreground text-xs">
            {messagePreview}
          </p>
        )}

        <p className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
