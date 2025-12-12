# System Patterns: Sound Agent

## Architecture Overview
Sound Agent is a **standalone web application** that will be registered in BuildVision's Labs page. This allows for independent development and experimentation while maintaining a clear path for future integration.

```
sound-agent/                    # This standalone project
├── memory-bank/                # Project memory and context
├── app/                        # Next.js app (standalone)
│   ├── page.tsx               # Main Sound Agent interface
│   └── api/                   # API routes (if needed)
├── components/                 # Sound Agent UI components
├── lib/                        # Core logic
│   ├── conversions/           # Sound unit conversions
│   ├── parsing/               # Document parsing
│   └── ashrae/                # ASHRAE reference data
└── package.json

BuildVision/                    # Integration point only
└── frontend/app/dashboard/labs/
    └── labs.config.ts         # Add Sound Agent URL here
```

## Key Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Standalone web app | Independent development, easy experimentation, follows existing labs pattern (like bvtakeoffs.vercel.app) | 2025-12-12 |
| Register in Labs config | Seamless access for BuildVision users, matches existing workflow | 2025-12-12 |
| Next.js + TypeScript | Consistent with BuildVision stack, easy future integration | 2025-12-12 |
| Deploy to Vercel | Fast iteration, matches existing labs tools pattern | 2025-12-12 |

## Labs Integration Pattern
Sound Agent will be added to `BuildVision/frontend/app/dashboard/labs/labs.config.ts`:

```typescript
{
  id: "sound-agent",
  name: "Sound Agent",
  description:
    "HVAC sound analysis tool. Convert between sones, NC, dBA, and octave bands. Verify equipment compliance against design specifications.",
  url: "https://sound-agent.vercel.app", // or local dev URL
  createdBy: "BuildVision",
  userTypes: ["contractor", "representative", "manufacturer"],
  status: "beta",
}
```

## Design Patterns

### Standalone App Structure (Next.js)
- **App Router**: Using Next.js app directory structure
- **Server Components**: For initial data loading
- **Client Components**: For interactive conversion tools
- **API Routes**: For any backend logic (PDF parsing, AI calls)

### Sound Conversion Pattern
```typescript
// Core conversion interface
interface SoundValue {
  value: number;
  unit: 'sones' | 'NC' | 'dBA' | 'dB_octave';
  octaveBands?: OctaveBandData; // For dB octave band data
}

interface OctaveBandData {
  hz63: number;
  hz125: number;
  hz250: number;
  hz500: number;
  hz1000: number;
  hz2000: number;
  hz4000: number;
  hz8000: number;
}

// Conversion service pattern
class SoundConversionService {
  convertToNC(input: SoundValue): number;
  convertToSones(input: SoundValue): number;
  convertToDBA(input: SoundValue): number;
  getOctaveBands(input: SoundValue): OctaveBandData;
}
```

### Document Parsing Pattern
```typescript
// Unified document interface
interface ParsedDocument {
  source: 'pdf' | 'image' | 'url';
  extractedSoundData: SoundValue[];
  rawText?: string;
  confidence: number;
}

// Parser interface
interface DocumentParser {
  parse(input: File | string): Promise<ParsedDocument>;
}
```

### User Workflow Pattern
```typescript
type UserWorkflow = 
  | 'design-engineer'    // Get ASHRAE recommendations for space
  | 'purchaser'          // Check equipment vs spec compliance
  | 'sales-rep';         // Demonstrate product compliance

interface WorkflowContext {
  workflow: UserWorkflow;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
}
```

## Code Organization
```
sound-agent/
├── memory-bank/              # Project documentation
├── app/
│   ├── page.tsx             # Main landing/selector
│   ├── convert/             # Conversion tool
│   ├── compliance/          # Compliance checker
│   └── recommend/           # ASHRAE recommendations
├── components/
│   ├── ui/                  # Base UI components (shadcn)
│   ├── sound/               # Sound-specific components
│   │   ├── ConversionForm.tsx
│   │   ├── OctaveBandChart.tsx
│   │   └── ComplianceResult.tsx
│   └── upload/              # File upload components
├── lib/
│   ├── conversions/
│   │   ├── sones.ts
│   │   ├── nc.ts
│   │   ├── dba.ts
│   │   └── octave-bands.ts
│   ├── parsing/
│   │   ├── pdf.ts
│   │   └── image.ts
│   └── ashrae/
│       └── reference-data.ts
└── data/
    └── ashrae/              # ASHRAE reference tables
```

## Conventions
- Use TypeScript strict mode
- Follow BuildVision code style for future integration
- Use shadcn/ui for consistent component library
- Run linting and type checking before commits

## Future Integration Path
When ready for full BuildVision integration:
1. Move conversion logic to BuildVision `shared/` package
2. Create NestJS module in BuildVision backend
3. Embed Sound Agent UI in BuildVision dashboard (not just labs link)
4. Connect to BuildVision auth and project data

---
*Document architectural decisions here. This helps maintain consistency and explains "why" things are built a certain way.*
