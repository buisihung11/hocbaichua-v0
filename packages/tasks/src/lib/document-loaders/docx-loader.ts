/**
 * DOCX Document Loader
 * T014: Extracts text from Microsoft Word files using Unstructured.io
 */

import { type ParsedDocument, parseDocument } from "./unstructured-client";

/**
 * Loads and extracts text from a DOCX file
 *
 * @param fileBuffer - DOCX file content as Buffer
 * @param fileName - Original filename for metadata
 * @returns Parsed document with extracted text
 */
export function loadDocx(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  return parseDocument(
    fileBuffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

/**
 * Loads and extracts text from a DOC file (legacy format)
 *
 * @param fileBuffer - DOC file content as Buffer
 * @param fileName - Original filename for metadata
 * @returns Parsed document with extracted text
 */
export function loadDoc(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  return parseDocument(fileBuffer, fileName, "application/msword");
}

/**
 * Checks if a file is a Word document based on MIME type
 */
export function isWordDocument(mimeType: string): boolean {
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  );
}
