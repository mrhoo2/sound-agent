/**
 * Sound measurement types and interfaces for HVAC sound analysis
 */

// Standard octave band center frequencies (Hz)
export const OCTAVE_BAND_FREQUENCIES = [63, 125, 250, 500, 1000, 2000, 4000, 8000] as const;
export type OctaveBandFrequency = (typeof OCTAVE_BAND_FREQUENCIES)[number];

// Sound measurement unit types
export type SoundUnit = "sones" | "nc" | "dba" | "octave";

// Individual sound value with unit
export interface SoundValue {
  value: number;
  unit: SoundUnit;
}

// Octave band sound data (dB values at each frequency)
export interface OctaveBandData {
  63: number;
  125: number;
  250: number;
  500: number;
  1000: number;
  2000: number;
  4000: number;
  8000: number;
}

// Complete sound measurement that can hold all representations
export interface SoundMeasurement {
  sones?: number;
  nc?: number;
  dba?: number;
  octaveBands?: OctaveBandData;
  source?: "input" | "calculated";
}

// NC (Noise Criteria) curve data
export interface NCCurve {
  rating: number;
  values: OctaveBandData;
}

// Conversion result with confidence indicator
export interface ConversionResult {
  value: number;
  confidence: "exact" | "approximate" | "estimated";
  notes?: string;
}

// Parsed document result
export interface ParsedDocument {
  filename: string;
  measurements: SoundMeasurement[];
  rawText?: string;
  confidence: number;
  parseDate: Date;
}
