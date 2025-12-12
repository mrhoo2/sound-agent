/**
 * Sound Data Pattern Recognition
 * Regex patterns and extraction logic for HVAC sound specifications
 */

import type { PatternMatch, ExtractedSoundData } from "./types";

// Octave band frequency labels (various formats found in spec sheets)
const FREQUENCY_PATTERNS = {
  hz63: /(?:63\s*(?:Hz|hz|HZ)?|@?\s*63)/i,
  hz125: /(?:125\s*(?:Hz|hz|HZ)?|@?\s*125)/i,
  hz250: /(?:250\s*(?:Hz|hz|HZ)?|@?\s*250)/i,
  hz500: /(?:500\s*(?:Hz|hz|HZ)?|@?\s*500)/i,
  hz1000: /(?:1000\s*(?:Hz|hz|HZ)?|1k\s*(?:Hz|hz|HZ)?|@?\s*1000|@?\s*1k)/i,
  hz2000: /(?:2000\s*(?:Hz|hz|HZ)?|2k\s*(?:Hz|hz|HZ)?|@?\s*2000|@?\s*2k)/i,
  hz4000: /(?:4000\s*(?:Hz|hz|HZ)?|4k\s*(?:Hz|hz|HZ)?|@?\s*4000|@?\s*4k)/i,
  hz8000: /(?:8000\s*(?:Hz|hz|HZ)?|8k\s*(?:Hz|hz|HZ)?|@?\s*8000|@?\s*8k)/i,
};

// Single-number rating patterns
const RATING_PATTERNS = {
  // NC rating: "NC-35", "NC 35", "NC35", "NC: 35", "Noise Criteria: 35"
  nc: /(?:NC|N\.C\.|Noise\s*Criteria)[:\s-]*(\d{1,2})/gi,
  
  // dBA: "45 dBA", "45dBA", "45 dB(A)", "Sound Level: 45 dBA", "Lp: 45 dBA"
  dba: /(\d{1,3})\s*(?:dBA|dB\(A\)|dB-A|dB\s*A)/gi,
  
  // Sones: "2.5 sones", "2.5sones", "Sound Power: 2.5 sones"
  sones: /(\d+(?:\.\d+)?)\s*sones?/gi,
  
  // Sound power level: "LW: 65 dB", "Lw = 65", "Sound Power Level: 65"
  soundPower: /(?:LW|Lw|Sound\s*Power(?:\s*Level)?)[:\s=]*(\d{1,3})\s*(?:dB)?/gi,
  
  // Sound pressure level: "LP: 45 dB", "Lp = 45"
  soundPressure: /(?:LP|Lp|Sound\s*Pressure(?:\s*Level)?)[:\s=]*(\d{1,3})\s*(?:dB)?/gi,
};

// Equipment identifiers
const EQUIPMENT_PATTERNS = {
  // Model numbers (common HVAC formats)
  model: /(?:Model|Part|Cat\.?\s*(?:No\.?)?)[:\s#]*([A-Z0-9][-A-Z0-9]{3,})/gi,
  
  // Manufacturers
  manufacturer: /(?:Trane|Carrier|Daikin|Lennox|York|Johnson Controls|McQuay|Mitsubishi|LG|Samsung|Fujitsu)/gi,
  
  // Equipment type
  equipmentType: /(?:AHU|Air\s*Handler|RTU|Rooftop\s*Unit|FCU|Fan\s*Coil|VAV|VRF|Split\s*System|Chiller|Boiler|Pump)/gi,
};

// Operating condition patterns
const CONDITION_PATTERNS = {
  fanSpeed: /(?:Fan\s*Speed|Speed)[:\s]*(\w+)/gi,
  airflow: /(\d+(?:,\d{3})?)\s*(?:CFM|cfm|m³\/h)/gi,
  staticPressure: /(\d+(?:\.\d+)?)\s*(?:in\.?\s*w\.?g\.?|Pa|inches?\s*(?:of\s*)?water)/gi,
};

/**
 * Extract octave band data from text
 * Looks for tables or lists with frequency-value pairs
 */
export function extractOctaveBands(text: string): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  // Strategy 1: Look for tabular data with all 8 frequencies
  // Common format: "63  125  250  500  1k  2k  4k  8k" followed by values
  const tablePattern = /(?:63|Hz)\s+(?:125|Hz)\s+(?:250|Hz)\s+(?:500|Hz)\s+(?:1k|1000|Hz)\s+(?:2k|2000|Hz)\s+(?:4k|4000|Hz)\s+(?:8k|8000|Hz)[\s\S]{0,200}?(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/gi;
  
  let tableMatch;
  while ((tableMatch = tablePattern.exec(text)) !== null) {
    const values = tableMatch.slice(1, 9).map(Number);
    if (values.every(v => v >= 10 && v <= 100)) { // Reasonable dB range
      matches.push({
        pattern: "octave-band-table",
        value: JSON.stringify({
          hz63: values[0],
          hz125: values[1],
          hz250: values[2],
          hz500: values[3],
          hz1000: values[4],
          hz2000: values[5],
          hz4000: values[6],
          hz8000: values[7],
        }),
        confidence: "high",
        context: tableMatch[0].substring(0, 100),
      });
    }
  }
  
  // Strategy 2: Look for individual frequency-value pairs
  // Format: "63 Hz: 58" or "@ 125 Hz = 50 dB"
  const pairPattern = /(?:@\s*)?(\d{2,4})\s*(?:Hz|hz|HZ)?[:\s=]+(\d{1,3})\s*(?:dB)?/gi;
  
  let pairMatch;
  const frequencyValues: Record<string, number> = {};
  
  while ((pairMatch = pairPattern.exec(text)) !== null) {
    const freq = parseInt(pairMatch[1]);
    const value = parseInt(pairMatch[2]);
    
    // Map to standard frequencies
    const freqKey = mapToStandardFrequency(freq);
    if (freqKey && value >= 10 && value <= 100) {
      frequencyValues[freqKey] = value;
    }
  }
  
  if (Object.keys(frequencyValues).length >= 4) {
    matches.push({
      pattern: "octave-band-pairs",
      value: JSON.stringify(frequencyValues),
      confidence: Object.keys(frequencyValues).length >= 6 ? "high" : "medium",
      context: "Individual frequency-value pairs",
    });
  }
  
  return matches;
}

/**
 * Map various frequency representations to standard keys
 */
function mapToStandardFrequency(freq: number): string | null {
  const frequencyMap: Record<number, string> = {
    63: "hz63",
    125: "hz125",
    250: "hz250",
    500: "hz500",
    1000: "hz1000",
    1: "hz1000", // 1k
    2000: "hz2000",
    2: "hz2000", // 2k
    4000: "hz4000",
    4: "hz4000", // 4k
    8000: "hz8000",
    8: "hz8000", // 8k
  };
  return frequencyMap[freq] || null;
}

/**
 * Extract NC rating from text
 */
export function extractNCRating(text: string): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  let match;
  while ((match = RATING_PATTERNS.nc.exec(text)) !== null) {
    const value = parseInt(match[1]);
    if (value >= 15 && value <= 70) { // Valid NC range
      matches.push({
        pattern: "nc-rating",
        value,
        confidence: "high",
        context: getContext(text, match.index, 50),
      });
    }
  }
  
  // Reset regex lastIndex
  RATING_PATTERNS.nc.lastIndex = 0;
  
  return matches;
}

/**
 * Extract dBA values from text
 */
export function extractDBA(text: string): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  let match;
  while ((match = RATING_PATTERNS.dba.exec(text)) !== null) {
    const value = parseInt(match[1]);
    if (value >= 20 && value <= 90) { // Reasonable dBA range for HVAC
      matches.push({
        pattern: "dba",
        value,
        confidence: "high",
        context: getContext(text, match.index, 50),
      });
    }
  }
  
  RATING_PATTERNS.dba.lastIndex = 0;
  
  return matches;
}

/**
 * Extract sones values from text
 */
export function extractSones(text: string): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  let match;
  while ((match = RATING_PATTERNS.sones.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    if (value >= 0.1 && value <= 50) { // Reasonable sones range
      matches.push({
        pattern: "sones",
        value,
        confidence: "high",
        context: getContext(text, match.index, 50),
      });
    }
  }
  
  RATING_PATTERNS.sones.lastIndex = 0;
  
  return matches;
}

/**
 * Extract equipment information from text
 */
export function extractEquipmentInfo(text: string): {
  manufacturer?: string;
  model?: string;
  type?: string;
} {
  const info: { manufacturer?: string; model?: string; type?: string } = {};
  
  // Find manufacturer
  const mfrMatch = EQUIPMENT_PATTERNS.manufacturer.exec(text);
  if (mfrMatch) {
    info.manufacturer = mfrMatch[0];
  }
  EQUIPMENT_PATTERNS.manufacturer.lastIndex = 0;
  
  // Find model
  const modelMatch = EQUIPMENT_PATTERNS.model.exec(text);
  if (modelMatch) {
    info.model = modelMatch[1];
  }
  EQUIPMENT_PATTERNS.model.lastIndex = 0;
  
  // Find equipment type
  const typeMatch = EQUIPMENT_PATTERNS.equipmentType.exec(text);
  if (typeMatch) {
    info.type = typeMatch[0];
  }
  EQUIPMENT_PATTERNS.equipmentType.lastIndex = 0;
  
  return info;
}

/**
 * Extract all sound data from text
 */
export function extractAllSoundData(
  text: string,
  fileName: string
): ExtractedSoundData {
  const octaveBandMatches = extractOctaveBands(text);
  const ncMatches = extractNCRating(text);
  const dbaMatches = extractDBA(text);
  const sonesMatches = extractSones(text);
  const equipmentInfo = extractEquipmentInfo(text);
  
  // Determine overall confidence based on what was found
  let confidence: "high" | "medium" | "low" = "low";
  if (octaveBandMatches.length > 0 && ncMatches.length > 0) {
    confidence = "high";
  } else if (octaveBandMatches.length > 0 || ncMatches.length > 0) {
    confidence = "medium";
  }
  
  // Build result
  const result: ExtractedSoundData = {
    source: {
      fileName,
      extractedAt: new Date(),
      confidence,
    },
    rawText: text.substring(0, 500), // First 500 chars for reference
  };
  
  // Add octave bands if found
  if (octaveBandMatches.length > 0) {
    try {
      result.octaveBands = JSON.parse(octaveBandMatches[0].value as string);
    } catch {
      // Ignore parse errors
    }
  }
  
  // Add single-number ratings (use first match of each)
  if (ncMatches.length > 0) {
    result.ncRating = ncMatches[0].value as number;
  }
  if (dbaMatches.length > 0) {
    result.dba = dbaMatches[0].value as number;
  }
  if (sonesMatches.length > 0) {
    result.sones = sonesMatches[0].value as number;
  }
  
  // Add equipment info
  if (Object.keys(equipmentInfo).length > 0) {
    result.equipment = equipmentInfo;
  }
  
  return result;
}

/**
 * Get context around a match position
 */
function getContext(text: string, position: number, radius: number): string {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  return text.substring(start, end).replace(/\s+/g, " ").trim();
}

/**
 * Parse text that looks like it was copied from a spec sheet
 * Handles common formats like tab-separated or space-separated values
 */
export function parseSpecSheetText(text: string): Partial<ExtractedSoundData["octaveBands"]> | null {
  // Clean up the text
  const cleaned = text.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
  
  // Try to find 8 consecutive numbers that could be octave band values
  const numbersPattern = /\b(\d{1,3})\b/g;
  const numbers: number[] = [];
  
  let match;
  while ((match = numbersPattern.exec(cleaned)) !== null) {
    const num = parseInt(match[1]);
    // Filter for reasonable dB values
    if (num >= 10 && num <= 100) {
      numbers.push(num);
    }
  }
  
  // If we found exactly 8 numbers, assume they're octave band values
  if (numbers.length === 8) {
    return {
      hz63: numbers[0],
      hz125: numbers[1],
      hz250: numbers[2],
      hz500: numbers[3],
      hz1000: numbers[4],
      hz2000: numbers[5],
      hz4000: numbers[6],
      hz8000: numbers[7],
    };
  }
  
  // If we found more than 8, try to find a sequence with decreasing trend
  // (typical of sound data where higher frequencies have lower values)
  if (numbers.length > 8) {
    for (let i = 0; i <= numbers.length - 8; i++) {
      const sequence = numbers.slice(i, i + 8);
      // Check if it has a generally decreasing trend (with some tolerance)
      if (isLikelyOctaveBandSequence(sequence)) {
        return {
          hz63: sequence[0],
          hz125: sequence[1],
          hz250: sequence[2],
          hz500: sequence[3],
          hz1000: sequence[4],
          hz2000: sequence[5],
          hz4000: sequence[6],
          hz8000: sequence[7],
        };
      }
    }
  }
  
  return null;
}

/**
 * Check if a sequence looks like octave band data
 * Sound data typically has higher values at low frequencies
 */
function isLikelyOctaveBandSequence(values: number[]): boolean {
  if (values.length !== 8) return false;
  
  // Check if first value (63 Hz) is generally higher than last value (8 kHz)
  if (values[0] < values[7]) return false;
  
  // Check if the general trend is decreasing (allow some variation)
  let increases = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1] + 5) { // Allow small increases
      increases++;
    }
  }
  
  // Allow at most 2 significant increases
  return increases <= 2;
}
