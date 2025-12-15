/**
 * PDF Document Loader
 * T013: Extracts text from PDF files using Unstructured.io
 */

import { type ParsedDocument, parseDocument } from "./unstructured-client";

/**
 * Loads and extracts text from a PDF file
 *
 * @param fileBuffer - PDF file content as Buffer
 * @param fileName - Original filename for metadata
 * @returns Parsed document with extracted text
 */
export function loadPdf(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  return parseDocument(fileBuffer, fileName, "application/pdf");
}

/**
 * Checks if a file is a PDF based on MIME type
 */
export function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
