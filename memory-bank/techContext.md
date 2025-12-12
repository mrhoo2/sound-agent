# Tech Context: Sound Agent

## Project Type
**Standalone Next.js web application** that integrates with BuildVision via the Labs page.

## Style Guide Reference
**Location:** `../Local References/bv-style-guide.md`

Key design tokens:
- **Primary Brand Color:** #4A3AFF (BV Blue)
- **Font Family:** Inter
- **Primary Text:** #2A2A2F (Neutral 800)
- **Secondary Text:** #6C6C71 (Neutral 600)
- **Success:** #16DA7C (Green 400)
- **Warning:** #FFCC17 (Yellow 400)
- **Error:** #EC4343 (Red 400)

## Technologies Used

### Core Stack
- **TypeScript** - Strict mode, no `any` types
- **Next.js 14+** - App Router, React Server Components
- **React 18+** - UI framework
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library (consistent with BuildVision)

### Package Manager
- **Bun** - For consistency with BuildVision (can also use npm/pnpm)

### Potential Dependencies
| Dependency | Purpose | Status |
|------------|---------|--------|
| `@anthropic-ai/sdk` or `openai` | AI for document understanding | TBD |
| `pdf-parse` or `pdfjs-dist` | PDF text extraction | TBD |
| `recharts` or `chart.js` | Octave band visualizations | TBD |
| `zod` | Input validation | Recommended |
| `react-dropzone` | File upload handling | TBD |

## Development Setup
```bash
# From sound-agent directory
bun install          # Install dependencies
bun dev              # Start development server (localhost:3000)

# Code quality (before commits)
bun lint             # Fix formatting
bun typecheck        # Check TypeScript
```

## Project Initialization
```bash
# If starting fresh (not yet done)
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false
bunx shadcn-ui@latest init
```

## Environment Requirements
- Node.js 20+ (or Bun runtime)
- Bun package manager (recommended)

## Environment Variables
```env
# .env.local (create this file)
# API keys for AI services (if using)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Deployment
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment
- **Target**: Vercel (free tier works for labs/experimental)
- **URL Pattern**: `https://sound-agent.vercel.app` (or similar)
- **CI/CD**: Vercel auto-deploys from main branch

## BuildVision Integration
To make Sound Agent accessible in BuildVision Labs:

1. Add entry to `BuildVision/frontend/app/dashboard/labs/labs.config.ts`
2. Set appropriate `userTypes` (contractor, representative, manufacturer)
3. Set `status` to "beta" initially

```typescript
{
  id: "sound-agent",
  name: "Sound Agent",
  description: "HVAC sound analysis tool...",
  url: "https://sound-agent.vercel.app",
  createdBy: "BuildVision",
  userTypes: ["contractor", "representative", "manufacturer"],
  status: "beta",
}
```

## Code Quality Standards
- TypeScript strict mode
- No `any` types
- ESLint + Prettier
- Consistent with BuildVision conventions for future migration

## Technical Constraints
- Must work as standalone (no BuildVision backend dependencies)
- Should use same UI library (shadcn) for visual consistency
- File uploads limited by Vercel serverless function limits (4.5MB on free tier)
- Consider using edge functions for larger file processing

---
*Keep this updated as the tech stack evolves. It's essential for onboarding and troubleshooting.*
