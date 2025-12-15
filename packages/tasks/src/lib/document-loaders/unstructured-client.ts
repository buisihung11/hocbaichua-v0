/**
 * Unstructured.io Client Wrapper
 * T012: Client configuration for document parsing API
 *
 * Wraps the Unstructured.io API for parsing various document formats
 * (PDF, DOCX, TXT, etc.) into structured text elements.
 */

import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";

/**
 * Configuration for Unstructured.io API
 */
export const UNSTRUCTURED_CONFIG = {
  // Default API URL (can be overridden with self-hosted)
  apiUrl:
    process.env.UNSTRUCTURED_API_URL ||
    "https://api.unstructured.io/general/v0/general",
  // Maximum retries for API calls
  maxRetries: 3,
  // Timeout in milliseconds
  timeout: 120_000, // 2 minutes
} as const;

/**
 * Document element type from Unstructured.io response
 */
export type DocumentElement = {
  type: string;
  text: string;
  metadata?: {
    filename?: string;
    page_number?: number;
    coordinates?: unknown;
    [key: string]: unknown;
  };
};

/**
 * Parsed document result
 */
export type ParsedDocument = {
  elements: DocumentElement[];
  text: string;
  metadata: {
    filename: string;
    pageCount?: number;
    elementCount: number;
  };
};

/**
 * Creates an Unstructured.io client instance
 *
 * Requires UNSTRUCTURED_API_KEY environment variable
 */
export function createUnstructuredClient(): UnstructuredClient {
  const apiKey = process.env.UNSTRUCTURED_API_KEY;

  if (!apiKey) {
    throw new Error("UNSTRUCTURED_API_KEY environment variable is required");
  }

  return new UnstructuredClient({
    serverURL: UNSTRUCTURED_CONFIG.apiUrl,
    security: {
      apiKeyAuth: apiKey,
    },
  });
}

/**
 * Parses a document file using Unstructured.io API
 *
 * @param fileBuffer - The file content as a Buffer
 * @param fileName - The original file name (used for format detection)
 * @param mimeType - Optional MIME type hint
 * @returns Parsed document with text and metadata
 */
export async function parseDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ParsedDocument> {
  const client = createUnstructuredClient();

  // Convert Buffer to Blob for the API
  const blob = new Blob([fileBuffer], {
    type: mimeType || "application/octet-stream",
  });

  const response = await client.general.partition({
    partitionParameters: {
      files: {
        content: blob,
        fileName,
      },
      strategy: Strategy.Auto,
      // Include coordinates for potential highlighting features
      coordinates: false,
      // Skip table extraction for faster processing
      skipInferTableTypes: ["pdf"],
    },
  });

  // The SDK returns elements directly or in a wrapper
  // Handle both v0.x and v1.x SDK response formats
  const responseData = response as unknown as
    | {
        statusCode?: number;
        elements?: Array<{
          type?: string;
          text?: string;
          metadata?: Record<string, unknown>;
        }>;
      }
    | Array<{
        type?: string;
        text?: string;
        metadata?: Record<string, unknown>;
      }>;

  // Check if response is an array (newer SDK) or object with elements
  const elementsArray = Array.isArray(responseData)
    ? responseData
    : responseData.elements;

  if (!elementsArray) {
    throw new Error("Unstructured API returned no elements");
  }

  // Extract elements from response
  const elements: DocumentElement[] = elementsArray.map((el) => ({
    type: el.type ?? "Unknown",
    text: el.text ?? "",
    metadata: el.metadata as DocumentElement["metadata"],
  }));

  // Combine all text with proper spacing
  const text = elements
    .map((el) => el.text)
    .filter((t) => t.trim().length > 0)
    .join("\n\n");

  // Calculate page count from metadata
  const pageNumbers = elements
    .map((el) => el.metadata?.page_number)
    .filter((p): p is number => typeof p === "number");
  const pageCount =
    pageNumbers.length > 0 ? Math.max(...pageNumbers) : undefined;

  return {
    elements,
    text,
    metadata: {
      filename: fileName,
      pageCount,
      elementCount: elements.length,
    },
  };
}

/**
 * Checks if Unstructured.io API is available
 */
export function isUnstructuredConfigured(): boolean {
  return !!process.env.UNSTRUCTURED_API_KEY;
}
