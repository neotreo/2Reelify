# 2Reelify

## AI Video Generation Pipeline (Prototype)

Experimental end‑to‑end pipeline to turn a short idea into a planned, scripted, and (stub) generated vertical video.

Flow:
1. User submits idea at `/video` page.
2. Backend creates a `video_jobs` record (Supabase) and asynchronously:
	- Plans sections (OpenAI structured JSON)
	- Writes script per section
	- Produces visual prompts per section
	- (Stub) Generates clips & voiceover
	- Creates naive word‑timed captions
	- (Stub) Stitches into final video URL
3. UI polls `/api/video/status/:id` until `complete`.

Table migration: `supabase/migrations/202508280001_add_video_jobs.sql`.

Environment variables required:
```
OPENAI_API_KEY=sk-... # OpenAI key
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Implementation entrypoints:
- Types: `src/types/video.ts`
- Orchestrator: `src/lib/video/orchestrator.ts`
- Store helpers: `src/lib/video/store.ts`
- Create job API: `src/app/api/video/create/route.ts`
- Status API: `src/app/api/video/status/[id]/route.ts`
- UI page: `src/app/video/page.tsx`

Replace stubs in orchestrator for: clip generation, voiceover, and final stitching.

