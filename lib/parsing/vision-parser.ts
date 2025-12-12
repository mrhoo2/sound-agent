/**
 * Vision-based Sound Data Extraction
 * Uses Gemini 2.5 Flash to extract sound data from images/PDFs
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedSoundData, ParseResult } from "./types";

// Initialize Gemini client (API key will be provided at runtime)
let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize the Gemini client with an API key
 */
export function initializeGemini(apiKey: string) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Check if Gemini is initialized
 */
export function isGeminiInitialized(): boolean {
  return genAI !== null;
}

/**
 * The prompt for extracting sound data from images
 */
const EXTRACTION_PROMPT = `You are analyzing an HVAC equipment specification sheet or sound data document.

Extract ALL sound-related data you can find. Look for:

1. **Octave Band Sound Levels** (dB values at frequencies: 63 Hz, 125 Hz, 250 Hz, 500 Hz, 1000 Hz, 2000 Hz, 4000 Hz, 8000 Hz)
2. **NC Rating** (Noise Criteria rating, e.g., NC-35)
3. **dBA Level** (A-weighted decibel level)
4. **Sones** (perceived loudness value)
5. **Equipment Info** (manufacturer, model number, equipment type)

Return the data as JSON in this exact format:
{
  "octaveBands": {
    "hz63": <number or null>,
    "hz125": <number or null>,
    "hz250": <number or null>,
    "hz500": <number or null>,
    "hz1000": <number or null>,
    "hz2000": <number or null>,
    "hz4000": <number or null>,
    "hz8000": <number or null>
  },
  "ncRating": <number or null>,
  "dba": <number or null>,
  "sones": <number or null>,
  "equipment": {
    "manufacturer": <string or null>,
    "model": <string or null>,
    "type": <string or null>
  },
  "confidence": "high" | "medium" | "low",
  "notes": <any relevant observations about the data>
}

If you cannot find certain data, set those fields to null. If the image doesn't contain sound data at all, return all null values with confidence "low".

IMPORTANT: Only return valid JSON, no other text.`;

/**
 * Extract sound data from an image using Gemini Vision
 */
export async function extractSoundDataFromImage(
  imageData: string, // Base64 encoded image data
  mimeType: string,
  fileName: string = "uploaded image"
): Promise<ParseResult> {
  if (!genAI) {
    return {
      success: false,
      data: [],
      errors: ["Gemini API not initialized. Please provide an API key."],
      warnings: [],
    };
  }

  try {
    // Use Gemini 2.5 Flash for vision
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType,
        },
      },
      EXTRACTION_PROMPT,
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    // Extract JSON from the response (it might have markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Build ExtractedSoundData from the response
    const extractedData: ExtractedSoundData = {
      source: {
        fileName,
        extractedAt: new Date(),
        confidence: parsed.confidence || "medium",
      },
    };

    // Add octave bands if found
    if (parsed.octaveBands) {
      const bands = parsed.octaveBands;
      const hasAnyBand = Object.values(bands).some((v) => v !== null);
      if (hasAnyBand) {
        extractedData.octaveBands = {
          hz63: bands.hz63 ?? undefined,
          hz125: bands.hz125 ?? undefined,
          hz250: bands.hz250 ?? undefined,
          hz500: bands.hz500 ?? undefined,
          hz1000: bands.hz1000 ?? undefined,
          hz2000: bands.hz2000 ?? undefined,
          hz4000: bands.hz4000 ?? undefined,
          hz8000: bands.hz8000 ?? undefined,
        };
      }
    }

    // Add single-number ratings
    if (parsed.ncRating !== null && parsed.ncRating !== undefined) {
      extractedData.ncRating = parsed.ncRating;
    }
    if (parsed.dba !== null && parsed.dba !== undefined) {
      extractedData.dba = parsed.dba;
    }
    if (parsed.sones !== null && parsed.sones !== undefined) {
      extractedData.sones = parsed.sones;
    }

    // Add equipment info
    if (parsed.equipment) {
      const eq = parsed.equipment;
      if (eq.manufacturer || eq.model || eq.type) {
        extractedData.equipment = {
          manufacturer: eq.manufacturer || undefined,
          model: eq.model || undefined,
          type: eq.type || undefined,
        };
      }
    }

    // Check if we found anything useful
    const hasData =
      extractedData.octaveBands ||
      extractedData.ncRating ||
      extractedData.dba ||
      extractedData.sones;

    const warnings: string[] = [];
    if (parsed.notes) {
      warnings.push(`AI Notes: ${parsed.notes}`);
    }

    if (!hasData) {
      return {
        success: false,
        data: [],
        errors: [],
        warnings: ["No sound data found in the image. Make sure the image shows sound specifications."],
      };
    }

    return {
      success: true,
      data: [extractedData],
      errors: [],
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      data: [],
      errors: [`Failed to analyze image with AI: ${message}`],
      warnings: [],
    };
  }
}

/**
 * Convert a File to base64 for sending to Gemini
 */
export async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve({
        data: base64,
        mimeType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert PDF page to image using canvas (for vision processing)
 * This requires pdfjs-dist to be loaded
 */
export async function pdfPageToImage(
  pdfData: ArrayBuffer,
  pageNumber: number = 1
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(pageNumber);

    // Render at 2x scale for better quality
    const scale = 2;
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    // @ts-expect-error - pdfjs types may not match exactly
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    // Convert to base64 PNG
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];

    return {
      data: base64,
      mimeType: "image/png",
    };
  } catch (error) {
    console.error("Failed to convert PDF to image:", error);
    return null;
  }
}

/**
 * Parse a PDF using vision (renders to image and analyzes with Gemini)
 */
export async function parsePDFWithVision(
  file: File,
  apiKey?: string
): Promise<ParseResult> {
  // Initialize Gemini if API key provided
  if (apiKey) {
    initializeGemini(apiKey);
  }

  if (!genAI) {
    return {
      success: false,
      data: [],
      errors: ["Please provide a Gemini API key to use AI-powered extraction."],
      warnings: [],
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert first page to image
    const imageData = await pdfPageToImage(arrayBuffer, 1);
    
    if (!imageData) {
      return {
        success: false,
        data: [],
        errors: ["Failed to render PDF page as image."],
        warnings: [],
      };
    }

    // Extract data using vision
    return extractSoundDataFromImage(imageData.data, imageData.mimeType, file.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      data: [],
      errors: [`Failed to process PDF with vision: ${message}`],
      warnings: [],
    };
  }
}

/**
 * Parse an image file using vision
 */
export async function parseImageWithVision(
  file: File,
  apiKey?: string
): Promise<ParseResult> {
  // Initialize Gemini if API key provided
  if (apiKey) {
    initializeGemini(apiKey);
  }

  if (!genAI) {
    return {
      success: false,
      data: [],
      errors: ["Please provide a Gemini API key to use AI-powered extraction."],
      warnings: [],
    };
  }

  try {
    const { data, mimeType } = await fileToBase64(file);
    return extractSoundDataFromImage(data, mimeType, file.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      data: [],
      errors: [`Failed to process image: ${message}`],
      warnings: [],
    };
  }
}
