export interface CitationData {
  chunkId: number;
  documentTitle: string;
  excerpt: string;
  relevanceScore: number;
  citationIndex: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationData[];
  timestamp?: Date;
}
