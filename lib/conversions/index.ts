/**
 * Sound Conversions Library
 * 
 * Provides conversion functions between common HVAC sound measurement units:
 * - Sones (loudness)
 * - NC (Noise Criteria)
 * - dBA (A-weighted decibels)
 * - Octave band data (dB at each frequency)
 * 
 * Note: Many conversions are approximations due to the different nature
 * of these measurements. Use ConversionResult.confidence to indicate accuracy.
 */

import { ConversionResult, OctaveBandData, SoundMeasurement, OCTAVE_BAND_FREQUENCIES } from "./types";
import { calculateNCRating, interpolateNCCurve } from "./nc-curves";

// Re-export types and NC curve utilities
export * from "./types";
export * from "./nc-curves";

/**
 * A-weighting correction factors for octave band frequencies
 * Applied to convert flat dB to A-weighted dB (dBA)
 */
const A_WEIGHTING: Record<number, number> = {
  63: -26.2,
  125: -16.1,
  250: -8.6,
  500: -3.2,
  1000: 0,
  2000: 1.2,
  4000: 1.0,
  8000: -1.1,
};

/**
 * Convert sones to phons (loudness level)
 * Sones = 2^((phons - 40) / 10)
 * Therefore: phons = 40 + 10 * log2(sones)
 */
export function sonesToPhons(sones: number): number {
  if (sones <= 0) return 0;
  return 40 + 10 * Math.log2(sones);
}

/**
 * Convert phons to sones
 * Sones = 2^((phons - 40) / 10)
 */
export function phonsToSones(phons: number): number {
  if (phons < 40) {
    // Below 40 phons, the relationship is different
    return Math.pow(phons / 40, 2.642);
  }
  return Math.pow(2, (phons - 40) / 10);
}

/**
 * Convert sones to approximate dBA
 * This is an approximation based on typical relationships
 * 1 sone ≈ 40 dBA at 1 kHz
 */
export function sonesToDBA(sones: number): ConversionResult {
  if (sones <= 0) {
    return { value: 0, confidence: "exact" };
  }
  
  // Convert sones to phons, then approximate to dBA
  // At 1 kHz, phons ≈ dB SPL ≈ dBA
  const phons = sonesToPhons(sones);
  
  return {
    value: Math.round(phons * 10) / 10,
    confidence: "approximate",
    notes: "dBA approximated from sones via phons. Accuracy depends on frequency content.",
  };
}

/**
 * Convert dBA to approximate sones
 */
export function dbaToSones(dba: number): ConversionResult {
  if (dba <= 0) {
    return { value: 0, confidence: "exact" };
  }
  
  // Treat dBA as approximately equal to phons
  const sones = phonsToSones(dba);
  
  return {
    value: Math.round(sones * 100) / 100,
    confidence: "approximate",
    notes: "Sones approximated from dBA. Actual loudness depends on frequency content.",
  };
}

/**
 * Calculate overall dBA from octave band data
 * Uses A-weighting and logarithmic addition
 */
export function octaveBandsToDBA(octaveBands: OctaveBandData): ConversionResult {
  let sumPressureSquared = 0;
  
  for (const freq of OCTAVE_BAND_FREQUENCIES) {
    const aWeightedDB = octaveBands[freq] + A_WEIGHTING[freq];
    // Convert dB to pressure ratio squared and sum
    sumPressureSquared += Math.pow(10, aWeightedDB / 10);
  }
  
  // Convert back to dB
  const overallDBA = 10 * Math.log10(sumPressureSquared);
  
  return {
    value: Math.round(overallDBA * 10) / 10,
    confidence: "exact",
    notes: "Calculated using A-weighting factors and logarithmic addition.",
  };
}

/**
 * Convert NC rating to approximate dBA
 * Based on typical relationship: NC ≈ dBA - 5 to 7
 */
export function ncToDBA(nc: number): ConversionResult {
  // NC is typically 5-7 dB below dBA for HVAC noise
  const dba = nc + 6;
  
  return {
    value: dba,
    confidence: "approximate",
    notes: "NC to dBA approximation (NC + 6). Actual difference varies with spectrum shape.",
  };
}

/**
 * Convert dBA to approximate NC
 */
export function dbaToNC(dba: number): ConversionResult {
  const nc = dba - 6;
  
  return {
    value: Math.round(nc),
    confidence: "approximate",
    notes: "dBA to NC approximation (dBA - 6). Actual NC requires octave band analysis.",
  };
}

/**
 * Calculate NC rating from octave band data
 */
export function octaveBandsToNC(octaveBands: OctaveBandData): ConversionResult {
  const ncRating = calculateNCRating(octaveBands);
  
  return {
    value: ncRating,
    confidence: "exact",
    notes: "NC determined by comparing octave band levels to standard NC curves.",
  };
}

/**
 * Convert NC rating to approximate sones
 * Uses NC → dBA → Sones conversion chain
 */
export function ncToSones(nc: number): ConversionResult {
  const dbaResult = ncToDBA(nc);
  const sonesResult = dbaToSones(dbaResult.value);
  
  return {
    value: sonesResult.value,
    confidence: "estimated",
    notes: "Estimated via NC → dBA → Sones. Significant uncertainty.",
  };
}

/**
 * Convert sones to approximate NC
 * Uses Sones → dBA → NC conversion chain
 */
export function sonesToNC(sones: number): ConversionResult {
  const dbaResult = sonesToDBA(sones);
  const ncResult = dbaToNC(dbaResult.value);
  
  return {
    value: ncResult.value,
    confidence: "estimated",
    notes: "Estimated via Sones → dBA → NC. Significant uncertainty.",
  };
}

/**
 * Get the octave band values for a given NC rating
 */
export function ncToOctaveBands(nc: number): OctaveBandData {
  return interpolateNCCurve(nc);
}

/**
 * Convert octave band data to approximate sones
 * Uses octave bands → dBA → sones chain
 */
export function octaveBandsToSones(octaveBands: OctaveBandData): ConversionResult {
  const dbaResult = octaveBandsToDBA(octaveBands);
  const sonesResult = dbaToSones(dbaResult.value);
  
  return {
    value: sonesResult.value,
    confidence: "approximate",
    notes: "Calculated via octave bands → dBA → sones.",
  };
}

/**
 * Complete sound measurement conversion
 * Takes any input and calculates all other representations
 */
export function convertSoundMeasurement(input: Partial<SoundMeasurement>): SoundMeasurement {
  const result: SoundMeasurement = {
    source: "calculated",
  };
  
  // If octave bands provided, use them as the most accurate source
  if (input.octaveBands) {
    result.octaveBands = input.octaveBands;
    result.nc = octaveBandsToNC(input.octaveBands).value;
    result.dba = octaveBandsToDBA(input.octaveBands).value;
    result.sones = octaveBandsToSones(input.octaveBands).value;
  }
  // If NC provided
  else if (input.nc !== undefined) {
    result.nc = input.nc;
    result.dba = ncToDBA(input.nc).value;
    result.sones = ncToSones(input.nc).value;
    result.octaveBands = ncToOctaveBands(input.nc);
  }
  // If dBA provided
  else if (input.dba !== undefined) {
    result.dba = input.dba;
    result.nc = dbaToNC(input.dba).value;
    result.sones = dbaToSones(input.dba).value;
    // Can't accurately derive octave bands from dBA alone
  }
  // If sones provided
  else if (input.sones !== undefined) {
    result.sones = input.sones;
    result.dba = sonesToDBA(input.sones).value;
    result.nc = sonesToNC(input.sones).value;
    // Can't accurately derive octave bands from sones alone
  }
  
  return result;
}

/**
 * Format a sound value for display
 */
export function formatSoundValue(value: number, unit: string, precision: number = 1): string {
  const formattedValue = value.toFixed(precision);
  
  switch (unit.toLowerCase()) {
    case "sones":
      return `${formattedValue} sones`;
    case "nc":
      return `NC-${Math.round(value)}`;
    case "dba":
      return `${formattedValue} dBA`;
    default:
      return `${formattedValue} ${unit}`;
  }
}
