# PRD: Dating copilot — Web MVP (four stages)

**Surface:** Responsive website / web app (desktop-first for uploads; mobile-usable)  
**North star:** Users organize dating context **by person**, get contextual message help, and run a **post-date loop**, with a path to **human coaches**.

---

## 0. Scope

| In scope | Out of scope (this PRD) |
|----------|-------------------------|
| Marketing site + authenticated app | Native mobile apps |
| Auth, contacts, timeline, uploads | Dating network / swiping product |
| AI suggestions + debrief flows | Covert third-party call recording |
| Stripe + quotas (Stage 3) | Browser extension injecting DMs |

**North-star success:** User creates ≥2 contacts, uploads ≥1 thread per contact, finds suggestions useful, returns within 7 days.

---

## 1. Principles

1. **Contact isolation** — AI context defaults to one contact + user prefs + pinned facts.  
2. **Explicit names** — OCR suggests; user confirms authoritative identity.  
3. **Human sends** — copy/paste workflow; label AI-generated content.  
4. **Safety** — refuse coercion/stalking/harm; reporting.  
5. **Privacy** — HTTPS, configurable retention, export/delete.

---

## 2. Global requirements (all stages)

### 2.1 Information architecture

- **Public:** landing, pricing, privacy, terms, safety.  
- **App:** Dashboard, Contacts, Contact detail (timeline), Ask AI, Settings (account, retention, billing).  
- **Admin (light):** flags, abuse queue; coach verification when Stage 4 ships.

### 2.2 Auth

- Email magic link and/or Google OAuth.  
- Secure sessions (HTTP-only cookies, CSRF on cookie auth).

### 2.3 Account profile

- Display name, default tone, optional dating goal enum.

### 2.4 Data model (conceptual)

- `User`, `Contact`, `TimelineItem` (screenshot_set | note | date_event | debrief | later voice_summary), `MediaObject`, `PinnedFact`, `Generation`.

### 2.5 AI response shape (server contract)

Structured JSON including `variants[]` (labels + text), `cautions[]`, `next_step`, optional `explain`.

### 2.6 Compliance copy

- Not therapy; user responsible for sent messages.  
- Age policy (18+ typical).  
- Upload attestation regarding rights to content.

### 2.7 Analytics

- Funnel and latency metrics; avoid shipping full transcripts to third-party analytics.

---

## Stage 1 — Core: contacts, uploads, grounded replies

**Duration (indicative):** 3–5 weeks (small team).

### Objectives

- Prove repeat use via multiple contacts.  
- OCR assist + mandatory confirmation.  
- Trustworthy generation UX (constraints, regenerate, explain).

### Features

1. Landing + signup.  
2. Auth.  
3. Contacts CRUD + archive.  
4. Contact timeline: screenshot sets (multi-file drag/drop), notes.  
5. Pinned facts (cap ~15 per contact MVP).  
6. **Ask AI** scoped to selected contact — user selects which timeline items participate + facts + freeform instruction.  
7. OCR: server or client pipeline → suggested name + snippet preview → user confirms.  
8. Thumbs feedback on generations.  
9. Server-enforced quotas (payments optional until Stage 3).

### Acceptance criteria

- Every generation tied to `user_id` + `contact_id` on server.  
- No silent rename from OCR alone.  
- Upload UX handles multi-image bundles and errors gracefully.

### Technical notes

- Frontend: React/Next.js responsive.  
- Storage: signed URLs or server upload; object store for images.  
- Worker queue for OCR and generation jobs.  
- AI keys server-side only.

### Exit criteria

- Dogfood complete; privacy/terms published; basic support path for abuse and deletion requests.

---

## Stage 2 — Date operations: events, debriefs, reminders

**Duration:** 3–4 weeks.

### Objectives

- Improve retention with structured follow-through.  
- Improve perceived quality via scenario templates.

### Features

1. **Date event** timeline type: datetime (timezone), activity type, optional notes.  
2. **Post-date debrief** wizard: structured fields → AI outputs framing options plus action scripts (no pseudo-clinical diagnoses).  
3. **Reminders:** email MVP; optional Web Push/PWA later.  
4. **Templates library:** silence follow-up, reschedule, boundary decline, repair scripts.  
5. **Richer generation controls:** length, flirt level bounds, emoji toggles.  
6. **Export pack:** user-selected timeline PDF/zip for personal records (coach handoff prep).

### Acceptance criteria

- Fast debirth path (~45s) with expandable advanced sections.  
- Reminders respect user timezone settings.

### Technical notes

- Scheduler: cron/queue worker.  
- Email: transactional provider.

### Exit criteria

- Meaningful adoption of debrief among users logging dates (measure internally).

---

## Stage 3 — Monetization, trust, reliability

**Duration:** 3–5 weeks (can overlap late Stage 2).

### Objectives

- Sustainable economics.  
- Reduce harmful outputs and support load.

### Features

1. **Stripe subscriptions** with server-side entitlements (credits, contact caps, storage).  
2. User usage dashboard (credits, renewal).  
3. **Safety pipeline:** upload checks where applicable + refusal policies + output reporting.  
4. **Minimal admin:** user lookup, session revoke, refund workflow (manual OK initially).  
5. **Account controls:** delete account cascade, JSON export of metadata.  
6. **Platform hardening:** rate limits, idempotency keys, structured logging.

### Acceptance criteria

- Client cannot bypass paywall; every paid feature verified server-side.  
- Automated or semi-automated deletion within SLA (e.g., 24h).

### Risks

- Subjective AI quality refunds — clear trial and policy.

---

## Stage 4 — Human coaches marketplace (lite)

**Duration:** 5–8 weeks.

### Objectives

- Ship human sessions without over-building scheduling from scratch initially.  
- Strict privacy on coach visibility.

### Features

1. **Coach directory:** bio, specialties, languages, pricing, timezone.  
2. **Booking:** integrate external scheduler links per coach or minimal first-party slots.  
3. **Payments:** Stripe Checkout session per booking; documented platform fee.  
4. **Context pack:** user selects pinned facts + N timeline entries + debrief excerpts → scoped share link or PDF with TTL.  
5. **Coach notes:** structured homework bullets post-session.  
6. **Ratings and reports.**  
7. **Coach onboarding admin:** verification checklist, manual approval.

### Acceptance criteria

- Coaches cannot access data outside approved context pack; tokens expire automatically.  
- Booking and settlement records auditable.

### Legal / ops

- Coaching vs therapy disclaimer.  
- Disputes and refunds playbook.

---

## 3. Roadmap summary

```
Stage 1: Contacts + uploads + OCR suggest + replies
Stage 2: Date events + debrief + reminders + templates
Stage 3: Stripe + quotas + safety + account controls
Stage 4: Coach directory + booking + scoped context packs + payouts
```

---

## 4. KPIs

| Stage | KPI |
|-------|-----|
| 1 | Activation: 2+ contacts + generations |
| 2 | Weekly active use; debrief adoption |
| 3 | Paid conversion; churn |
| 4 | Bookings completed; CSAT |

---

## 5. Dependencies

- Do not ship coach payouts before Stripe primitives (Stage 3).  
- Context packs benefit from richer Stage 2 structured data.

---

## 6. Deliverables checklist

- User flows documented for onboarding, OCR confirm, generation, debrief.  
- Versioned prompt library internally.  
- Incident runbook for model outages or abuse spikes.
