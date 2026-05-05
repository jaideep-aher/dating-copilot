# Dating copilot — product requirements & web Stage 1 app

This repository holds product requirement documents for a dating copilot concept: AI-assisted texting with **per-contact memory**, multimodal context (screenshots, notes, structured debriefs), optional voice recap, and a path to **human coaching**.

## Web app (Stage 1)

The `web/` folder is a Next.js app (**Wingboard**) that implements Stage 1 from [docs/PRD-web-mvp.md](docs/PRD-web-mvp.md):

- Supabase Auth (Google + email magic link) and protected routes
- Contacts with **isolated** timelines (notes + screenshot bundles in Supabase Storage)
- Pinned facts per contact (cap 15)
- Optional name hints via `POST /api/extract-name` (OpenAI vision when `OPENAI_API_KEY` is set)
- `POST /api/generate` grounded reply JSON with **monthly quota** (`FREE_GENERATIONS_PER_MONTH`, default 20)
- Thumbs feedback on generations

### Quick start

1. Create a Supabase project; run `supabase/migrations/20260505000000_stage1.sql` in the SQL Editor (and enable Email / Google providers with redirect `http://localhost:3000/auth/callback` for local dev).
2. Copy `web/.env.example` to `web/.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `OPENAI_API_KEY`.
3. From `web/`: `npm install` then `npm run dev`.

If env vars are missing, open `/setup-required` for the checklist.

---

## Product documents

| File | Description |
|------|--------------|
| [docs/PRD-android-app.md](docs/PRD-android-app.md) | Android-native app PRD with phased delivery (contacts, OCR, timeline, debrief, coaches). |
| [docs/PRD-web-mvp.md](docs/PRD-web-mvp.md) | Four-stage web MVP PRD (core app → date ops → monetization → coach marketplace). |

## Status

PRDs track the full roadmap; the **web Stage 1 MVP** is scaffolded under `web/` and ready to wire to your Supabase project.
