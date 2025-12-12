/**
 * Document Parsing Types
 * Types for PDF/document parsing and sound data extraction
 */

// Extracted sound data from a document
export interface ExtractedSoundData {
  // Source information
  source: {
    fileName: string;
    pageNumber?: number;
    extractedAt: Date;
    confidence: "high" | "medium" | "low";
  };

  // Octave band data (most valuable)
  octaveBands?: {
    hz63?: number;
    hz125?: number;
    hz250?: number;
    hz500?: number;
    hz1000?: number;
    hz2000?: number;
    hz4000?: number;
    hz8000?: number;
  };

  // Single-number ratings
  ncRating?: number;
  dba?: number;
  sones?: number;

  // Equipment information
  equipment?: {
    manufacturer?: string;
    model?: string;
    type?: string;
  };

  // Operating conditions
  conditions?: {
    fanSpeed?: string;
    airflow?: string;
    staticPressure?: string;
  };

  // Raw text for debugging/verification
  rawText?: string;
}

// Pattern match result
export interface PatternMatch {
  pattern: string;
  value: number | string;
  confidence: "high" | "medium" | "low";
  context: string; // Surrounding text for verification
}

// Parsing result
export interface ParseResult {
  success: boolean;
  data: ExtractedSoundData[];
  errors: string[];
  warnings: string[];
}

// Supported file types
export type SupportedFileType = "pdf" | "image" | "text";

export interface FileInfo {
  name: string;
  type: SupportedFileType;
  size: number;
  lastModified: Date;
}
