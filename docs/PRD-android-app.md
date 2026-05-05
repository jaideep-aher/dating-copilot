# PRD: Dating copilot — Android application

**Platform:** Android (primary)  
**Vision:** An AI-assisted dating companion with **per-person memory**, **multimodal context** (screenshots, optional voice/debrief), and **human coach escalation**, built around consent, privacy, and practical guidance (communication, logistics, mindset).

---

## 1. Executive summary

Users struggle with what to say, how to follow up, and how to interpret situations across multiple people. Lightweight “reply” apps are often single-session and not organized per match.

This product delivers:

1. **Contact-scoped threads** — Each person has a timeline, notes, and generated suggestions.  
2. **Screenshot intelligence** — OCR suggests names/handles where possible with **explicit user confirmation** when uncertain.  
3. **Structured debriefs** — After dates or milestones, capture what happened and get next-step guidance.  
4. **Optional voice** — Prioritize **user-recorded summaries** or consented snippets, not covert recording.  
5. **Human coaches** — Vetted coaches for sessions and programs; AI handles throughput, humans handle judgment.

---

## 2. Goals and non-goals

### 2.1 Goals

- **G1:** Attach context (screenshots, text, optional audio) **to a specific contact** with actionable replies and plans.  
- **G2:** **No cross-contact leakage** in UX or model context unless the user merges contacts.  
- **G3:** Clear consent flows, retention controls, export/delete.  
- **G4:** Monetization: subscriptions plus coach marketplace (commission or session fees).  
- **G5:** Coach quality: verification, guidelines, dispute path.

### 2.2 Non-goals (initial)

- Automating harassment, mass messaging, or impersonation.  
- Covert call recording as a core feature (defer; gate by law if ever added).  
- Full styling or wardrobe fulfillment — start with checklists and coach add-ons.  
- Operating an in-app dating network (swipe host) unless strategically added later.

---

## 3. Personas

| Persona | Needs | Emphasis |
|--------|--------|----------|
| Busy dater | Many matches, forgets threads | Per-contact inbox, reminders, drafts |
| Professional | Fewer mistakes, faster decisions | Concise options, explain-why, calendar |
| Rusty / post-breakup | Scripts, boundaries | Coach, debrief, practice mode |
| Coach (supplier) | Clients, scheduling, payouts | Coach tools (web first), moderation |

---

## 4. Product principles

- **Consent-by-design** for anything resembling surveillance.  
- **Contact truth:** OCR names are provisional until the user confirms.  
- **Human in the loop:** AI suggests; the user sends. No auto-send without explicit action.  
- **Safety:** Block coercion, stalking, non-consensual behavior patterns; coach code of conduct.

---

## 5. Feature requirements

### 5.1 Onboarding and account

- Sign-in: email magic link and/or Google.  
- Profile: display name; optional pronouns; goals; tone (playful / direct / warm).  
- Permissions: camera, photos, notifications, microphone only when needed.  
- Short education: only import content the user is permitted to use.

**Acceptance:** Onboarding under ~3 minutes; permissions on demand.

### 5.2 Contacts

- **Create:** manual name + optional app label + optional avatar; or from screenshot flow with OCR confirm.  
- **Detail:** tabs — Timeline, Facts (pinned), Drafts, Coach sessions, Settings.  
- **Merge/split** duplicate or mistaken contacts.  
- **Search** by name and tags.

**Acceptance:** Create contact in ≤2 taps from home shortcut; OCR always overridable with confidence hint.

### 5.3 Timeline and memory

**Entry types**

- Screenshot bundle (1–N images).  
- Text notes.  
- Voice memo → transcript; optional audio retention per setting.  
- Date event: when, where, mood, physical comfort flags, planned next step.  
- Debrief wizard (post-date).

**AI scope**

- Default context: this contact’s entries + global user prefs + **pinned facts** only.  
- **Pinned facts:** editable bullet knowledge (“works nights,” etc.).

**Suggestion output**

- Several reply variants (short / medium / bolder) plus **risk notes**.  
- Recommended next step (e.g., time-bound plan).  
- Optional “coach mode” explanation toggle.

**Acceptance:** Regenerate with constraints; logging minimized per retention policy.

### 5.4 Screenshot and OCR

1. Pick images → optional crop.  
2. OCR (on-device preferred for names MVP; server for hard cases).  
3. Structured guess: candidate name, app, participants.  
4. Low confidence → wizard: “Who is this with?”

**Acceptance:** High-quality screenshots yield strong name suggestions or clean fallback.

### 5.5 Date planning and debrief

- **Plan:** checklist, logistics, boundaries, conversation seeds; optional calendar deep link.  
- **Debrief:** feeling scale, highs/lows, reciprocity, what next; AI gives interpretation **options** (not clinical claims) plus behavior plans and scripts.  
- **Reminders:** 24h / 3d / 1w nudges.

**Acceptance:** Quick debrief path under ~60 seconds.

### 5.6 Audio / calls (phased)

- **Phase A:** no raw third-party call recording requirement.  
- **Phase B:** user-narrated recap → STT → summary on timeline.  
- **Phase C (legal review):** consented recording, jurisdiction-gated.

### 5.7 Human coaches

- Coach profiles, specialties, languages, rates, verification.  
- Booking, packages, video link or WebRTC later.  
- **Handoff:** coach sees **user-approved** summary — pinned facts + selected timeline slice.  
- Ratings, reporting, payouts via payment partner.

**Acceptance:** No full history exposure without explicit user selection.

### 5.8 Safety

- Blocks for CSA, NCII, violence, self-harm; user reporting; refuse harassment playbooks.

### 5.9 Monetization

- Free tier: monthly generation cap, optional contact limits.  
- Pro: unlimited contacts, stronger models, voice recap.  
- Coach: marketplace fee plus optional bundles.

---

## 6. Android technical specification

| Layer | Recommendation |
|--------|----------------|
| Language | Kotlin |
| UI | Jetpack Compose, Material 3 |
| Architecture | MVVM/MVI |
| DI | Hilt |
| Networking | Retrofit + OkHttp |
| Local DB | Room |
| Images | Coil |
| Background | WorkManager |
| Auth | Firebase Auth or Supabase Auth |
| Backend | Supabase or Firebase + functions (relational model fits contacts well) |
| AI | Server-owned keys calling a model provider |
| OCR | ML Kit on-device optional + server fallback |
| Push | FCM |

**Data sketch:** `User`, `Contact`, `TimelineEntry`, `PinnedFact`, `AiRun` (minimal PII), coach tables.

**Security:** TLS, encryption at rest, scoped storage, DB encryption for sensitive notes, RLS per tenant if Postgres.

**Performance targets:** cold start; OCR ≤ ~3s median on-device path; progressive UI for generation.

---

## 7. Phased delivery

| Phase | Scope | Exit |
|-------|--------|------|
| **0** | CI, auth shell, analytics, legal stubs | Internal install |
| **1** | Contacts, timeline uploads, OCR suggest, pinned facts, AI replies, quotas | Multi-contact beta without context mixing |
| **2** | Date events, debrief, reminders, feedback loops | Post-date loop live |
| **3** | Voice recap, cropping, OCR v2 | Multimodal without call recording |
| **4** | Coach onboarding, bookings, scoped share packs, pilot payouts | Paid coach pilots |
| **5** | Growth: templates, learning per user, partnerships | Ongoing |

---

## 8. Risks

- Privacy expectations → on-device OCR where possible, clear retention.  
- Store policies → safety, no spam automation, AI disclosure.  
- Coach scope → coaching vs therapy boundaries; crisis resources.

---

## 9. Success metrics

- Activation: first contact + first generation in week one.  
- Retention: D7/D30 for multi-contact users.  
- Quality: positive rate on suggestions.  
- Coach: bookings, completion, CSAT.
