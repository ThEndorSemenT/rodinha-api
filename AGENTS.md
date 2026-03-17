# AGENTS.md - Development Guidelines for Agentic Coders

This document provides essential guidelines and commands for agents working on the Rodinha API codebase.

## Quick Reference

**Tech Stack:**
- Next.js 15.5.13 with React 19.2.4
- TypeScript 5 with strict mode enabled
- Node.js runtime (ES2017 target)
- Pinata IPFS API integration
- **Package Manager:** pnpm (primary)

## Build, Lint & Test Commands

### Development
```bash
pnpm install         # Install dependencies (primary package manager)
pnpm run dev         # Start Next.js dev server with Turbo (http://localhost:3000)
```

### Production
```bash
pnpm run build       # Build for production (outputs to .next/)
pnpm start           # Start production server
```

### Type Checking
```bash
npx tsc --noEmit     # Check TypeScript types without emitting
```

**Note:** No explicit test or lint commands are configured. Use TypeScript compiler and manual code review.

## Code Style Guidelines

### Imports & Module System
- Use **ES6 module syntax** (`import`/`export`)
- Import types with `import type` for type-only imports
- Group imports: Next.js → external libs → internal modules
- Use path alias `@/*` for imports (configured in tsconfig.json)
- Example:
  ```typescript
  import type { Metadata } from "next";
  import { NextResponse } from "next/server";
  ```

### Formatting & Structure
- Use **2-space indentation** (inferred from existing code)
- Line length: follow readability (no strict limit observed)
- Use single quotes in JavaScript, double quotes in TypeScript type definitions
- Format: no explicit Prettier config found, maintain consistency with existing files

### Types & TypeScript
- **Strict mode enabled** (`strict: true` in tsconfig.json)
- Use `Readonly<T>` for immutable prop types
- Type exports with `export const metadata: Type`
- Type imports: `import type { Type } from "module"`
- Avoid `any` type; use specific types or generics
- Use JSX in `.tsx` files, preserve JSX mode

### Naming Conventions
- **Components:** PascalCase (e.g., `RootLayout`, `MusicPlayer`)
- **Functions:** camelCase (e.g., `handleClick`, `fetchTracks`)
- **Constants:** UPPER_SNAKE_CASE for env vars (e.g., `PINATA_JWT`)
- **Files:** use lowercase with hyphens for routes (e.g., `route.js`, `layout.tsx`)
- **Variables:** camelCase (e.g., `allowedOrigins`, `tracks`)

### Error Handling
- Use try-catch blocks in async functions
- Return NextResponse with appropriate HTTP status codes:
  ```typescript
  NextResponse.json({ error: "message" }, { status: 500 })
  ```
- Convert errors to strings before returning: `String(err)`
- Validate environment variables early and return 500 if missing
- Example:
  ```typescript
  try {
    // operation
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  ```

### API Route Patterns
- Use Next.js 15 App Router conventions (app/api/[...]/route.js)
- Export named functions: `GET`, `POST`, `OPTIONS`, etc.
- Handle CORS with response headers:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Headers`
- Include OPTIONS handler for preflight requests
- Validate query params: `url.searchParams.get('param')`

### Caching Strategy
- Use `Cache-Control` headers to optimize browser and CDN caching
- Define cache duration as a configurable constant (e.g., `CACHE_MAX_AGE`)
- Example for 5-minute cache:
  ```javascript
  const CACHE_MAX_AGE = 300; // seconds
  response.headers.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE}`);
  ```
- Cache directives:
  - `public`: Response can be cached by browsers, CDNs, and proxies
  - `max-age=N`: Cache valid for N seconds before browser re-fetches
  - `no-cache`: Browser must validate freshness before using cache
  - `no-store`: Do not cache at all (use for sensitive/dynamic data)
- Current implementation: Pinata tracks endpoint (`app/api/pinata/tracks/route.js`) caches for 5 minutes to reduce API load

### Comments & Documentation
- Use comments to explain **why**, not what
- Document server-side secrets: "do NOT expose this to the client"
- Comment complex business logic (e.g., Pinata file mapping)
- Use clear variable names to minimize need for comments

### Environment Variables
- Prefix with service name: `PINATA_JWT`, `DATABASE_URL`, etc.
- Store in `.env.local` (not committed)
- Validate presence in API routes before use
- Never log or expose sensitive values

## Project Structure

```
app/
├── layout.tsx          # Root layout with metadata
└── api/
    └── pinata/
        └── tracks/
            └── route.js # API route for fetching Pinata tracks
```

## Key Integration Points

**Pinata API (app/api/pinata/tracks/route.js:app/api/pinata/tracks/route.js):**
- Proxies Pinata public files endpoint
- Requires `PINATA_JWT` environment variable
- Maps Pinata file objects to track format (name, artist, url)
- Supports `?group=` query parameter
- Handles CORS for allowed origins
- Returns filtered audio files only

## Configuration Files

- **tsconfig.json**: Strict TypeScript, ES2017 target, path alias `@/*`
- **next.config.ts**: Minimal config, extensible for future needs
- **package.json**: Primary scripts (dev, build, start)
- **.env.local**: Runtime secrets (not versioned)

## Common Tasks

**Add new API endpoint:**
1. Create `app/api/[feature]/route.js` (or `.ts`)
2. Export GET/POST/OPTIONS functions
3. Add error handling and CORS headers
4. Document required env vars in comments

**Update TypeScript configuration:**
1. Edit `tsconfig.json` under `compilerOptions`
2. Run `npx tsc --noEmit` to verify changes
3. Update path aliases as needed

**Debug API routes:**
1. Add console logging to route handlers
2. Run `npm run dev` to see output in terminal
3. Use browser DevTools Network tab for response inspection

## Notes for Agents

- This is a simple Next.js starter with a single Pinata integration
- No external linting tools (ESLint/Prettier) are configured
- Maintain TypeScript strict mode compliance
- Test CORS headers when modifying API responses
- Preserve the existing code style for consistency
