/**
 * Document Parsing Module
 * Export all parsing utilities for sound data extraction
 */

// Types
export type {
  ExtractedSoundData,
  PatternMatch,
  ParseResult,
  SupportedFileType,
  FileInfo,
} from "./types";

// Pattern recognition
export {
  extractOctaveBands,
  extractNCRating,
  extractDBA,
  extractSones,
  extractEquipmentInfo,
  extractAllSoundData,
  parseSpecSheetText,
} from "./patterns";

// PDF parsing
export {
  extractTextFromPDF,
  parsePDF,
  parseText,
  parseFile,
} from "./pdf-parser";

// Vision-based parsing (Gemini AI)
export {
  initializeGemini,
  isGeminiInitialized,
  extractSoundDataFromImage,
  fileToBase64,
  pdfPageToImage,
  parsePDFWithVision,
  parseImageWithVision,
} from "./vision-parser";
