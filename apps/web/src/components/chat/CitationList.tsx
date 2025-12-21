import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import type { CitationData } from "./chat.types";

interface CitationListProps {
  citations: CitationData[];
  onNavigate?: (chunkId: number) => void;
}

export function CitationList({ citations, onNavigate }: CitationListProps) {
  if (citations.length === 0) {
    return null;
  }

  // Group citations by document title
  const citationsByDocument = citations.reduce(
    (acc, citation) => {
      if (!acc[citation.documentTitle]) {
        acc[citation.documentTitle] = [];
      }
      acc[citation.documentTitle].push(citation);
      return acc;
    },
    {} as Record<string, CitationData[]>
  );

  const uniqueDocuments = Object.keys(citationsByDocument);

  return (
    <Sources>
      <SourcesTrigger count={citations.length}>
        <p className="font-medium">
          {citations.length} source{citations.length !== 1 ? "s" : ""} from{" "}
          {uniqueDocuments.length} document
          {uniqueDocuments.length !== 1 ? "s" : ""}
        </p>
      </SourcesTrigger>
      <SourcesContent>
        {uniqueDocuments.map((documentTitle) => {
          const documentCitations = citationsByDocument[documentTitle];
          return documentCitations?.map((citation) => (
            <Source
              href="#"
              key={citation.chunkId}
              onClick={(e) => {
                e.preventDefault();
                onNavigate?.(citation.chunkId);
              }}
              title={citation.documentTitle}
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium">{citation.documentTitle}</span>
                <span className="line-clamp-2 text-muted-foreground text-xs">
                  {citation.excerpt}
                </span>
                <span className="text-muted-foreground text-xs">
                  Relevance: {(citation.relevanceScore * 100).toFixed(0)}%
                </span>
              </div>
            </Source>
          ));
        })}
      </SourcesContent>
    </Sources>
  );
}
