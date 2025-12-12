"use client";

/**
 * Document Uploader Component
 * Upload PDFs or paste spec sheet text to extract sound data
 */

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, ClipboardPaste, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ParseResult, ExtractedSoundData } from "@/lib/parsing";
import { parseFile, parseText, parseSpecSheetText } from "@/lib/parsing";
import type { OctaveBandData } from "@/lib/conversions";

interface DocumentUploaderProps {
  onDataExtracted?: (data: ExtractedSoundData) => void;
  onOctaveBandsExtracted?: (bands: OctaveBandData) => void;
}

type UploadState = "idle" | "processing" | "success" | "error";

export function DocumentUploader({ onDataExtracted, onOctaveBandsExtracted }: DocumentUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState("");
  
  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploadState("processing");
    setParseResult(null);
    
    try {
      const result = await parseFile(file);
      setParseResult(result);
      setUploadState(result.success ? "success" : "error");
      
      // Callback with extracted data
      if (result.success && result.data.length > 0) {
        const extractedData = result.data[0];
        onDataExtracted?.(extractedData);
        
        // If octave bands were found, convert to OctaveBandData format
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
  }, [onDataExtracted, onOctaveBandsExtracted]);
  
  // Handle pasted text
  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;
    
    setUploadState("processing");
    setParseResult(null);
    
    // First try to parse as spec sheet text (8 numbers in a row)
    const specSheetData = parseSpecSheetText(pasteText);
    
    if (specSheetData) {
      // Successfully parsed as octave band values
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
      onDataExtracted?.(extractedData);
      
      const bands: OctaveBandData = {
        63: specSheetData.hz63 ?? 0,
        125: specSheetData.hz125 ?? 0,
        250: specSheetData.hz250 ?? 0,
        500: specSheetData.hz500 ?? 0,
        1000: specSheetData.hz1000 ?? 0,
        2000: specSheetData.hz2000 ?? 0,
        4000: specSheetData.hz4000 ?? 0,
        8000: specSheetData.hz8000 ?? 0,
      };
      onOctaveBandsExtracted?.(bands);
    } else {
      // Fall back to general pattern matching
      const result = parseText(pasteText, "pasted text");
      setParseResult(result);
      setUploadState(result.success ? "success" : "error");
      
      if (result.success && result.data.length > 0) {
        const extractedData = result.data[0];
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
      }
    }
    
    setPasteText("");
    setShowPasteInput(false);
  }, [pasteText, onDataExtracted, onOctaveBandsExtracted]);
  
  // Reset state
  const reset = useCallback(() => {
    setUploadState("idle");
    setParseResult(null);
    setPasteText("");
    setShowPasteInput(false);
  }, []);
  
  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: uploadState === "processing",
  });
  
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
                  <p className="text-sm text-muted-foreground">Processing document...</p>
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
                      : "Drag & drop a PDF spec sheet, or click to browse"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Supports PDF, TXT, CSV files
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
            
            {/* Extracted Data Summary */}
            {parseResult.success && parseResult.data.length > 0 && (
              <div className="p-3 bg-[#16DA7C]/10 border border-[#16DA7C]/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#16DA7C] mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="text-[#16DA7C] font-medium">Extracted Data:</p>
                    {parseResult.data[0].octaveBands && (
                      <p className="text-foreground">
                        ✓ Octave bands: {Object.values(parseResult.data[0].octaveBands).filter(v => v !== undefined).length} frequencies
                      </p>
                    )}
                    {parseResult.data[0].ncRating && (
                      <p className="text-foreground">
                        ✓ NC Rating: NC-{parseResult.data[0].ncRating}
                      </p>
                    )}
                    {parseResult.data[0].dba && (
                      <p className="text-foreground">
                        ✓ Sound Level: {parseResult.data[0].dba} dBA
                      </p>
                    )}
                    {parseResult.data[0].sones && (
                      <p className="text-foreground">
                        ✓ Loudness: {parseResult.data[0].sones} sones
                      </p>
                    )}
                    {parseResult.data[0].equipment && (
                      <p className="text-foreground">
                        ✓ Equipment: {[
                          parseResult.data[0].equipment.manufacturer,
                          parseResult.data[0].equipment.model,
                          parseResult.data[0].equipment.type,
                        ].filter(Boolean).join(" ")}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs mt-2">
                      Confidence: {parseResult.data[0].source.confidence}
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
