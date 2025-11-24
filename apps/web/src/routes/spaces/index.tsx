import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Plus } from "lucide-react";
import { CreateSpaceDialog } from "@/components/create-space-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/spaces/")({
  component: SpacesRoute,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
});

function SpacesRoute() {
  const trpc = useTRPC();
  const navigate = useNavigate();

  const { data: spaces, isLoading } = useQuery(trpc.space.list.queryOptions());

  const handleSpaceClick = (spaceId: string) => {
    navigate({ to: "/spaces/$spaceId", params: { spaceId } });
  };

  const handleCreateSuccess = (spaceId: string) => {
    navigate({ to: "/spaces/$spaceId", params: { spaceId } });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-3xl">Your Spaces</h1>
          <p className="text-muted-foreground">
            Organize your research with spaces
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {new Array(6).fill(0).map((_, i) => (
            <Card className="p-6" key={`skeleton-space-${Math.random()}-${i}`}>
              <Skeleton className="mb-2 h-6 w-3/4" />
              <Skeleton className="mb-4 h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Your Spaces</h1>
        <p className="text-muted-foreground">
          Organize your research with spaces
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Create Space Card */}
        <CreateSpaceDialog onSuccess={handleCreateSuccess}>
          <Card className="flex h-[200px] cursor-pointer items-center justify-center border-2 border-dashed transition-colors hover:border-primary hover:bg-accent">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-full bg-primary/10 p-3">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-muted-foreground">Create space</p>
            </div>
          </Card>
        </CreateSpaceDialog>

        {/* Space Cards */}
        {spaces?.map((space) => (
          <Card
            className="group relative h-[200px] cursor-pointer transition-all hover:shadow-lg"
            key={space.id}
            onClick={() => handleSpaceClick(space.id)}
          >
            <div className="flex h-full flex-col p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <CardTitle className="mb-1 line-clamp-2 text-xl">
                    {space.name}
                  </CardTitle>
                  {space.description && (
                    <CardDescription className="line-clamp-2">
                      {space.description}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      size="icon"
                      variant="ghost"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-auto space-y-2">
                <Badge variant="secondary">
                  {space.documentCount}{" "}
                  {space.documentCount === 1 ? "document" : "documents"}
                </Badge>
                <p className="text-muted-foreground text-xs">
                  Last viewed:{" "}
                  {formatDistanceToNow(new Date(space.updatedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {/* Empty State */}
        {spaces?.length === 0 && (
          <Card className="col-span-full p-12 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-lg">No spaces yet</h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  Create your first space to start organizing your research and
                  documents.
                </p>
              </div>
              <CreateSpaceDialog onSuccess={handleCreateSuccess}>
                <Button size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Space
                </Button>
              </CreateSpaceDialog>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
