# Dating copilot — Wingboard (web) + PRDs

Private “dating copilot” concept: **memory per contact**, grounded AI reply help, date/debrief workflows, billing, safety reporting, and a **lite human-coach** path with scoped context packs.

This repo contains:

| Path | Contents |
|------|----------|
| `docs/` | Product requirement documents |
| `supabase/migrations/` | Ordered Postgres schema + RLS |
| `web/` | Next.js app (“Wingboard”) — production UI and API routes |

Feature scope matches [docs/PRD-web-mvp.md](docs/PRD-web-mvp.md) stages 1–4 (web). The Android PRD is specification only: [docs/PRD-android-app.md](docs/PRD-android-app.md).

---

## What the web app does

| Stage | Highlights | Notable routes / APIs |
|-------|------------|------------------------|
| **1** | Auth, contacts, timeline (notes + screenshot bundles in Storage), pinned facts, OCR name hint, Ask AI with monthly quota, generation feedback | `/contacts`, `/contacts/[id]`, `POST /api/generate`, `POST /api/extract-name`, `POST /api/generations/feedback` |
| **2** | Extended timeline kinds (`date_event`, `debrief`), reminders cron hook, markdown export | `POST /api/debrief`, `POST /api/export`, `POST /api/cron/reminders` |
| **3** | Stripe subscription (Pro vs free quotas), billing portal, webhook idempotency, free-tier active contact cap, hourly API rate limiting (single-node), account JSON export + delete (service role), output reports | `/settings/billing`, `POST /api/billing/checkout`, `POST /api/webhooks/stripe`, `POST /api/reports`, `GET /api/account/export`, `POST /api/account/delete` |
| **4 (lite)** | Verified coach directory, external scheduler links per coach, TTL **context packs** (token URL), Stripe **payment** Checkout for session deposits, coach homework notes, private ratings post-payment | `/coaches`, `/coaches/[slug]`, `/contacts/[id]/share-coach`, `/share/coach/[token]`, `/coach`, `POST /api/context-packs`, `POST /api/coaches/checkout`, `/settings/admin/coaches` |

**Caveats:** Coach payouts use the platform Stripe account in this MVP; fee copy uses `COACH_PLATFORM_FEE_BPS`. Connect / split payouts are not implemented yet.

---

## Requirements

- **Node.js** 20+ recommended (matches typical Next.js 16 projects)
- A **Supabase** project with Auth configured (magic link and/or OAuth)
- **Stripe** keys if you enable subscriptions or coach deposits
- **OpenAI API** key optional (OCR hint + generations fall back to mock behavior when unset)

---

## Quick start

1. **Supabase**

   Create a project, enable **Email** and/or **Google** (or your chosen providers).

   Add redirect URLs, e.g.:

   - `http://localhost:3000/auth/callback`

   Apply migrations **in filename order** in the SQL Editor (or use the Supabase CLI when linked):

   - `supabase/migrations/20260505000000_stage1.sql`
   - `supabase/migrations/20260506000000_stage2.sql`
   - `supabase/migrations/20260507000000_stage3.sql`
   - `supabase/migrations/20260508000000_stage4.sql`

2. **Environment**

   ```bash
   cp web/.env.example web/.env.local
   ```

   Fill required values (see **Environment variables** below). Visit `/setup-required` if the app reports missing Supabase keys.

3. **Run locally**

   ```bash
   cd web
   npm install
   npm run dev
   ```

4. **Production checks**

   ```bash
   cd web
   npm run lint
   npm run build
   ```

---

## Environment variables

All values live in `web/.env.local` (never commit secrets). Reference: [web/.env.example](web/.env.example).

| Variable | Required for | Purpose |
|----------|----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | App | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App | Browser + server anon client |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, context share page, JSON export, account delete | Bypasses RLS for controlled server flows only |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirects | Base URL (no trailing slash issues handled in code) |
| `OPENAI_API_KEY` | Optional | Vision name hint + grounded generations |
| `STRIPE_SECRET_KEY` | Billing + coach Checkout | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | Verifies `/api/webhooks/stripe` |
| `STRIPE_PRICE_ID_PRO` | Pro subscription | Price ID used by subscription Checkout |
| `ADMIN_EMAILS` | Stage 4 admin UI | Comma-separated emails allowed at `/settings/admin/coaches` (alternative: `profiles.is_admin`) |
| `COACH_PLATFORM_FEE_BPS` | Stage 4 copy | Platform fee basis points for coach checkout wording (default 1500 if unset in code paths) |
| `NEXT_PUBLIC_FREE_GENERATIONS_PER_MONTH` | UI / entitlements hints | Overrides public free quota display default |
| `PRO_MONTHLY_GENERATIONS` | Server quota | Pro tier monthly generation cap |
| `FREE_MAX_CONTACTS` | Server | Max non-archived contacts on free tier |
| `API_RATE_LIMIT_PER_HOUR` | Optional | Soft hourly limit per user for selected routes |

---

## Stripe webhooks

Point **one** Stripe webhook endpoint at:

`POST https://<your-domain>/api/webhooks/stripe`

The handler records event IDs into `stripe_events` for deduplication, then applies updates:

| Checkout outcome | Handling |
|------------------|-----------|
| `mode=subscription` + `metadata.user_id` | Updates `profiles` subscription fields |
| `mode=payment` + `metadata.checkout_kind=coach_book` | Marks `coach_bookings` paid |

Locally, use Stripe CLI forwarding and set `STRIPE_WEBHOOK_SECRET` to the CLI signing secret.

---

## Stage 4: coaches & admin

Public directory rows require **`coaches.is_published = true`** and **`verified_at` set**.

Operators can verify from **`/settings/admin/coaches`** if their email appears in **`ADMIN_EMAILS`** or **`profiles.is_admin`** is true for their user id.

Coach rows must reference a real **`auth.users` id**. Example (run in SQL after replacing UUIDs):

```sql
insert into coaches (
  user_id, slug, headline, bio,
  specialties, languages, timezone,
  session_price_display, session_amount_cents,
  is_published
) values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'example-coach',
  'Example · communication coach',
  'Short bio for the directory.',
  array['confidence', 'repair scripts'],
  array['english'],
  'UTC',
  'USD 129 intro',
  12900,
  true
);
```

Verify or hide listings through the admin page, or manually:

```sql
update coaches set verified_at = now() where slug = 'example-coach';
```

Members build **scoped context packs** under a contact (**`/contacts/<id>/share-coach`**). The coach-facing URL shape is **`/share/coach/<access_token>`** and expires according to TTL.

Optional deposit flow: **`/coaches/<slug>?pack=<context_pack_uuid>`** passes the pack into Checkout metadata when charging.

---

## Repository layout

```
docs/                    Product PRDs
supabase/migrations/     Versioned schema (run in order)
web/                     Next.js application
├── src/app/             App Router routes + API handlers
├── .env.example         Variable template
└── package.json         Scripts (dev, build, lint)
```

---

## Status

The **`web/`** app implements stages **1–4** of the web MVP PRD. Remaining work is mostly operational (coach data, Stripe products, domains) and whatever you prioritize beyond “lite” (e.g. Connect payouts, richer booking UX).
