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
 * Enhanced for tabular sound schedules common in HVAC engineering documents
 */
const EXTRACTION_PROMPT = `You are an expert at reading HVAC equipment specification sheets and sound data schedules from engineering drawings.

Analyze this image and extract ALL sound-related data. Common formats include:

**SOUND DATA SCHEDULES (Tables)**
Look for tables with:
- Headers showing frequencies: 63, 125, 250, 500, 1000, 2000, 4000, 8000 Hz
- Row labels like: Supply, Return, Casing, Inlet, Outlet, Discharge, Radiated
- Equipment identifiers: AHU-1, RTU-2, FCU-3, etc.
- Sound Power Level (LW, Lw, SWL) in dB re 10^-12 W
- Sound Pressure Level (LP, Lp, SPL) in dB

**EXAMPLE TABLE FORMAT:**
| Equipment | 63 | 125 | 250 | 500 | 1000 | 2000 | 4000 | 8000 |
|-----------|----|----|-----|-----|------|------|------|------|
| Supply    | 83 | 88 | 93  | 87  | 86   | 82   | 83   | 76   |
| Return    | 75 | 75 | 77  | 73  | 70   | 72   | 72   | 64   |

**SPEC SHEETS**
Look for:
- NC Rating (Noise Criteria, e.g., NC-35)
- dBA Level (A-weighted sound level)
- Sones (perceived loudness)
- Manufacturer and model information

Return the data as JSON in this exact format:
{
  "equipmentRows": [
    {
      "equipmentId": "<equipment identifier like AHU-1 or null>",
      "componentName": "<component like Supply, Return, Casing, Inlet, Outlet, or null>",
      "dataType": "soundPower" | "soundPressure" | "unknown",
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
      "sones": <number or null>
    }
  ],
  "equipment": {
    "manufacturer": <string or null>,
    "model": <string or null>,
    "type": <string like "AHU", "RTU", "FCU", "Fan Coil", "Air Handler", or null>
  },
  "confidence": "high" | "medium" | "low",
  "notes": "<any relevant observations about the data>"
}

IMPORTANT RULES:
1. Extract EACH ROW of tabular data as a separate entry in "equipmentRows"
2. If the table shows multiple components (Supply, Return, Casing), create one entry per row
3. If values have decimals, include them
4. If a cell is empty or has a dash, use null
5. Only return valid JSON, no other text
6. Even if you can only extract partial data, return what you find with appropriate confidence level`;

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
    // Use Gemini 2.5 Flash for vision - latest model with best performance
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
    let jsonStr = text.trim();
    
    // Try to extract JSON from markdown code blocks first
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Also try to find JSON object if the response has extra text
    if (!jsonStr.startsWith("{")) {
      const jsonStart = jsonStr.indexOf("{");
      const jsonEnd = jsonStr.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
    }
    
    // Remove trailing commas before closing braces/brackets (common AI mistake)
    jsonStr = jsonStr.replace(/,(\s*[\}\]])/g, "$1");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      // Log the raw response for debugging
      console.error("Failed to parse JSON response from Gemini:", jsonStr.substring(0, 500));
      throw new Error(`Invalid JSON response from AI. The model may have returned malformed data.`);
    }

    // Build ExtractedSoundData array from the response
    const extractedDataList: ExtractedSoundData[] = [];
    const warnings: string[] = [];

    if (parsed.notes) {
      warnings.push(`AI Notes: ${parsed.notes}`);
    }

    // Process equipment rows (new multi-row format)
    if (parsed.equipmentRows && Array.isArray(parsed.equipmentRows)) {
      for (const row of parsed.equipmentRows) {
        const extractedData: ExtractedSoundData = {
          source: {
            fileName,
            extractedAt: new Date(),
            confidence: parsed.confidence || "medium",
          },
        };

        // Add equipment identifier and component name
        if (row.equipmentId || row.componentName) {
          extractedData.equipment = {
            manufacturer: parsed.equipment?.manufacturer || undefined,
            model: parsed.equipment?.model || undefined,
            type: parsed.equipment?.type || undefined,
          };
          
          // Store component info in a way the UI can use
          if (row.equipmentId) {
            extractedData.equipment.model = row.equipmentId + (row.componentName ? ` - ${row.componentName}` : "");
          } else if (row.componentName) {
            extractedData.equipment.type = row.componentName;
          }
        }

        // Add data type info
        if (row.dataType && row.dataType !== "unknown") {
          extractedData.dataType = row.dataType as "soundPower" | "soundPressure";
        }

        // Add octave bands if found
        if (row.octaveBands) {
          const bands = row.octaveBands;
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

        // Add single-number ratings from the row
        if (row.ncRating !== null && row.ncRating !== undefined) {
          extractedData.ncRating = row.ncRating;
        }
        if (row.dba !== null && row.dba !== undefined) {
          extractedData.dba = row.dba;
        }
        if (row.sones !== null && row.sones !== undefined) {
          extractedData.sones = row.sones;
        }

        // Check if this row has any useful data
        const hasData =
          extractedData.octaveBands ||
          extractedData.ncRating ||
          extractedData.dba ||
          extractedData.sones;

        if (hasData) {
          extractedDataList.push(extractedData);
        }
      }
    }
    
    // Fallback: handle old single-row format for backwards compatibility
    if (extractedDataList.length === 0 && parsed.octaveBands) {
      const extractedData: ExtractedSoundData = {
        source: {
          fileName,
          extractedAt: new Date(),
          confidence: parsed.confidence || "medium",
        },
      };

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

      if (parsed.ncRating !== null && parsed.ncRating !== undefined) {
        extractedData.ncRating = parsed.ncRating;
      }
      if (parsed.dba !== null && parsed.dba !== undefined) {
        extractedData.dba = parsed.dba;
      }
      if (parsed.sones !== null && parsed.sones !== undefined) {
        extractedData.sones = parsed.sones;
      }

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

      const hasData =
        extractedData.octaveBands ||
        extractedData.ncRating ||
        extractedData.dba ||
        extractedData.sones;

      if (hasData) {
        extractedDataList.push(extractedData);
      }
    }

    // Check if we found anything useful
    if (extractedDataList.length === 0) {
      return {
        success: false,
        data: [],
        errors: [],
        warnings: [
          "No sound data found in the image. Make sure the image clearly shows a sound data schedule or spec sheet with octave band values.",
        ],
      };
    }

    return {
      success: true,
      data: extractedDataList,
      errors: [],
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Gemini extraction error:", error);
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
