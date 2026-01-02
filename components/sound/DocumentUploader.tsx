"use client";

/**
 * Document Uploader Component
 * Upload PDFs, images, or paste spec sheet text to extract sound data
 * Automatically uses AI vision when text extraction fails
 * Supports multiple equipment rows (e.g., Supply, Return, Casing)
 */

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, ClipboardPaste, X, Sparkles, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ParseResult, ExtractedSoundData } from "@/lib/parsing";
import { parseFile, parseText, parseSpecSheetText, parsePDFWithVision, parseImageWithVision, initializeGemini } from "@/lib/parsing";
import type { OctaveBandData } from "@/lib/conversions";

interface DocumentUploaderProps {
  onDataExtracted?: (data: ExtractedSoundData) => void;
  onOctaveBandsExtracted?: (bands: OctaveBandData) => void;
}

type UploadState = "idle" | "processing" | "success" | "error";

// Get API key from environment variable
const getApiKey = () => {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
};

/**
 * Get a display label for an extracted data row
 */
function getRowLabel(data: ExtractedSoundData, index: number): string {
  if (data.equipment?.model) {
    return data.equipment.model;
  }
  if (data.equipment?.type) {
    return data.equipment.type;
  }
  if (data.equipment?.manufacturer) {
    return data.equipment.manufacturer;
  }
  return `Row ${index + 1}`;
}

/**
 * Get data type label
 */
function getDataTypeLabel(dataType?: "soundPower" | "soundPressure"): string {
  switch (dataType) {
    case "soundPower":
      return "Sound Power (LW)";
    case "soundPressure":
      return "Sound Pressure (LP)";
    default:
      return "";
  }
}

export function DocumentUploader({ onDataExtracted, onOctaveBandsExtracted }: DocumentUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [usedAI, setUsedAI] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [showRowSelector, setShowRowSelector] = useState(false);
  
  // Check if API key is configured
  useEffect(() => {
    const apiKey = getApiKey();
    setHasApiKey(!!apiKey && apiKey !== "your_api_key_here");
    if (apiKey && apiKey !== "your_api_key_here") {
      initializeGemini(apiKey);
    }
  }, []);

  // Helper to process extracted data
  const processExtractedData = useCallback((extractedData: ExtractedSoundData) => {
    onDataExtracted?.(extractedData);
    
    if (extractedData.octaveBands) {
      const bands: OctaveBandData = {
        63: extractedData.octaveBands.hz63 ?? 0,
        125: extractedData.octaveBands.hz125 ?? 0,
        250: extractedData.octaveBands.hz250 ?? 0,
        500: extractedData.octaveBands.hz500 ?? 0,
        1000: extractedData.octaveBands.hz1000 ?? 0,
        2000: extractedData.octaveBands.hz2000 ?? 0,
        4000: extractedData.octaveBands.hz4000 ?? 0,
        8000: extractedData.octaveBands.hz8000 ?? 0,
      };
      onOctaveBandsExtracted?.(bands);
    }
  }, [onDataExtracted, onOctaveBandsExtracted]);

  // Handle row selection change
  const handleRowSelect = useCallback((index: number) => {
    setSelectedRowIndex(index);
    setShowRowSelector(false);
    if (parseResult && parseResult.data[index]) {
      processExtractedData(parseResult.data[index]);
    }
  }, [parseResult, processExtractedData]);
  
  // Handle file drop with automatic AI fallback
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploadState("processing");
    setParseResult(null);
    setUsedAI(false);
    setSelectedRowIndex(0);
    
    try {
      let result: ParseResult;
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const apiKey = getApiKey();
      
      // For images, go straight to AI (if available)
      if (isImage) {
        if (hasApiKey) {
          setUsedAI(true);
          result = await parseImageWithVision(file, apiKey);
        } else {
          result = {
            success: false,
            data: [],
            errors: ["Image files require AI extraction. Please configure NEXT_PUBLIC_GEMINI_API_KEY in .env.local"],
            warnings: [],
          };
        }
      } 
      // For PDFs, try text extraction first, then fall back to AI
      else if (isPDF) {
        result = await parseFile(file);
        
        // If text extraction failed or found no data, try AI
        if (!result.success && hasApiKey) {
          setUsedAI(true);
          result = await parsePDFWithVision(file, apiKey);
        }
      } 
      // For text/CSV files, use regular parsing
      else {
        result = await parseFile(file);
      }
      
      setParseResult(result);
      setUploadState(result.success ? "success" : "error");
      
      if (result.success && result.data.length > 0) {
        processExtractedData(result.data[0]);
      }
    } catch (error) {
      setUploadState("error");
      setParseResult({
        success: false,
        data: [],
        errors: [error instanceof Error ? error.message : "Unknown error occurred"],
        warnings: [],
      });
    }
  }, [hasApiKey, processExtractedData]);
  
  // Handle pasted text
  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;
    
    setUploadState("processing");
    setParseResult(null);
    setUsedAI(false);
    setSelectedRowIndex(0);
    
    const specSheetData = parseSpecSheetText(pasteText);
    
    if (specSheetData) {
      const extractedData: ExtractedSoundData = {
        source: {
          fileName: "pasted text",
          extractedAt: new Date(),
          confidence: "high",
        },
        octaveBands: specSheetData as ExtractedSoundData["octaveBands"],
      };
      
      const result: ParseResult = {
        success: true,
        data: [extractedData],
        errors: [],
        warnings: [],
      };
      
      setParseResult(result);
      setUploadState("success");
      processExtractedData(extractedData);
    } else {
      const result = parseText(pasteText, "pasted text");
      setParseResult(result);
      setUploadState(result.success ? "success" : "error");
      
      if (result.success && result.data.length > 0) {
        processExtractedData(result.data[0]);
      }
    }
    
    setPasteText("");
    setShowPasteInput(false);
  }, [pasteText, processExtractedData]);
  
  // Reset state
  const reset = useCallback(() => {
    setUploadState("idle");
    setParseResult(null);
    setPasteText("");
    setShowPasteInput(false);
    setUsedAI(false);
    setSelectedRowIndex(0);
    setShowRowSelector(false);
  }, []);
  
  // Dropzone configuration - accept images if API key is configured
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: hasApiKey ? {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    } : {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: uploadState === "processing",
  });

  // Get currently selected data
  const selectedData = parseResult?.data[selectedRowIndex];
  const hasMultipleRows = (parseResult?.data.length ?? 0) > 1;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#4A3AFF]" />
          Import Sound Data
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Dropzone or Paste Input */}
        {showPasteInput ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paste octave band values</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasteInput(false)}
                className="h-8 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste values here (e.g., 58 50 43 38 35 33 32 31)"
              className="w-full h-24 p-3 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[#4A3AFF]/50"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasteInput(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePaste}
                disabled={!pasteText.trim()}
                className="bg-[#4A3AFF] hover:bg-[#4A3AFF]/80"
              >
                Extract Data
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? "border-[#4A3AFF] bg-[#4A3AFF]/10" 
                  : "border-border hover:border-[#4A3AFF]/50"
                }
                ${uploadState === "processing" ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input {...getInputProps()} />
              
              {uploadState === "processing" ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-[#4A3AFF] animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing with AI...</p>
                </div>
              ) : uploadState === "success" ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-[#16DA7C]" />
                  <p className="text-sm text-[#16DA7C]">Data extracted successfully!</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="mt-2"
                  >
                    Upload another file
                  </Button>
                </div>
              ) : uploadState === "error" ? (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-[#EC4343]" />
                  <p className="text-sm text-[#EC4343]">Failed to extract data</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="mt-2"
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive 
                      ? "Drop the file here..." 
                      : "Drag & drop a spec sheet, or click to browse"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {hasApiKey 
                      ? "Supports PDF, images (PNG, JPG), TXT, CSV" 
                      : "Supports PDF, TXT, CSV files"
                    }
                  </p>
                </div>
              )}
            </div>
            
            {/* Paste button */}
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasteInput(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Or paste text from spec sheet
              </Button>
            </div>
          </>
        )}
        
        {/* Parse Result Details */}
        {parseResult && (
          <div className="space-y-3">
            {/* Errors */}
            {parseResult.errors.length > 0 && (
              <div className="p-3 bg-[#EC4343]/10 border border-[#EC4343]/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#EC4343] mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    {parseResult.errors.map((error, i) => (
                      <p key={i} className="text-[#EC4343]">{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Warnings */}
            {parseResult.warnings.length > 0 && (
              <div className="p-3 bg-[#FFCC17]/10 border border-[#FFCC17]/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FFCC17] mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    {parseResult.warnings.map((warning, i) => (
                      <p key={i} className="text-[#FFCC17]">{warning}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Multiple Row Selector */}
            {parseResult.success && hasMultipleRows && (
              <div className="relative">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Found {parseResult.data.length} equipment configurations:
                </label>
                <button
                  type="button"
                  onClick={() => setShowRowSelector(!showRowSelector)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg text-sm hover:border-[#4A3AFF]/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{getRowLabel(selectedData!, selectedRowIndex)}</span>
                    {selectedData?.dataType && (
                      <span className="text-xs text-muted-foreground">
                        ({getDataTypeLabel(selectedData.dataType)})
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showRowSelector ? "rotate-180" : ""}`} />
                </button>
                
                {showRowSelector && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                    {parseResult.data.map((row, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleRowSelect(index)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${
                          index === selectedRowIndex ? "bg-[#4A3AFF]/10 text-[#4A3AFF]" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{getRowLabel(row, index)}</span>
                          {row.dataType && (
                            <span className="text-xs text-muted-foreground">
                              ({getDataTypeLabel(row.dataType)})
                            </span>
                          )}
                        </span>
                        {index === selectedRowIndex && (
                          <CheckCircle className="w-4 h-4 text-[#4A3AFF]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Extracted Data Summary */}
            {parseResult.success && selectedData && (
              <div className="p-3 bg-[#16DA7C]/10 border border-[#16DA7C]/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#16DA7C] mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-1 flex-1">
                    <p className="text-[#16DA7C] font-medium flex items-center gap-1">
                      Extracted Data
                      {usedAI && (
                        <span className="inline-flex items-center gap-0.5 text-xs bg-[#4A3AFF]/10 text-[#4A3AFF] px-1.5 py-0.5 rounded">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </p>
                    {selectedData.octaveBands && (
                      <p className="text-foreground">
                        ✓ Octave bands: {Object.values(selectedData.octaveBands).filter(v => v !== undefined).length} frequencies
                      </p>
                    )}
                    {selectedData.ncRating && (
                      <p className="text-foreground">
                        ✓ NC Rating: NC-{selectedData.ncRating}
                      </p>
                    )}
                    {selectedData.dba && (
                      <p className="text-foreground">
                        ✓ Sound Level: {selectedData.dba} dBA
                      </p>
                    )}
                    {selectedData.sones && (
                      <p className="text-foreground">
                        ✓ Loudness: {selectedData.sones} sones
                      </p>
                    )}
                    {selectedData.equipment && (
                      <p className="text-foreground">
                        ✓ Equipment: {[
                          selectedData.equipment.manufacturer,
                          selectedData.equipment.model,
                          selectedData.equipment.type,
                        ].filter(Boolean).join(" ")}
                      </p>
                    )}
                    {selectedData.dataType && (
                      <p className="text-foreground">
                        ✓ Data Type: {getDataTypeLabel(selectedData.dataType)}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs mt-2">
                      Confidence: {selectedData.source.confidence}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
