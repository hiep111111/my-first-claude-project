# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies + generate Prisma client + run migrations
npm run setup

# Development server (Turbopack)
npm run dev

# Run all tests
npm test

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Lint
npm run lint

# Build
npm run build

# Reset database
npm run db:reset
```

A `NODE_OPTIONS='--require ./node-compat.cjs'` prefix is applied automatically via npm scripts — this polyfills Node.js APIs for Next.js 15 compatibility.

## Environment

Create a `.env` file with:
```
ANTHROPIC_API_KEY=...
```

Without an API key, the app falls back to a `MockLanguageModel` that returns static code snippets.

## Architecture

UIGen is an AI-powered React component generator with a three-panel UI:
- **Left (35%)**: Chat interface — users describe what to build
- **Right (65%)**: Preview iframe (default) or Code editor with file tree

### Data flow

1. User sends a message in the chat panel
2. `POST /api/chat` forwards the conversation + current virtual filesystem to Claude (`claude-haiku-4-5` via Vercel AI SDK)
3. Claude responds with tool calls to create/modify files (`str_replace`, `create`, file manager ops)
4. `FileSystemContext` executes those tool calls against the in-memory `VirtualFileSystem`
5. Preview refreshes: `jsx-transformer.ts` transpiles JSX via Babel standalone, generates an import map pointing to `esm.sh`, and injects everything into a sandboxed iframe
6. Authenticated users' projects (messages + virtual FS snapshot as JSON strings) are persisted to SQLite via Prisma

### Virtual file system

`src/lib/file-system.ts` — `VirtualFileSystem` is entirely in-memory (no disk I/O). The AI always targets `/App.jsx` as the entry point. Files are serialized to a JSON string and stored in `Project.data`.

### AI tools

Defined in `src/lib/tools/`:
- `str-replace.ts` — file creation and string-replacement editing (`create`, `str_replace`, `str_replace_based_edit_tool`)
- `file-manager.ts` — rename/delete operations

The system prompt (`src/lib/prompts/generation.tsx`) instructs the AI to use Tailwind CSS, keep `/App.jsx` as the root entry, and use `@/` for cross-file imports within the virtual FS.

### Authentication

JWT cookies (7-day expiry) via `jose`. `src/lib/auth.ts` handles session create/read/delete. `src/middleware.ts` protects `/api/projects` and `/api/filesystem`. Anonymous usage is fully supported — work is tracked in localStorage via `anon-work-tracker.ts` but not persisted to the database.

### Key paths

| Path | Purpose |
|---|---|
| `src/app/api/chat/route.ts` | AI chat endpoint (Vercel AI SDK `streamText`) |
| `src/lib/file-system.ts` | In-memory virtual filesystem |
| `src/lib/contexts/file-system-context.tsx` | Tool-call executor + FS state provider |
| `src/lib/contexts/chat-context.tsx` | Chat messages + `useChat` hook |
| `src/lib/transform/jsx-transformer.ts` | Babel transpilation + import map + iframe HTML |
| `src/lib/provider.ts` | Returns Claude or MockLanguageModel |
| `src/components/preview/PreviewFrame.tsx` | Sandboxed iframe renderer |
| `src/app/main-content.tsx` | Three-panel layout shell |
| `prisma/schema.prisma` | SQLite schema (User, Project) |

### Testing

Tests use Vitest + `@testing-library/react`. Test files live in `__tests__/` directories next to the code they test.
