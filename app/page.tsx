"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, Trash2, Edit2, Check, X, ChevronRight, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/sound";
import { NCCurveChart } from "@/components/sound/NCCurveChart";
import { ComplianceChecker } from "@/components/sound/ComplianceChecker";
import {
  convertSoundMeasurement,
  formatSoundValue,
  SoundMeasurement,
  OctaveBandData,
  OCTAVE_BAND_FREQUENCIES,
  exceedsNC70,
  getMaxNC70Excess,
  interpolateNCCurve,
} from "@/lib/conversions";
import type { ExtractedSoundData } from "@/lib/parsing";

// Saved data item type
interface SavedDataItem {
  id: string;
  name: string;
  octaveBands: OctaveBandData;
  dataType?: "soundPower" | "soundPressure";
  source: string;
  createdAt: Date;
}

type InputMode = "sones" | "nc" | "dba" | "octave";

// Generate SVG chart for PDF report
function generateNCCurveSVG(userData: OctaveBandData, nc: number, exceeds70: boolean): string {
  const width = 600;
  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // X axis: frequencies (log scale positions)
  const xPositions = OCTAVE_BAND_FREQUENCIES.map((_, i) => 
    padding.left + (i / (OCTAVE_BAND_FREQUENCIES.length - 1)) * chartWidth
  );
  
  // Y axis: 10 to 100 dB
  const yMin = 10;
  const yMax = 100;
  const yScale = (val: number) => 
    padding.top + (1 - (val - yMin) / (yMax - yMin)) * chartHeight;
  
  // NC curves to show
  const curvesToShow = exceeds70 ? [60, 65, 70] : [
    Math.max(15, nc - 5),
    nc,
    Math.min(70, nc + 5),
  ];
  
  // Colors
  const colors = ['#94a3b8', '#4A3AFF', '#94a3b8']; // lighter, main NC, lighter
  
  // Build SVG
  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; background: white; border-radius: 6px; border: 1px solid #E5E5E5;">
      <!-- Grid lines -->
      ${[20, 40, 60, 80].map(v => `
        <line x1="${padding.left}" y1="${yScale(v)}" x2="${width - padding.right}" y2="${yScale(v)}" stroke="#E5E5E5" stroke-dasharray="2,2"/>
        <text x="${padding.left - 8}" y="${yScale(v) + 4}" text-anchor="end" font-size="10" fill="#6C6C71">${v}</text>
      `).join('')}
      
      <!-- Y axis label -->
      <text x="14" y="${height / 2}" text-anchor="middle" font-size="10" fill="#6C6C71" transform="rotate(-90, 14, ${height / 2})">Sound Level (dB)</text>
      
      <!-- X axis labels -->
      ${OCTAVE_BAND_FREQUENCIES.map((f, i) => `
        <text x="${xPositions[i]}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#6C6C71">${f >= 1000 ? `${f/1000}k` : f}</text>
      `).join('')}
      
      <!-- X axis title -->
      <text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-size="10" fill="#6C6C71">Frequency (Hz)</text>
  `;
  
  // Draw NC curves
  curvesToShow.forEach((ncValue, idx) => {
    const ncCurve = interpolateNCCurve(ncValue);
    const isMainCurve = ncValue === nc || (exceeds70 && ncValue === 70);
    const pathData = OCTAVE_BAND_FREQUENCIES.map((freq, i) => {
      const x = xPositions[i];
      const y = yScale(ncCurve[freq]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    svg += `
      <path d="${pathData}" fill="none" stroke="${colors[idx]}" stroke-width="${isMainCurve ? 2.5 : 1.5}" ${!isMainCurve ? 'stroke-dasharray="4,4"' : ''}/>
      <text x="${xPositions[7] + 5}" y="${yScale(ncCurve[8000]) + 4}" font-size="9" fill="${colors[idx]}">NC-${ncValue}</text>
    `;
  });
  
  // Draw user data points and line
  const userPathData = OCTAVE_BAND_FREQUENCIES.map((freq, i) => {
    const x = xPositions[i];
    const y = yScale(Math.min(userData[freq], 100)); // Cap at 100 for display
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  svg += `
    <path d="${userPathData}" fill="none" stroke="#EC4343" stroke-width="2"/>
    ${OCTAVE_BAND_FREQUENCIES.map((freq, i) => {
      const x = xPositions[i];
      const y = yScale(Math.min(userData[freq], 100));
      return `<circle cx="${x}" cy="${y}" r="5" fill="#EC4343" stroke="white" stroke-width="2"/>`;
    }).join('')}
  `;
  
  // Legend
  svg += `
    <rect x="${padding.left}" y="${padding.top - 15}" width="10" height="10" fill="#EC4343" rx="2"/>
    <text x="${padding.left + 14}" y="${padding.top - 7}" font-size="10" fill="#2A2A2F">Your Data</text>
    <rect x="${padding.left + 80}" y="${padding.top - 15}" width="20" height="2" fill="#4A3AFF"/>
    <text x="${padding.left + 104}" y="${padding.top - 7}" font-size="10" fill="#2A2A2F">NC Curves</text>
  `;
  
  svg += `</svg>`;
  
  return `<div style="margin-top: 16px;">${svg}</div>`;
}

export default function Home() {
  // Input state
  const [inputMode, setInputMode] = useState<InputMode>("octave");
  const [inputValue, setInputValue] = useState<string>("");
  const [octaveBands, setOctaveBands] = useState<Partial<OctaveBandData>>({});
  
  // Result state
  const [result, setResult] = useState<SoundMeasurement | null>(null);
  
  // Saved data state (CRUD)
  const [savedData, setSavedData] = useState<SavedDataItem[]>([]);
  const [selectedDataId, setSelectedDataId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  // Report generation state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Check if current result exceeds NC-70
  const exceeds70 = result?.octaveBands ? exceedsNC70(result.octaveBands) : false;
  const maxExcess = result?.octaveBands ? getMaxNC70Excess(result.octaveBands) : 0;

  const handleConvert = useCallback(() => {
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
        const bands = OCTAVE_BAND_FREQUENCIES.reduce((acc, freq) => {
          acc[freq] = octaveBands[freq] ?? 0;
          return acc;
        }, {} as OctaveBandData);
        input.octaveBands = bands;
        break;
    }

    const converted = convertSoundMeasurement(input);
    setResult(converted);
  }, [inputMode, inputValue, octaveBands]);

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
    setSelectedDataId(null);
  };

  // Handle data extracted from document uploader
  const handleDataExtracted = useCallback((data: ExtractedSoundData) => {
    if (data.octaveBands) {
      const bands: OctaveBandData = {
        63: data.octaveBands.hz63 ?? 0,
        125: data.octaveBands.hz125 ?? 0,
        250: data.octaveBands.hz250 ?? 0,
        500: data.octaveBands.hz500 ?? 0,
        1000: data.octaveBands.hz1000 ?? 0,
        2000: data.octaveBands.hz2000 ?? 0,
        4000: data.octaveBands.hz4000 ?? 0,
        8000: data.octaveBands.hz8000 ?? 0,
      };
      
      // Auto-save the extracted data
      const newItem: SavedDataItem = {
        id: crypto.randomUUID(),
        name: data.equipment?.model || data.equipment?.type || `Import ${savedData.length + 1}`,
        octaveBands: bands,
        dataType: data.dataType,
        source: data.source.fileName,
        createdAt: new Date(),
      };
      
      setSavedData(prev => [...prev, newItem]);
      setSelectedDataId(newItem.id);
      setOctaveBands(bands);
      setInputMode("octave");
      
      // Auto-convert
      const converted = convertSoundMeasurement({ octaveBands: bands });
      setResult(converted);
    }
  }, [savedData.length]);

  // CRUD operations for saved data
  const handleSelectData = (item: SavedDataItem) => {
    setSelectedDataId(item.id);
    setOctaveBands(item.octaveBands);
    setInputMode("octave");
    
    const converted = convertSoundMeasurement({ octaveBands: item.octaveBands });
    setResult(converted);
  };

  const handleDeleteData = (id: string) => {
    setSavedData(prev => prev.filter(item => item.id !== id));
    if (selectedDataId === id) {
      setSelectedDataId(null);
      setResult(null);
      setOctaveBands({});
    }
  };

  const handleStartEdit = (item: SavedDataItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const handleSaveEdit = (id: string) => {
    setSavedData(prev => prev.map(item => 
      item.id === id ? { ...item, name: editingName } : item
    ));
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleAddManualEntry = () => {
    const hasData = OCTAVE_BAND_FREQUENCIES.some(freq => (octaveBands[freq] ?? 0) > 0);
    if (!hasData) return;

    const bands = OCTAVE_BAND_FREQUENCIES.reduce((acc, freq) => {
      acc[freq] = octaveBands[freq] ?? 0;
      return acc;
    }, {} as OctaveBandData);

    const newItem: SavedDataItem = {
      id: crypto.randomUUID(),
      name: `Manual Entry ${savedData.length + 1}`,
      octaveBands: bands,
      source: "manual",
      createdAt: new Date(),
    };

    setSavedData(prev => [...prev, newItem]);
    setSelectedDataId(newItem.id);
    
    const converted = convertSoundMeasurement({ octaveBands: bands });
    setResult(converted);
  };

  // Generate PDF report for all saved data
  const handleGenerateReport = useCallback(async () => {
    if (savedData.length === 0) return;
    
    setIsGeneratingReport(true);
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to generate the report');
        return;
      }
      
      // Build report HTML
      const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      let reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sound Data Analysis Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; color: #2A2A2F; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #E5E5E5; }
            .header img { height: 28px; }
            .header h1 { font-size: 24px; font-weight: 600; }
            .header .date { color: #6C6C71; font-size: 14px; }
            .equipment-section { page-break-inside: avoid; margin-bottom: 40px; padding: 24px; background: #F9F9FA; border-radius: 8px; }
            .equipment-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #4A3AFF; }
            .equipment-meta { font-size: 12px; color: #6C6C71; margin-bottom: 16px; }
            .results-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
            .result-card { background: white; padding: 16px; border-radius: 6px; text-align: center; }
            .result-card .label { font-size: 12px; color: #6C6C71; margin-bottom: 4px; }
            .result-card .value { font-size: 20px; font-weight: 700; }
            .octave-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .octave-table th, .octave-table td { padding: 8px; text-align: center; border: 1px solid #E5E5E5; }
            .octave-table th { background: #F0F0F2; font-weight: 600; font-size: 12px; }
            .octave-table td { font-size: 14px; }
            .chart-placeholder { height: 250px; background: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6C6C71; border: 1px solid #E5E5E5; }
            .warning { background: #FEF3CD; border: 1px solid #FFEAA7; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
            .warning-text { color: #856404; font-size: 13px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E5E5; text-align: center; color: #6C6C71; font-size: 12px; }
            @media print { body { padding: 20px; } .equipment-section { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Sound Data Analysis Report</h1>
              <div class="date">Generated: ${reportDate}</div>
            </div>
            <img src="https://cdn.prod.website-files.com/66ed6fd402241302f1dafb02/66ed703fbaacce97115809fd_logo-full-color.png" alt="BuildVision" />
          </div>
      `;
      
      // Add each saved data item
      for (const item of savedData) {
        const converted = convertSoundMeasurement({ octaveBands: item.octaveBands });
        const itemExceeds70 = exceedsNC70(item.octaveBands);
        
        reportHTML += `
          <div class="equipment-section">
            <div class="equipment-title">${item.name}</div>
            <div class="equipment-meta">
              Source: ${item.source} | 
              Type: ${item.dataType === 'soundPower' ? 'Sound Power Level (LW)' : item.dataType === 'soundPressure' ? 'Sound Pressure Level (LP)' : 'Unknown'}
            </div>
            
            ${itemExceeds70 ? `
            <div class="warning">
              <div class="warning-text">⚠️ Data exceeds NC-70 scale. This may indicate Sound Power Level data.</div>
            </div>
            ` : ''}
            
            <div class="results-grid">
              <div class="result-card">
                <div class="label">NC Rating</div>
                <div class="value">${itemExceeds70 ? 'NC 70+' : `NC-${converted.nc}`}</div>
              </div>
              <div class="result-card">
                <div class="label">dBA</div>
                <div class="value">${converted.dba?.toFixed(1)} dBA</div>
              </div>
              <div class="result-card">
                <div class="label">Sones</div>
                <div class="value">${converted.sones?.toFixed(2)}</div>
              </div>
            </div>
            
            <table class="octave-table">
              <tr>
                <th>Frequency (Hz)</th>
                ${OCTAVE_BAND_FREQUENCIES.map(f => `<th>${f >= 1000 ? `${f/1000}k` : f}</th>`).join('')}
              </tr>
              <tr>
                <td><strong>Level (dB)</strong></td>
                ${OCTAVE_BAND_FREQUENCIES.map(f => `<td>${item.octaveBands[f]}</td>`).join('')}
              </tr>
            </table>
            
            ${generateNCCurveSVG(item.octaveBands, converted.nc || 70, itemExceeds70)}
          </div>
        `;
      }
      
      reportHTML += `
          <div class="footer">
            <p>Sound Agent by BuildVision • Labs Tool</p>
            <p style="margin-top: 4px;">Conversions are approximate. Verify critical calculations.</p>
          </div>
        </body>
        </html>
      `;
      
      // Write to the new window and print
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  }, [savedData]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - matches Takeoffs style */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-neutral-200 flex-shrink-0">
        {/* Left: Logo and title */}
        <div className="flex items-center gap-4">
          <img
            src="https://cdn.prod.website-files.com/66ed6fd402241302f1dafb02/66ed703fbaacce97115809fd_logo-full-color.png"
            alt="BuildVision"
            className="h-7 w-auto"
          />
          <div className="h-6 w-px bg-neutral-200" />
          <h1 className="text-lg font-semibold text-neutral-800">Sound Agent</h1>
        </div>

        {/* Right: Generate Report button */}
        <div className="flex items-center">
          <button
            onClick={() => handleGenerateReport()}
            disabled={savedData.length === 0 || isGeneratingReport}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] text-white h-8 rounded-md px-3 gap-2 bg-[#4A3AFF] hover:bg-[#3d2fe6]"
          >
            {isGeneratingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Generate Report
          </button>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Inputs */}
        <div className="w-[420px] border-r border-border flex flex-col bg-card overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Document Uploader */}
            <DocumentUploader onDataExtracted={handleDataExtracted} />

            {/* Saved Data List */}
            {savedData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Saved Data ({savedData.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {savedData.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 p-2 rounded-md transition-colors cursor-pointer ${
                        selectedDataId === item.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => handleSelectData(item)}
                    >
                      {editingId === item.id ? (
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-7 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit(item.id);
                            }}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.dataType === "soundPower" ? "Sound Power" : item.dataType === "soundPressure" ? "Sound Pressure" : item.source}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(item);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteData(item.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedDataId === item.id ? "rotate-90" : ""}`} />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Manual Input */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Manual Input</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
                  <TabsList className="grid w-full grid-cols-4 h-8">
                    <TabsTrigger value="sones" className="text-xs">Sones</TabsTrigger>
                    <TabsTrigger value="nc" className="text-xs">NC</TabsTrigger>
                    <TabsTrigger value="dba" className="text-xs">dBA</TabsTrigger>
                    <TabsTrigger value="octave" className="text-xs">Octave</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sones" className="space-y-2 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="sones-input" className="text-xs">Sones Value</Label>
                      <Input
                        id="sones-input"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 4.5"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="nc" className="space-y-2 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="nc-input" className="text-xs">NC Rating</Label>
                      <Input
                        id="nc-input"
                        type="number"
                        step="5"
                        min="15"
                        max="70"
                        placeholder="e.g., 35"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="dba" className="space-y-2 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="dba-input" className="text-xs">dBA Level</Label>
                      <Input
                        id="dba-input"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="e.g., 45"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="octave" className="space-y-2 mt-3">
                    <Label className="text-xs">Octave Band Levels (dB)</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {OCTAVE_BAND_FREQUENCIES.map((freq) => (
                        <div key={freq} className="space-y-1">
                          <Label htmlFor={`freq-${freq}`} className="text-[10px] text-muted-foreground">
                            {freq >= 1000 ? `${freq / 1000}k` : freq} Hz
                          </Label>
                          <Input
                            id={`freq-${freq}`}
                            type="number"
                            step="1"
                            placeholder="dB"
                            value={octaveBands[freq] ?? ""}
                            onChange={(e) => handleOctaveBandChange(freq, e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 mt-4">
                  <Button onClick={handleConvert} size="sm" className="flex-1">
                    Convert
                  </Button>
                  {inputMode === "octave" && (
                    <Button onClick={handleAddManualEntry} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  )}
                  <Button onClick={handleClear} size="sm" variant="ghost">
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {result ? (
            <>
              {/* NC 70+ Warning */}
              {exceeds70 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">Data Exceeds NC Rating Scale</p>
                    <p className="text-sm text-amber-600/90 mt-1">
                      Your data exceeds NC-70 by up to {Math.round(maxExcess)} dB at certain frequencies. 
                      This typically indicates <strong>Sound Power Level (LW)</strong> data rather than Sound Pressure Level (LP). 
                      NC ratings are designed for room sound pressure levels, not equipment sound power specifications.
                    </p>
                  </div>
                </div>
              )}

              {/* Conversion Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conversion Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {result.sones !== undefined && (
                      <ResultCard
                        label="Sones"
                        value={formatSoundValue(result.sones, "sones", 2)}
                        isInput={inputMode === "sones"}
                      />
                    )}
                    {result.nc !== undefined && (
                      <ResultCard
                        label="NC Rating"
                        value={exceeds70 ? "NC 70+" : formatSoundValue(result.nc, "nc")}
                        isInput={inputMode === "nc"}
                        warning={exceeds70}
                      />
                    )}
                    {result.dba !== undefined && (
                      <ResultCard
                        label="dBA"
                        value={formatSoundValue(result.dba, "dba")}
                        isInput={inputMode === "dba"}
                      />
                    )}
                  </div>

                  {result.octaveBands && (
                    <div className="mt-6">
                      <h4 className="font-medium text-sm mb-3">Octave Band Levels</h4>
                      <div className="grid grid-cols-8 gap-2">
                        {OCTAVE_BAND_FREQUENCIES.map((freq) => (
                          <div key={freq} className="text-center p-2 rounded bg-accent">
                            <div className="text-[10px] text-muted-foreground">
                              {freq >= 1000 ? `${freq / 1000}k` : freq} Hz
                            </div>
                            <div className="font-medium text-sm">
                              {result.octaveBands![freq]} dB
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* NC Curve Chart */}
              {result.octaveBands && result.nc !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">NC Curve Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NCCurveChart
                      userData={result.octaveBands}
                      height={400}
                      showCurves={exceeds70 ? [60, 65, 70] : [
                        Math.max(15, result.nc - 5),
                        result.nc,
                        Math.min(70, result.nc + 5),
                      ]}
                    />
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {exceeds70 
                        ? "Your data (circles) significantly exceeds the NC-70 curve. Consider whether this is Sound Power Level data."
                        : `Your data (circles) compared to NC curves. The solid bold curve (NC-${result.nc}) is the lowest NC rating that contains all your data.`
                      }
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* ASHRAE Compliance - pass NC-71 when exceeded so it naturally fails all room types */}
              <ComplianceChecker equipmentNC={exceeds70 ? 71 : result?.nc} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div className="max-w-md space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">No Data to Display</h2>
                <p className="text-muted-foreground">
                  Upload a sound data document, select saved data, or enter values manually to see conversion results and NC curve analysis.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border flex-shrink-0">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-micro text-muted-foreground">
            <span>Sound Agent by BuildVision • Labs Tool</span>
            <span>Conversions are approximate. Verify critical calculations.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ResultCard({
  label,
  value,
  isInput,
  warning,
}: {
  label: string;
  value: string;
  isInput: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`p-4 rounded-lg ${
      warning 
        ? "bg-amber-500/10 border border-amber-500/30" 
        : isInput 
          ? "bg-primary/10 border border-primary/20" 
          : "bg-accent"
    }`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-bold text-xl ${warning ? "text-amber-700" : ""}`}>{value}</div>
      {isInput && !warning && <span className="text-xs text-primary">Input</span>}
      {warning && <span className="text-xs text-amber-600">Exceeds Scale</span>}
    </div>
  );
}
