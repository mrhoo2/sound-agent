"use client";

/**
 * Document Uploader Component
 * Upload PDFs, images, or paste spec sheet text to extract sound data
 * Supports both text extraction and AI-powered vision analysis
 */

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, ClipboardPaste, X, Sparkles, Eye, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParseResult, ExtractedSoundData } from "@/lib/parsing";
import { parseFile, parseText, parseSpecSheetText, parsePDFWithVision, parseImageWithVision, initializeGemini, isGeminiInitialized } from "@/lib/parsing";
import type { OctaveBandData } from "@/lib/conversions";

interface DocumentUploaderProps {
  onDataExtracted?: (data: ExtractedSoundData) => void;
  onOctaveBandsExtracted?: (bands: OctaveBandData) => void;
}

type UploadState = "idle" | "processing" | "success" | "error";

// Get stored API key from localStorage
const getStoredApiKey = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("gemini_api_key") || "";
  }
  return "";
};

export function DocumentUploader({ onDataExtracted, onOctaveBandsExtracted }: DocumentUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  // Save API key to localStorage
  const saveApiKey = useCallback((key: string) => {
    setApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("gemini_api_key", key);
    }
    if (key) {
      initializeGemini(key);
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
  
  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploadState("processing");
    setParseResult(null);
    
    try {
      let result: ParseResult;
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      
      if (useAI && apiKey) {
        // Use AI-powered extraction
        if (isImage) {
          result = await parseImageWithVision(file, apiKey);
        } else if (isPDF) {
          result = await parsePDFWithVision(file, apiKey);
        } else {
          // For text files, still use regular parsing
          result = await parseFile(file);
        }
      } else {
        // Use regular text-based extraction
        result = await parseFile(file);
        
        // If no patterns found and it's a PDF or image, suggest using AI
        if (!result.success && (isPDF || isImage)) {
          result.warnings.push("No patterns found. Try enabling AI extraction for image-based documents.");
        }
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
  }, [useAI, apiKey, processExtractedData]);
  
  // Handle pasted text
  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;
    
    setUploadState("processing");
    setParseResult(null);
    
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
  }, []);
  
  // Dropzone configuration - accept images when AI is enabled
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: useAI ? {
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
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#4A3AFF]" />
            Import Sound Data
          </CardTitle>
          
          {/* AI Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={useAI ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!useAI && !apiKey) {
                  setShowApiKeyInput(true);
                }
                setUseAI(!useAI);
              }}
              className={useAI ? "bg-[#4A3AFF] hover:bg-[#4A3AFF]/80" : ""}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              AI
            </Button>
            {useAI && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="px-2"
                title="Configure API Key"
              >
                <Key className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* AI info banner */}
        {useAI && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            AI vision enabled - can extract from images & scanned PDFs
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* API Key Input */}
        {showApiKeyInput && useAI && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <Label htmlFor="api-key" className="text-sm font-medium">Gemini API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  saveApiKey(apiKey);
                  setShowApiKeyInput(false);
                }}
                disabled={!apiKey}
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get a free API key from{" "}
              <a 
                href="https://aistudio.google.com/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#4A3AFF] hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        )}
        
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
                  <p className="text-sm text-muted-foreground">
                    {useAI ? "Analyzing with AI..." : "Processing document..."}
                  </p>
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
                    {useAI 
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
                      {useAI && " (AI-powered)"}
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
