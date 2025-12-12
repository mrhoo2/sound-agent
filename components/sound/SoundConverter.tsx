"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  convertSoundMeasurement,
  formatSoundValue,
  SoundMeasurement,
  OctaveBandData,
  OCTAVE_BAND_FREQUENCIES,
} from "@/lib/conversions";
import { NCCurveChart } from "./NCCurveChart";
import { ComplianceChecker } from "./ComplianceChecker";
import { DocumentUploader } from "./DocumentUploader";

type InputMode = "sones" | "nc" | "dba" | "octave";

export function SoundConverter() {
  const [inputMode, setInputMode] = useState<InputMode>("sones");
  const [inputValue, setInputValue] = useState<string>("");
  const [octaveBands, setOctaveBands] = useState<Partial<OctaveBandData>>({});
  const [result, setResult] = useState<SoundMeasurement | null>(null);

  const handleConvert = () => {
    let input: Partial<SoundMeasurement> = {};

    switch (inputMode) {
      case "sones":
        input.sones = parseFloat(inputValue);
        break;
      case "nc":
        input.nc = parseFloat(inputValue);
        break;
      case "dba":
        input.dba = parseFloat(inputValue);
        break;
      case "octave":
        // Validate all octave bands are filled
        const bands = OCTAVE_BAND_FREQUENCIES.reduce((acc, freq) => {
          acc[freq] = octaveBands[freq] ?? 0;
          return acc;
        }, {} as OctaveBandData);
        input.octaveBands = bands;
        break;
    }

    const converted = convertSoundMeasurement(input);
    setResult(converted);
  };

  const handleOctaveBandChange = (freq: number, value: string) => {
    setOctaveBands((prev) => ({
      ...prev,
      [freq]: parseFloat(value) || 0,
    }));
  };

  const handleClear = () => {
    setInputValue("");
    setOctaveBands({});
    setResult(null);
  };

  // Handle data extracted from document uploader
  const handleOctaveBandsExtracted = useCallback((bands: OctaveBandData) => {
    // Set the octave bands
    setOctaveBands(bands);
    // Switch to octave bands tab
    setInputMode("octave");
    // Auto-convert the data
    const converted = convertSoundMeasurement({ octaveBands: bands });
    setResult(converted);
  }, []);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-h5 font-bold">Sound Unit Converter</CardTitle>
        <CardDescription className="text-body-sm text-muted-foreground">
          Convert between sones, NC ratings, dBA, and octave band data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sones">Sones</TabsTrigger>
            <TabsTrigger value="nc">NC</TabsTrigger>
            <TabsTrigger value="dba">dBA</TabsTrigger>
            <TabsTrigger value="octave">Octave Bands</TabsTrigger>
          </TabsList>

          <TabsContent value="sones" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sones-input">Sones Value</Label>
              <Input
                id="sones-input"
                type="number"
                step="0.1"
                min="0"
                placeholder="Enter sones (e.g., 4.5)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <p className="text-micro text-muted-foreground">
                Sones measure perceived loudness. 1 sone = loudness of 40 dB at 1 kHz.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="nc" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nc-input">NC Rating</Label>
              <Input
                id="nc-input"
                type="number"
                step="5"
                min="15"
                max="70"
                placeholder="Enter NC rating (e.g., 35)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <p className="text-micro text-muted-foreground">
                NC (Noise Criteria) ratings range from NC-15 (very quiet) to NC-70 (very loud).
              </p>
            </div>
          </TabsContent>

          <TabsContent value="dba" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dba-input">dBA Level</Label>
              <Input
                id="dba-input"
                type="number"
                step="1"
                min="0"
                placeholder="Enter dBA (e.g., 45)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <p className="text-micro text-muted-foreground">
                A-weighted decibels account for human hearing sensitivity across frequencies.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="octave" className="space-y-4">
            <div className="space-y-2">
              <Label>Octave Band Levels (dB)</Label>
              <div className="grid grid-cols-4 gap-2">
                {OCTAVE_BAND_FREQUENCIES.map((freq) => (
                  <div key={freq} className="space-y-1">
                    <Label htmlFor={`freq-${freq}`} className="text-micro">
                      {freq >= 1000 ? `${freq / 1000}k` : freq} Hz
                    </Label>
                    <Input
                      id={`freq-${freq}`}
                      type="number"
                      step="1"
                      placeholder="dB"
                      value={octaveBands[freq] ?? ""}
                      onChange={(e) => handleOctaveBandChange(freq, e.target.value)}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
              <p className="text-micro text-muted-foreground">
                Enter dB values at each octave band center frequency.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleConvert} className="flex-1">
            Convert
          </Button>
          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-4 rounded-lg bg-accent/50 space-y-3">
            <h3 className="font-bold text-body-sm">Conversion Results</h3>
            <div className="grid grid-cols-2 gap-4">
              {result.sones !== undefined && (
                <ResultItem
                  label="Sones"
                  value={formatSoundValue(result.sones, "sones", 2)}
                  isInput={inputMode === "sones"}
                />
              )}
              {result.nc !== undefined && (
                <ResultItem
                  label="NC Rating"
                  value={formatSoundValue(result.nc, "nc")}
                  isInput={inputMode === "nc"}
                />
              )}
              {result.dba !== undefined && (
                <ResultItem
                  label="dBA"
                  value={formatSoundValue(result.dba, "dba")}
                  isInput={inputMode === "dba"}
                />
              )}
            </div>

            {result.octaveBands && (
              <div className="mt-4">
                <h4 className="font-medium text-detail mb-2">Octave Band Levels</h4>
                <div className="grid grid-cols-4 gap-2">
                  {OCTAVE_BAND_FREQUENCIES.map((freq) => (
                    <div key={freq} className="text-center p-2 rounded bg-background">
                      <div className="text-micro text-muted-foreground">
                        {freq >= 1000 ? `${freq / 1000}k` : freq} Hz
                      </div>
                      <div className="font-medium text-detail">
                        {result.octaveBands![freq]} dB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NC Curve Visualization */}
            {result.octaveBands && result.nc !== undefined && (
              <div className="mt-6">
                <h4 className="font-medium text-detail mb-2">NC Curve Comparison</h4>
                <div className="bg-background rounded-lg p-4">
                  <NCCurveChart
                    userData={result.octaveBands}
                    height={350}
                    showCurves={[
                      Math.max(15, result.nc - 5),
                      result.nc,
                      Math.min(70, result.nc + 5),
                    ]}
                  />
                  <p className="text-micro text-muted-foreground mt-2 text-center">
                    Your data (circles) compared to NC curves. The solid bold curve (NC-{result.nc}) is the lowest NC rating that contains all your data.
                  </p>
                </div>
              </div>
            )}

            <p className="text-micro text-muted-foreground mt-2">
              Note: Some conversions are approximate. NC ↔ dBA uses typical +6 dB relationship.
              Sones conversions use phon scale approximations.
            </p>
          </div>
        )}

        {/* ASHRAE Compliance Checker */}
        <div className="mt-6">
          <ComplianceChecker equipmentNC={result?.nc} />
        </div>

        {/* Document Uploader */}
        <div className="mt-6">
          <DocumentUploader onOctaveBandsExtracted={handleOctaveBandsExtracted} />
        </div>
      </CardContent>
    </Card>
  );
}

function ResultItem({
  label,
  value,
  isInput,
}: {
  label: string;
  value: string;
  isInput: boolean;
}) {
  return (
    <div className={`p-3 rounded-md ${isInput ? "bg-primary/10 border border-primary/20" : "bg-background"}`}>
      <div className="text-micro text-muted-foreground">{label}</div>
      <div className="font-bold text-body-md">{value}</div>
      {isInput && <span className="text-micro text-primary">Input</span>}
    </div>
  );
}
