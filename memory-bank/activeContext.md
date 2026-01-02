# Active Context: Sound Agent

## Current Session Focus
**Split-Screen Layout & NC 70+ Warning** - ✅ COMPLETE

## What Was Accomplished This Session

### 1. Gemini 2.5 Flash Vision Extraction ✅
- **Problem**: Uploading PDFs or screenshots of sound data schedules returned "No sound data found in the image"
- **Root Cause**: The Gemini prompt was too generic and didn't handle tabular sound data formats common in HVAC engineering documents
- **Solution**: Enhanced the vision-parser.ts with:
  1. Upgraded model from `gemini-2.0-flash` to `gemini-2.5-flash` (latest available)
  2. Improved extraction prompt specifically for sound data schedules
  3. Support for multiple equipment rows (Supply, Return, Casing)
  4. Data type recognition (Sound Power vs Sound Pressure Level)

### 2. NC 70+ Warning System ✅
- **Problem**: Uploaded sound power level data (with values 80-95 dB) showed NC-70 rating, which is incorrect
- **Solution**: Added `exceedsNC70()` function and warning UI:
  - Detects when data exceeds NC-70 curve values
  - Displays "NC 70+" instead of NC-70
  - Shows warning explaining data likely represents Sound Power Level (LW) not Sound Pressure Level (LP)
  - Calculates and displays max excess in dB

### 3. Split-Screen Page Layout ✅
- **Left Panel** (420px): Input options
  - Document Uploader (AI-powered extraction)
  - Saved Data List with CRUD operations
  - Manual Input (Sones/NC/dBA/Octave Bands)
- **Right Panel**: Results display
  - NC 70+ Warning (when applicable)
  - Conversion Results (Sones, NC, dBA)
  - Octave Band Levels
  - NC Curve Chart
  - ASHRAE Compliance Checker

### 4. CRUD Functionality for Uploaded Data ✅
- Auto-save extracted data from AI uploads
- Rename entries via inline editing
- Delete entries with confirmation
- Quick selection to switch between saved data sets
- Visual indicator for currently selected data

### Files Modified

#### `lib/parsing/vision-parser.ts` ✅
- Upgraded to Gemini 2.5 Flash model
- Enhanced prompt for HVAC sound data schedules:
  - Recognizes tabular formats with frequency headers (63-8000 Hz)
  - Handles row labels: Supply, Return, Casing, Inlet, Outlet, Discharge, Radiated
  - Understands equipment identifiers: AHU-1, RTU-2, FCU-3, etc.
  - Distinguishes Sound Power Level (LW) vs Sound Pressure Level (LP)
- New JSON response format supporting multiple equipment rows
- Backwards-compatible fallback for single-row responses

#### `lib/parsing/types.ts` ✅
- Added `dataType` field to `ExtractedSoundData` interface
  - Values: `"soundPower"` | `"soundPressure"`

#### `components/sound/DocumentUploader.tsx` ✅
- Added row selector dropdown for multiple extracted configurations
- When AI extracts multiple rows (e.g., Supply, Return, Casing), users can select which one to use
- Shows data type labels (Sound Power LW, Sound Pressure LP)
- Improved "Analyzing with AI..." loading state message

## Current State
- **Dev Server**: Running at `http://localhost:3000`
- **GitHub**: https://github.com/mrhoo2/sound-agent
- **TypeScript**: Compiles without errors
- **Gemini API Key**: Configured in `.env.local` as `NEXT_PUBLIC_GEMINI_API_KEY`

## Gemini Model Information
Available Gemini models (verified via API):
- `gemini-2.5-flash` - Latest Flash model (now in use)
- `gemini-2.5-pro` - Pro model
- `gemini-2.0-flash` - Previous Flash version
- `gemini-2.0-flash-exp` - Experimental version

## Test Cases

### Sample Sound Data Schedule Image
The sample image shows an "AHU-1 SOUND DATA SCHEDULE" with:
- Max Sound Power Level (dB re 10^-12 W)
- Frequencies: 63, 125, 250, 500, 1000, 2000, 4000, 8000
- Rows: Supply (83,88,93,87,86,82,83,76), Return (75,75,77,73,70,72,72,64), Casing (81,81,92,81,79,65,60,59)

Expected extraction: 3 separate rows with equipment identifiers "AHU-1 - Supply", "AHU-1 - Return", "AHU-1 - Casing"

## Technical Notes

### Enhanced Gemini Prompt Structure
```
1. Explains HVAC sound data schedules
2. Shows example table formats
3. Lists what to look for (frequencies, row labels, equipment IDs)
4. Specifies JSON output format with equipmentRows array
5. Important rules for multi-row extraction
```

### Data Flow
1. User uploads image/PDF
2. Image sent to Gemini 2.5 Flash with enhanced prompt
3. AI extracts all rows from sound data schedule
4. Each row becomes an `ExtractedSoundData` entry
5. User selects which row to use (if multiple)
6. Octave band values populate converter

## Dependencies
- `@google/generative-ai@^0.24.1` - Gemini SDK (already installed)

## Next Steps
1. Test with various sound schedule formats
2. Consider multi-page PDF support
3. Add export functionality for extracted data

---
*Last updated: January 2, 2026*
*Session: AI Vision Extraction Improvements*
