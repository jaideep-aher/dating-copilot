# Dating copilot — product requirements & web Stage 1 app

This repository holds product requirement documents for a dating copilot concept: AI-assisted texting with **per-contact memory**, multimodal context (screenshots, notes, structured debriefs), optional voice recap, and a path to **human coaching**.

## Web app (Wingboard)

The `web/` folder is a Next.js app built from [docs/PRD-web-mvp.md](docs/PRD-web-mvp.md). Stages 1–3 are implemented in code; apply SQL migrations in order (`supabase/migrations/*.sql`).

**Stage 1:** Auth, contacts, timelines (notes + screenshot bundles), pinned facts, OCR hint, `POST /api/generate` with monthly quota, generation feedback.

**Stage 2:** Date/debrief timeline kinds, reminders cron hook, export markdown, richer generation inputs where wired.

**Stage 3:** Stripe Checkout + Customer Portal + webhook-driven `profiles` subscription fields, tier-aware generation quotas, free-tier active contact cap, hourly API rate limits (in-process), JSON account export, account deletion (service role + storage cleanup), `POST /api/reports` for output safety, billing page at `/settings/billing`.

### Quick start

1. Create a Supabase project; run migrations `20260505000000_stage1.sql`, then `20260506000000_stage2.sql`, then `20260507000000_stage3.sql` in the SQL Editor (or `supabase db push` when linked). Enable Email / Google with redirect `http://localhost:3000/auth/callback` for local dev.
2. Copy `web/.env.example` to `web/.env.local` and fill in Supabase URL/anon key, `NEXT_PUBLIC_SITE_URL`, and optionally `OPENAI_API_KEY`, Stripe keys, `SUPABASE_SERVICE_ROLE_KEY` (required for webhooks, export metadata, and account deletion).
3. From `web/`: `npm install` then `npm run dev`.

For Stripe locally, run the Stripe CLI and forward webhooks to `http://localhost:3000/api/webhooks/stripe` with your signing secret in `STRIPE_WEBHOOK_SECRET`.

If env vars are missing, open `/setup-required` for the checklist.

---

## Product documents

| File | Description |
|------|--------------|
| [docs/PRD-android-app.md](docs/PRD-android-app.md) | Android-native app PRD with phased delivery (contacts, OCR, timeline, debrief, coaches). |
| [docs/PRD-web-mvp.md](docs/PRD-web-mvp.md) | Four-stage web MVP PRD (core app → date ops → monetization → coach marketplace). |

## Status

PRDs track the full roadmap; the web app under `web/` implements Stages 1–3 of the MVP PRD (configure Supabase + Stripe per `.env.example`).
