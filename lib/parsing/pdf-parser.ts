/**
 * PDF Parser
 * Extract text content from PDF files using pdf.js
 */

import type { ParseResult, ExtractedSoundData } from "./types";
import { extractAllSoundData } from "./patterns";

// Dynamic import for pdfjs-dist to handle Next.js SSR
let pdfjsLib: typeof import("pdfjs-dist") | null = null;

/**
 * Initialize pdf.js library (client-side only)
 */
async function initPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("PDF parsing is only available in the browser");
  }

  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    
    // Set worker source - use CDN for simplicity
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  return pdfjsLib;
}

/**
 * Extract text content from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await initPdfJs();
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  // Extract text from all pages
  const textParts: string[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Combine text items, preserving some structure
    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join(" ");
    
    textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
  }
  
  return textParts.join("\n\n");
}

/**
 * Parse a PDF file and extract sound data
 */
export async function parsePDF(file: File): Promise<ParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: ExtractedSoundData[] = [];
  
  try {
    // Extract text from PDF
    const text = await extractTextFromPDF(file);
    
    if (!text || text.trim().length === 0) {
      errors.push("No text content found in PDF. The file may be image-based.");
      return { success: false, data: [], errors, warnings };
    }
    
    // Extract sound data from text
    const soundData = extractAllSoundData(text, file.name);
    
    // Check what was found
    if (!soundData.octaveBands && !soundData.ncRating && !soundData.dba && !soundData.sones) {
      warnings.push("No sound data patterns found in the PDF text.");
    } else {
      data.push(soundData);
    }
    
    // Add warnings for partial data
    if (soundData.octaveBands) {
      const bandCount = Object.keys(soundData.octaveBands).length;
      if (bandCount < 8) {
        warnings.push(`Only found ${bandCount} of 8 octave band values.`);
      }
    }
    
    return {
      success: data.length > 0,
      data,
      errors,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Failed to parse PDF: ${message}`);
    
    return {
      success: false,
      data: [],
      errors,
      warnings,
    };
  }
}

/**
 * Parse plain text input (for paste functionality)
 */
export function parseText(text: string, sourceName: string = "pasted text"): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: ExtractedSoundData[] = [];
  
  try {
    if (!text || text.trim().length === 0) {
      errors.push("No text provided.");
      return { success: false, data: [], errors, warnings };
    }
    
    // Extract sound data from text
    const soundData = extractAllSoundData(text, sourceName);
    
    // Check what was found
    if (!soundData.octaveBands && !soundData.ncRating && !soundData.dba && !soundData.sones) {
      warnings.push("No sound data patterns recognized in the text.");
    } else {
      data.push(soundData);
    }
    
    return {
      success: data.length > 0,
      data,
      errors,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Failed to parse text: ${message}`);
    
    return {
      success: false,
      data: [],
      errors,
      warnings,
    };
  }
}

/**
 * Determine file type and parse accordingly
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // PDF files
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return parsePDF(file);
  }
  
  // Text files
  if (fileType.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
    const text = await file.text();
    return parseText(text, file.name);
  }
  
  // Unsupported file type
  return {
    success: false,
    data: [],
    errors: [`Unsupported file type: ${fileType || fileName}. Please upload a PDF or text file.`],
    warnings: [],
  };
}
