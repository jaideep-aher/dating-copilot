# Wingboard (Next.js web app)

Dating copilot web client and API routes. Full setup, Stripe, Supabase migrations, and feature matrix live in the **repository root** [README.md](../README.md).

## Commands

From this directory:

```bash
cp .env.example .env.local   # then edit with real values
npm install
npm run dev                  # http://localhost:3000
npm run lint
npm run build
```

If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, the app redirects protected areas to `/setup-required`.
