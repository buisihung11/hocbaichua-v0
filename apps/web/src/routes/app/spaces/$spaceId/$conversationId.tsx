import { IconAlertCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ResizablePanel } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/app/spaces/$spaceId/$conversationId")({
  component: ChatRoute,
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

function ChatRoute() {
  const { spaceId, conversationId } = Route.useParams();
  const trpc = useTRPC();

  // Check if space exists and user has access
  const { data: space, isLoading: isLoadingSpace } = useQuery(
    trpc.space.getById.queryOptions({ id: spaceId })
  );

  // Check if space has any ready documents
  const { data: documents, isLoading: isLoadingDocuments } = useQuery(
    trpc.upload.listDocumentsBySpace.queryOptions({ spaceId })
  );

  // Load conversations for this space
  // const { data: conversationsData } = useQuery(
  //   trpc.chat.conversation.list.queryOptions({ spaceId })
  // );

  // // Delete conversation mutation
  // const deleteConversationMutation = useMutation(
  //   trpc.chat.conversation.delete.mutationOptions({
  //     onSuccess: () => {
  //       queryClient.invalidateQueries({
  //         queryKey: ["chat", "conversation", "list"],
  //       });
  //       // If deleted conversation was selected, clear selection
  //       if (selectedConversationId) {
  //         setSelectedConversationId(undefined);
  //       }
  //     },
  //   })
  // );

  const hasDocuments =
    documents?.some((doc) => doc.processingStatus === "READY") ?? false;

  if (isLoadingSpace || isLoadingDocuments) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <IconAlertCircle className="size-12 text-destructive" />
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-lg">Space Not Found</h3>
            <p className="text-muted-foreground text-sm">
              The space you're looking for doesn't exist or you don't have
              access to it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // const handleSelectConversation = (id: string) => {
  //   setSelectedConversationId(id);
  // };

  // const handleDeleteConversation = (id: string) => {
  //   deleteConversationMutation.mutate({ conversationId: id });
  // };

  // const handleNewConversation = () => {
  //   setSelectedConversationId(undefined);
  // };

  return (
    <ResizablePanel defaultSize={55} minSize={40}>
      <ChatInterface
        conversationId={conversationId}
        hasDocuments={hasDocuments}
        spaceId={spaceId}
      />
    </ResizablePanel>
  );
}
