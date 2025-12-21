import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { BookOpen, FileText, MessageSquare, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { DocumentStatus } from "@/components/document-status-badge";
import { FileUpload } from "@/components/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResizablePanel } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/app/spaces/$spaceId/")({
  component: SpaceDetailRoute,
  beforeLoad: async () => {
    const session = await getUser();
    if (!session) {
      throw redirect({
        to: "/login",
      });
    }
    return { session };
  },
});

function SpaceDetailRoute() {
  const { spaceId } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isConversationDialogOpen, setIsConversationDialogOpen] =
    useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const createConversationMutation = useMutation(
    trpc.chat.conversation.create.mutationOptions({
      onSuccess: (newConversation) => {
        // Close dialog
        setIsConversationDialogOpen(false);
        // Navigate to the new conversation
        navigate({
          to: "/app/spaces/$spaceId/$conversationId",
          params: {
            spaceId,
            conversationId: newConversation.id,
          },
        });
      },
    })
  );

  const { data: space, isLoading: isLoadingSpace } = useQuery(
    trpc.space.getById.queryOptions({ id: spaceId })
  );

  const { data: documents } = useQuery(
    trpc.upload.listDocumentsBySpace.queryOptions({
      spaceId,
    })
  );

  const sources =
    documents?.map((doc) => ({
      id: doc.id,
      title: doc.title,
      icon: <FileText className="h-4 w-4 text-red-500" />,
      selected: false,
      fileUrl: doc.fileUrl,
      processingStatus: doc.processingStatus as DocumentStatus,
    })) ?? [];

  if (isLoadingSpace) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 font-semibold text-xl">Space not found</h2>
          <p className="text-muted-foreground">
            The space you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanel defaultSize={55} minSize={40}>
      <div className="flex h-full flex-col">
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
            {/* Main Title */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <BookOpen className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h1 className="mb-2 font-bold text-3xl">{space.name}</h1>
                    {space.description && (
                      <p className="mb-2 text-muted-foreground">
                        {space.description}
                      </p>
                    )}
                    <Badge variant="secondary">{sources.length} sources</Badge>
                  </div>
                </div>
                <Dialog
                  onOpenChange={setIsConversationDialogOpen}
                  open={isConversationDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      New Conversation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Start a New Conversation</DialogTitle>
                      <DialogDescription>
                        Create a new conversation to ask questions about your
                        sources.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label
                          className="font-medium text-sm"
                          htmlFor="conversation-title"
                        >
                          Conversation Title (optional)
                        </label>
                        <input
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          id="conversation-title"
                          placeholder="e.g., Questions about Chapter 1"
                          ref={titleInputRef}
                          type="text"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setIsConversationDialogOpen(false)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={createConversationMutation.isPending}
                          onClick={() =>
                            createConversationMutation.mutate({
                              spaceId,
                              title: titleInputRef.current?.value,
                            })
                          }
                        >
                          {createConversationMutation.isPending
                            ? "Creating..."
                            : "Create Conversation"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {sources.length > 0 ? (
                <p className="text-muted-foreground leading-relaxed">
                  Your uploaded documents will appear in the left sidebar. Start
                  by selecting a source to begin your research.
                </p>
              ) : (
                <Card className="p-8 text-center">
                  <UploadIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 font-semibold text-lg">
                    No documents yet
                  </h3>
                  <p className="mb-4 text-muted-foreground text-sm">
                    Upload your first document to start researching in this
                    space
                  </p>
                  <Dialog
                    onOpenChange={setIsUploadDialogOpen}
                    open={isUploadDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        Upload Documents
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Upload Documents</DialogTitle>
                        <DialogDescription>
                          Upload documents to add them as sources for your
                          research.
                        </DialogDescription>
                      </DialogHeader>
                      <FileUpload
                        onUploadComplete={() => setIsUploadDialogOpen(false)}
                        spaceId={spaceId}
                      />
                    </DialogContent>
                  </Dialog>
                </Card>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </ResizablePanel>
  );
}
