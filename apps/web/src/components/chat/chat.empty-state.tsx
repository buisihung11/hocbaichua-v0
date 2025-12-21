import { IconAlertCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface ChatEmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
}

export function ChatEmptyState({
  icon = <IconAlertCircle className="size-12 text-muted-foreground" />,
  title = "No Documents Yet",
  description = "Upload some documents to this space before starting a conversation.",
}: ChatEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        {icon}
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}
