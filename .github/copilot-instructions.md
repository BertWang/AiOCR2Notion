# TestMoltbot - AI Coding Agent Instructions

## Project Overview
**TestMoltbot** is an intelligent handwritten note digitization and archiving system built with Next.js (App Router). It converts paper notes into structured, searchable markdown documents using OCR and LLM-based content refinement (Gemini 2.0 Flash).

### Core Architecture: Event-Driven Processing Pipeline

```
Client Upload → Server Handler → File Storage → AI Processing → DB Update → Client Display
```

**Key Insight**: The system separates concerns across layers:
- **Presentation**: React Server Components + Client Components (shadcn/ui + Radix)
- **Service**: Next.js API Routes (POST/PUT/DELETE)
- **Processing**: Gemini 2.0 Flash (OCR + text refinement + metadata generation)
- **Data**: Prisma ORM + SQLite (local development) with note metadata and file references

---

## Critical Data Flow

### Upload to Completion
1. **[upload-zone.tsx](../src/components/upload-zone.tsx)** - Client-side batch collection with progress
2. **[POST /api/upload](../src/app/api/upload/route.ts)** - File persistence to `public/uploads/`, DB record creation, AI trigger
3. **[gemini.ts](../src/lib/gemini.ts)** - Synchronous AI processing with retry logic (exponential backoff for rate limits)
4. **Database Update** - `status` progression: `PENDING → PROCESSING → COMPLETED` (or `FAILED`)
5. **[GET /api/notes](../src/app/api/notes/route.ts)** - Server Components fetch latest data via Prisma

### Processing State Machine
- **PENDING**: Initial file received, ready for AI
- **PROCESSING**: AI actively analyzing (current state during upload)
- **COMPLETED**: AI result stored; user can now edit/view
- **FAILED**: AI error; user triggers retry via [/api/retry](../src/app/api/retry/route.ts)

---

## Code Organization & Patterns

### Database Schema (Prisma)
[../prisma/schema.prisma](../prisma/schema.prisma) key fields:
```prisma
// Note lifecycle fields
status String @default("PENDING")  // State machine
errorMessage String?                // Failure reason
ocrProvider String?                 // Track which AI service

// Three-stage content fields (mirrors AI processing)
rawOcrText String?        // Stage 1: Raw OCR output
refinedContent String?    // Stage 2: LLM-cleaned markdown
confidence Float?         // AI confidence (0.0-1.0)
summary String?          // Stage 3: Generated summary
tags String?             // CSV format (SQLite limitation)

// File reference
imageUrl String          // Public path (/uploads/...)
fileKey String?          // Local filename for deletion
```

**Important**: `tags` stored as comma-separated string (SQLite no native array support).

### API Route Conventions
- **[POST /api/upload](../src/app/api/upload/route.ts)** - File + AI processing (rate-limited: 5/minute)
- **[GET /api/notes](../src/app/api/notes/route.ts)** - Fetch all notes (Server Component query)
- **[PUT /api/notes/[id]](../src/app/api/notes/[id]/route.ts)** - Update `refinedContent`, `tags`
- **[DELETE /api/notes](../src/app/api/notes/route.ts)** - Batch delete with file cleanup
- **[POST /api/retry](../src/app/api/retry/route.ts)** - Retry failed AI processing

### AI Integration (Gemini 2.0 Flash)
[lib/gemini.ts](../src/lib/gemini.ts) exports `processNoteWithGemini(filePath, mimeType)`:
- Accepts file path (converted to base64), returns structured `ProcessedNote` JSON
- **Prompt Design**: Requests JSON output with 4 fields: `rawOcr`, `refinedContent`, `summary`, `tags`
- **Language**: Explicitly requests Traditional Chinese (繁體中文) for summary + tags
- **Error Handling**: 
  - 429 (Rate Limit) → Exponential backoff retry (max 3 attempts)
  - Parse errors → Fallback to partial OCR with `confidence: 0.1`
  - Other errors → Thrown immediately, caught by route handler

**Watch Out**: Gemini may wrap JSON in markdown code blocks (`\`\`\`json...`\`\``); the parser strips these.

### Component Architecture
-- **[split-editor.tsx](../src/components/split-editor.tsx)** - Core dual-pane editor:
  - Left: Image with zoom controls
  - Right: Editable markdown with live preview
  - Features: Tag management (add/remove), save, retry on failure
- **[upload-zone.tsx](../src/components/upload-zone.tsx)** - Drag-drop file collection + progress
- **[notes-list-client.tsx](../src/components/notes-list-client.tsx)** - Client-side search filtering
- **UI Library**: shadcn/ui + Radix primitives (button, input, tabs, resizable, etc.)

### Design System: "Digital Zen"
- **Colors**: Stone (warm gray base), Paper White (content bg), Ink Black (text)
- **Typography**: 
  - Titles: `font-serif` (classic note aesthetic)
  - Body: `font-sans` (modern readability)
- **Layout**: AppSidebar + resizable split view, max-width containers

---

## Development Workflow

### Setup & Commands
```bash
npm install                  # Install dependencies
npm run dev                  # Start Next.js dev server (port 3000)
npm run build               # Production build
npm run lint                # ESLint check
```

### Environment Variables (.env.local)
```
GEMINI_API_KEY=<your-key>   # Required: Google Gemini API key
DATABASE_URL=file:./dev.db  # SQLite (local development)
```

### Database Migrations
```bash
npx prisma migrate dev --name <migration-name>  # Create + apply
npx prisma studio                               # GUI for data inspection
```

### Rate Limiting
- **Local**: 5 AI requests/minute (in-memory counter in upload route)
- **Gemini API**: Built-in 429 handling with exponential backoff
- **File naming**: Timestamp-prefixed to avoid collisions

### Testing Workflow
- Upload image → Wait for AI processing (sync) → View in split editor → Edit → Save
- Test retry: Upload valid image → Simulate failure → Trigger retry endpoint
- Check logs: `console.error("AI Processing Error:")` in server output

---

## Common Patterns & Gotchas

### Pattern: Server Components for Data Fetching
-- [page.tsx](../src/app/page.tsx#L9) uses `export const dynamic = 'force-dynamic'` + direct Prisma queries
- Why: Immediate data consistency without extra API hop; revalidatePath() updates UI

### Pattern: Cache Invalidation
- After create/update/delete → Call `revalidatePath('/')` to refresh Server Component cache
- Without this, users see stale data until next full page load

### Pattern: File Cleanup on Delete
-- [DELETE /api/notes](../src/app/api/notes/route.ts#L20) deletes both DB record AND physical file
- Uses `unlink()` from `fs/promises`; logs warnings if file missing (DB-only cleanup is ok)

### Gotcha: CSV Tag Format
- Retrieve tags: `note.tags.split(',').filter(Boolean)`
- Store tags: `tags.join(',')`
- Missing `.trim()` → Leading spaces in tags; always trim when parsing

### Gotcha: Mime Type Detection
-- [retry route](../src/app/api/retry/route.ts#L37) infers MIME from filename (brittle)
- Better: Store `mimeType` in Note schema or detect via file magic bytes

### Gotcha: Gemini JSON Parsing
- Response may include markdown backticks or control characters
- Always sanitize: `.replace(/```json\n/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '')`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| [../prisma/schema.prisma](../prisma/schema.prisma) | Data model; defines Note + Collection |
| [lib/gemini.ts](../src/lib/gemini.ts) | AI processing core; Gemini API client |
| [lib/prisma.ts](../src/lib/prisma.ts) | Prisma singleton instance |
| [app/api/upload/route.ts](../src/app/api/upload/route.ts) | File upload + AI trigger; rate-limited |
| [app/api/retry/route.ts](../src/app/api/retry/route.ts) | Manual retry for failed notes |
| [components/split-editor.tsx](../src/components/split-editor.tsx) | Edit + preview interface |
| [components/upload-zone.tsx](../src/components/upload-zone.tsx) | Drag-drop file collection |
| [app/page.tsx](../src/app/page.tsx) | Dashboard; shows recent notes |

---

## Guidelines for AI Agents

1. **Preserve the event-driven flow**: Keep upload → processing → storage logic intact; don't merge into one giant function
2. **Respect rate limiting**: Do not bypass the 5 requests/minute throttle; if adding features, adjust via `MAX_REQUESTS_PER_MINUTE`
3. **Always call revalidatePath()** after DB mutations affecting Server Components
4. **Handle Gemini errors gracefully**: 429 → retry; parse errors → fallback; document in errorMessage
5. **Maintain tag CSV format** until schema migration; document if changing to array
6. **Test with real images**: Mock tests won't catch OCR quirks or Gemini formatting surprises
7. **Reference Traditional Chinese in prompts** if targeting user-facing text generation
8. **Keep the split editor responsive**: Left pane for images, right pane for editable markdown; maintain 1:1 zoom relationship

---

## Future Considerations

- [ ] Background job queue (BullMQ/Celery) to handle 100+ concurrent uploads
- [ ] S3/cloud storage for file persistence (replace local /uploads)
- [ ] Collections/folders feature (schema ready; UI incomplete)
- [ ] Full-text search index (Prisma/PostgreSQL upgrade)
- [ ] Batch merge operation (combine multiple notes into one document)
