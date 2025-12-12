/**
 * NC (Noise Criteria) Curves
 * 
 * Standard NC curves define maximum acceptable sound pressure levels
 * at each octave band frequency for a given NC rating.
 * 
 * Source: ASHRAE Handbook - HVAC Applications
 */

import { NCCurve, OctaveBandData, OCTAVE_BAND_FREQUENCIES } from "./types";

// Standard NC curve values (dB) for each rating
// Format: { rating: { 63Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz } }
export const NC_CURVES: NCCurve[] = [
  { rating: 15, values: { 63: 47, 125: 36, 250: 29, 500: 22, 1000: 17, 2000: 14, 4000: 12, 8000: 11 } },
  { rating: 20, values: { 63: 51, 125: 40, 250: 33, 500: 26, 1000: 22, 2000: 19, 4000: 17, 8000: 16 } },
  { rating: 25, values: { 63: 54, 125: 44, 250: 37, 500: 31, 1000: 27, 2000: 24, 4000: 22, 8000: 21 } },
  { rating: 30, values: { 63: 57, 125: 48, 250: 41, 500: 35, 1000: 31, 2000: 29, 4000: 28, 8000: 27 } },
  { rating: 35, values: { 63: 60, 125: 52, 250: 45, 500: 40, 1000: 36, 2000: 34, 4000: 33, 8000: 32 } },
  { rating: 40, values: { 63: 64, 125: 56, 250: 50, 500: 45, 1000: 41, 2000: 39, 4000: 38, 8000: 37 } },
  { rating: 45, values: { 63: 67, 125: 60, 250: 54, 500: 49, 1000: 46, 2000: 44, 4000: 43, 8000: 42 } },
  { rating: 50, values: { 63: 71, 125: 64, 250: 58, 500: 54, 1000: 51, 2000: 49, 4000: 48, 8000: 47 } },
  { rating: 55, values: { 63: 74, 125: 67, 250: 62, 500: 58, 1000: 56, 2000: 54, 4000: 53, 8000: 52 } },
  { rating: 60, values: { 63: 77, 125: 71, 250: 67, 500: 63, 1000: 61, 2000: 59, 4000: 58, 8000: 57 } },
  { rating: 65, values: { 63: 80, 125: 75, 250: 71, 500: 68, 1000: 66, 2000: 64, 4000: 63, 8000: 62 } },
  { rating: 70, values: { 63: 83, 125: 79, 250: 75, 500: 72, 1000: 71, 2000: 70, 4000: 69, 8000: 68 } },
];

/**
 * Get the NC curve for a specific rating
 */
export function getNCCurve(rating: number): NCCurve | undefined {
  return NC_CURVES.find((curve) => curve.rating === rating);
}

/**
 * Interpolate NC curve values for non-standard ratings (e.g., NC-32)
 */
export function interpolateNCCurve(rating: number): OctaveBandData {
  // Clamp to valid range
  const clampedRating = Math.max(15, Math.min(70, rating));
  
  // Find surrounding curves
  const lowerCurve = NC_CURVES.filter((c) => c.rating <= clampedRating).pop();
  const upperCurve = NC_CURVES.find((c) => c.rating >= clampedRating);
  
  if (!lowerCurve || !upperCurve) {
    // Fallback to closest curve
    const closest = NC_CURVES.reduce((prev, curr) =>
      Math.abs(curr.rating - clampedRating) < Math.abs(prev.rating - clampedRating) ? curr : prev
    );
    return { ...closest.values };
  }
  
  if (lowerCurve.rating === upperCurve.rating) {
    return { ...lowerCurve.values };
  }
  
  // Linear interpolation
  const t = (clampedRating - lowerCurve.rating) / (upperCurve.rating - lowerCurve.rating);
  
  const result: OctaveBandData = {
    63: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0
  };
  
  for (const freq of OCTAVE_BAND_FREQUENCIES) {
    result[freq] = Math.round(
      lowerCurve.values[freq] + t * (upperCurve.values[freq] - lowerCurve.values[freq])
    );
  }
  
  return result;
}

/**
 * Determine NC rating from octave band data
 * NC rating is the LOWEST NC curve that CONTAINS all octave band values
 * (i.e., all data points are at or below the NC curve values)
 */
export function calculateNCRating(octaveBands: OctaveBandData): number {
  for (const curve of NC_CURVES) {
    let allContained = true;
    
    for (const freq of OCTAVE_BAND_FREQUENCIES) {
      if (octaveBands[freq] > curve.values[freq]) {
        allContained = false;
        break;
      }
    }
    
    if (allContained) {
      // This is the lowest NC curve that contains all data
      return curve.rating;
    }
  }
  
  // If exceeds all curves, return the highest
  return 70;
}
