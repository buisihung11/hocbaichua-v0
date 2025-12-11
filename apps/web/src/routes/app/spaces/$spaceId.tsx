import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lightbulb,
  Plus,
  Search,
  UploadIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
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
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/app/spaces/$spaceId")({
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
  const trpc = useTRPC();
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const { data: space, isLoading: isLoadingSpace } = useQuery(
    trpc.space.getById.queryOptions({ id: spaceId })
  );

  const { data: documents, isLoading: isLoadingDocuments } = useQuery(
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
    <ResizablePanelGroup
      className="h-[calc(100vh-var(--header-height))]"
      direction="horizontal"
    >
      {/* Left Sidebar - Sources */}
      <ResizablePanel
        collapsedSize={4}
        collapsible
        defaultSize={20}
        maxSize={30}
        minSize={15}
        onCollapse={() => setIsLeftCollapsed(true)}
        onExpand={() => setIsLeftCollapsed(false)}
        ref={leftPanelRef}
      >
        <Dialog onOpenChange={setIsUploadDialogOpen} open={isUploadDialogOpen}>
          <div className="flex h-full flex-col border-r bg-background">
            {isLeftCollapsed ? (
              <div className="flex h-full flex-col items-center gap-3 py-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Expand sources"
                      onClick={() => leftPanelRef.current?.expand()}
                      size="icon"
                      variant="ghost"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expand</TooltipContent>
                </Tooltip>
                <ScrollArea className="w-full flex-1">
                  <div className="flex flex-col items-center gap-3 pb-4">
                    {sources.slice(0, 50).map((source) => (
                      <Tooltip key={source.id}>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label={source.title}
                            className="h-8 w-8"
                            size="icon"
                            variant="ghost"
                          >
                            {source.icon}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs" side="right">
                          {source.title}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </ScrollArea>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        aria-label="Upload files"
                        size="icon"
                        variant="ghost"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right">Upload files</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Sources</h2>
                    <Button
                      onClick={() => leftPanelRef.current?.collapse()}
                      size="icon"
                      variant="ghost"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>

                  <DialogTrigger asChild>
                    <Button className="w-full" variant="secondary">
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Upload files
                    </Button>
                  </DialogTrigger>

                  <div className="relative">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search sources" />
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2 px-4 pb-4">
                    {isLoadingDocuments && (
                      <div className="space-y-2">
                        {new Array(3).fill(0).map((_, i) => (
                          <Skeleton
                            className="h-16 w-full"
                            key={`skeleton-doc-${Math.random()}-${i}`}
                          />
                        ))}
                      </div>
                    )}
                    {!isLoadingDocuments && sources.length === 0 && (
                      <Card className="p-4 text-center">
                        <p className="text-muted-foreground text-sm">
                          No sources yet. Upload files to get started.
                        </p>
                      </Card>
                    )}
                    {!isLoadingDocuments &&
                      sources.length > 0 &&
                      sources.map((source) => (
                        <Card
                          className={`cursor-pointer p-3 transition-colors hover:bg-accent ${
                            source.selected ? "border-primary" : ""
                          }`}
                          key={source.id}
                        >
                          <div className="flex items-start gap-2">
                            {source.icon}
                            <p className="line-clamp-2 flex-1 text-sm">
                              {source.title}
                            </p>
                          </div>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
          {/* Shared Dialog Content */}
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
              <DialogDescription>
                Upload documents to add them as sources for your research.
              </DialogDescription>
            </DialogHeader>
            <FileUpload
              onUploadComplete={() => setIsUploadDialogOpen(false)}
              spaceId={spaceId}
            />
          </DialogContent>
        </Dialog>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Main Content Area */}
      <ResizablePanel defaultSize={55} minSize={40}>
        <div className="flex h-full flex-col">
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
              {/* Main Title */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
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

                {sources.length > 0 ? (
                  <p className="text-muted-foreground leading-relaxed">
                    Your uploaded documents will appear in the left sidebar.
                    Start by selecting a source to begin your research.
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

      <ResizableHandle withHandle />

      {/* Right Sidebar - Studio */}
      <ResizablePanel
        collapsedSize={4}
        collapsible
        defaultSize={25}
        maxSize={35}
        minSize={15}
        onCollapse={() => setIsRightCollapsed(true)}
        onExpand={() => setIsRightCollapsed(false)}
        ref={rightPanelRef}
      >
        <div className="flex h-full flex-col border-l bg-background">
          {isRightCollapsed ? (
            <div className="flex h-full flex-col items-center justify-start gap-4 py-4">
              <Button
                onClick={() => rightPanelRef.current?.expand()}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Lightbulb className="h-5 w-5" />
              <BarChart3 className="h-5 w-5" />
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Studio</h2>
                <Button
                  onClick={() => rightPanelRef.current?.collapse()}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-var(--header-height)-4rem)]">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        Audio Overview
                      </span>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        Video Overview
                      </span>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Mind Map</span>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Flashcards</span>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Quiz</span>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2 border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="mb-1 font-medium text-sm">
                          Figma's Three Phases of Infinite...
                        </p>
                        <p className="text-muted-foreground text-xs">
                          3 Sources · 23h ago
                        </p>
                      </div>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2 p-4">
                    <div className="flex items-start gap-2">
                      <BarChart3 className="mt-0.5 h-5 w-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="mb-1 font-medium text-sm">
                          Figma Database Scaling: 2020 to 2023...
                        </p>
                        <p className="text-muted-foreground text-xs">
                          3 Sources · 23h ago
                        </p>
                      </div>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
