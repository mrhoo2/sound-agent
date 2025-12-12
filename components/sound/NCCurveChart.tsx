"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { NC_CURVES } from "@/lib/conversions/nc-curves";
import { OctaveBandData, OCTAVE_BAND_FREQUENCIES } from "@/lib/conversions/types";

interface NCCurveChartProps {
  /** User's octave band data to display */
  userData?: OctaveBandData;
  /** Height of the chart */
  height?: number;
  /** Show only specific NC curves */
  showCurves?: number[];
}

// Format frequency labels for display
const formatFrequency = (freq: number): string => {
  if (freq >= 1000) {
    return `${freq / 1000}k`;
  }
  return freq.toString();
};

// BuildVision-aligned NC curve colors with high contrast on white
// Using semantic colors: green (quiet/good) → yellow (moderate) → red (loud/bad)
const NC_COLORS: Record<number, string> = {
  15: "#0D9668", // Dark green - very quiet
  20: "#16DA7C", // BV Success green
  25: "#34D399", // Light green
  30: "#84CC16", // Lime
  35: "#CABD24", // Yellow-green
  40: "#FFCC17", // BV Warning yellow
  45: "#F59E0B", // Orange
  50: "#F97316", // Dark orange
  55: "#EC4343", // BV Error red
  60: "#DC2626", // Dark red
  65: "#B91C1C", // Darker red
  70: "#7F1D1D", // Very dark red
};

/**
 * Calculate the NC rating that contains all user data points
 * (i.e., the lowest NC curve where all octave band values are at or above the user data)
 */
function calculateContainingNCRating(userData: OctaveBandData): number {
  for (const curve of NC_CURVES) {
    let allContained = true;
    for (const freq of OCTAVE_BAND_FREQUENCIES) {
      if (userData[freq] > curve.values[freq]) {
        allContained = false;
        break;
      }
    }
    if (allContained) {
      return curve.rating;
    }
  }
  // If exceeds all curves, return the highest
  return 70;
}

/**
 * Calculate Y-axis domain based on data and displayed NC curves
 */
function calculateYAxisDomain(
  userData: OctaveBandData | undefined,
  showCurves: number[]
): [number, number] {
  let minValue = Infinity;
  let maxValue = -Infinity;

  // Include user data in range calculation
  if (userData) {
    for (const freq of OCTAVE_BAND_FREQUENCIES) {
      minValue = Math.min(minValue, userData[freq]);
      maxValue = Math.max(maxValue, userData[freq]);
    }
  }

  // Include displayed NC curves in range calculation
  for (const curve of NC_CURVES) {
    if (showCurves.includes(curve.rating)) {
      for (const freq of OCTAVE_BAND_FREQUENCIES) {
        minValue = Math.min(minValue, curve.values[freq]);
        maxValue = Math.max(maxValue, curve.values[freq]);
      }
    }
  }

  // Add some padding (10% on each side, rounded to nice numbers)
  const range = maxValue - minValue;
  const padding = Math.max(5, Math.ceil(range * 0.1 / 5) * 5);
  
  const yMin = Math.max(0, Math.floor((minValue - padding) / 5) * 5);
  const yMax = Math.ceil((maxValue + padding) / 5) * 5;

  return [yMin, yMax];
}

export function NCCurveChart({
  userData,
  height = 400,
  showCurves = [20, 30, 40, 50, 60],
}: NCCurveChartProps) {
  // Calculate which NC curve contains all the user data
  const containingNC = userData ? calculateContainingNCRating(userData) : null;
  
  // Calculate auto-scaled Y-axis domain
  const yAxisDomain = calculateYAxisDomain(userData, showCurves);
  
  // Transform data for Recharts
  const chartData = OCTAVE_BAND_FREQUENCIES.map((freq) => {
    const dataPoint: Record<string, number | string> = {
      frequency: formatFrequency(freq),
      freqValue: freq,
    };

    // Add NC curve values
    NC_CURVES.forEach((curve) => {
      dataPoint[`NC-${curve.rating}`] = curve.values[freq];
    });

    // Add user data if provided
    if (userData) {
      dataPoint["Your Data"] = userData[freq];
    }

    return dataPoint;
  });

  // Determine which curves to show
  const curvesToShow = showCurves.length > 0 
    ? NC_CURVES.filter(c => showCurves.includes(c.rating))
    : NC_CURVES.filter(c => [20, 30, 40, 50, 60].includes(c.rating));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
          <XAxis
            dataKey="frequency"
            tick={{ fontSize: 12, fill: "#6C6C71" }}
            axisLine={{ stroke: "#6C6C71" }}
            tickLine={{ stroke: "#6C6C71" }}
            label={{ 
              value: "Frequency (Hz)", 
              position: "bottom",
              offset: 0,
              style: { fontSize: 12, fill: "#6C6C71" }
            }}
          />
          <YAxis
            domain={yAxisDomain}
            tick={{ fontSize: 12, fill: "#6C6C71" }}
            axisLine={{ stroke: "#6C6C71" }}
            tickLine={{ stroke: "#6C6C71" }}
            label={{ 
              value: "Sound Level (dB)", 
              angle: -90, 
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 12, fill: "#6C6C71", textAnchor: "middle" }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E5EA",
              borderRadius: "8px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            labelStyle={{ fontWeight: "bold", color: "#2A2A2F" }}
          />
          <Legend 
            wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} 
            verticalAlign="bottom"
          />

          {/* NC Curves - all dashed except the containing NC which is bold/solid */}
          {curvesToShow.map((curve) => {
            const isContainingCurve = containingNC === curve.rating;
            return (
              <Line
                key={curve.rating}
                type="monotone"
                dataKey={`NC-${curve.rating}`}
                stroke={NC_COLORS[curve.rating]}
                strokeWidth={isContainingCurve ? 3 : 2}
                strokeDasharray={isContainingCurve ? undefined : "6 4"}
                dot={false}
                opacity={isContainingCurve ? 1 : 0.7}
              />
            );
          })}

          {/* User Data as Line with circular markers - BV Blue */}
          {userData && (
            <Line
              type="monotone"
              dataKey="Your Data"
              stroke="#4A3AFF"
              strokeWidth={2.5}
              dot={{ 
                r: 6, 
                fill: "#4A3AFF", 
                stroke: "#FFFFFF",
                strokeWidth: 2
              }}
              activeDot={{ 
                r: 8, 
                fill: "#4A3AFF",
                stroke: "#FFFFFF",
                strokeWidth: 2
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Simplified mini chart for quick visualization
export function NCCurveMini({
  userData,
  ncRating,
  height = 200,
}: {
  userData: OctaveBandData;
  ncRating: number;
  height?: number;
}) {
  // Find the closest standard NC curves to show
  const showCurves = [
    Math.max(15, ncRating - 5),
    ncRating,
    Math.min(70, ncRating + 5),
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

  return (
    <NCCurveChart
      userData={userData}
      height={height}
      showCurves={showCurves}
    />
  );
}

// Component showing NC curve legend/reference
export function NCCurveLegend() {
  return (
    <div className="grid grid-cols-6 gap-2 text-center">
      {[20, 30, 40, 50, 60, 70].map((nc) => (
        <div key={nc} className="flex flex-col items-center">
          <div
            className="w-4 h-4 rounded-full mb-1"
            style={{ backgroundColor: NC_COLORS[nc] }}
          />
          <span className="text-micro text-muted-foreground">NC-{nc}</span>
        </div>
      ))}
    </div>
  );
}
