/**
 * Document Loader Factory
 * T016: Selects appropriate loader based on MIME type
 *
 * Supports:
 * - PDF files
 * - Word documents (DOC, DOCX)
 * - Plain text files (TXT, MD)
 */

import { isWordDocument, loadDoc, loadDocx } from "./docx-loader";
import { isPdf, loadPdf } from "./pdf-loader";
import { isTextFile, loadText } from "./text-loader";
import type { ParsedDocument } from "./unstructured-client";

// Re-export types
export type { DocumentElement, ParsedDocument } from "./unstructured-client";

/**
 * Supported MIME types for document extraction
 */
export const SUPPORTED_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Word documents
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  // Text files
  "text/plain",
  "text/markdown",
  "text/x-markdown",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/**
 * Checks if a MIME type is supported for document extraction
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return isPdf(mimeType) || isWordDocument(mimeType) || isTextFile(mimeType);
}

/**
 * Loads a document based on its MIME type
 *
 * @param fileBuffer - File content as Buffer
 * @param fileName - Original filename
 * @param mimeType - MIME type of the file
 * @returns Parsed document with extracted text
 * @throws Error if MIME type is not supported
 */
export async function loadDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDocument> {
  // PDF files
  if (isPdf(mimeType)) {
    return await loadPdf(fileBuffer, fileName);
  }

  // Word documents
  if (isWordDocument(mimeType)) {
    if (mimeType === "application/msword") {
      return loadDoc(fileBuffer, fileName);
    }
    return loadDocx(fileBuffer, fileName);
  }

  // Text files
  if (isTextFile(mimeType)) {
    return loadText(fileBuffer, fileName);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Gets the document type label for a MIME type
 */
export function getDocumentTypeLabel(mimeType: string): string {
  if (isPdf(mimeType)) return "PDF";
  if (isWordDocument(mimeType)) return "Word Document";
  if (isTextFile(mimeType)) return "Text File";
  return "Unknown";
}
