/**
 * Text Document Loader
 * T015: Loads plain text files directly without external API
 */

import type { ParsedDocument } from "./unstructured-client";

// Regex for splitting paragraphs - defined at module level for performance
const PARAGRAPH_SPLIT_REGEX = /\n\n+/;

/**
 * Loads and parses a plain text file
 * No external API needed - directly reads the buffer
 *
 * @param fileBuffer - Text file content as Buffer
 * @param fileName - Original filename for metadata
 * @returns Parsed document with text content
 */
export function loadText(fileBuffer: Buffer, fileName: string): ParsedDocument {
  const text = fileBuffer.toString("utf-8");

  // Simple paragraph splitting for elements
  const paragraphs = text
    .split(PARAGRAPH_SPLIT_REGEX)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const elements = paragraphs.map((p) => ({
    type: "NarrativeText",
    text: p,
    metadata: { filename: fileName },
  }));

  return {
    elements,
    text,
    metadata: {
      filename: fileName,
      elementCount: elements.length,
    },
  };
}

/**
 * Checks if a file is a plain text file based on MIME type
 */
export function isTextFile(mimeType: string): boolean {
  return (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "text/x-markdown" ||
    mimeType.startsWith("text/")
  );
}
