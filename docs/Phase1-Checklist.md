# Phase 1 — Task Checklist

Phase 1 (MVP) of LeadMax, transformed into a working task list with current status.
Derived from [`Phase1.md`](./Phase1.md) and verified against the codebase.

**Legend:** ✅ done · 🚧 partial / scaffolded · ⬜ not started · ➖ deferred (out of P1 / needs approval)

_Last reviewed: 2026-06-11_

---

## M0 — Foundations

- [x] ✅ Repo structure (monorepo: `apps/api` FastAPI + `apps/web` Next.js)
- [x] ✅ Postgres via Docker Compose (`:5433`) + Alembic migrations
- [x] ✅ One-command dev startup (`dev.sh`: db + api + web)
- [x] ✅ SQLAlchemy data model (Org, User, Team, Lead, Activity, Task, Deal, IntegrationCredential, WebhookEvent, …)
- [x] ✅ Auth: signup, login (email + password), JWT issuance
- [x] ✅ Social login (Facebook) via NextAuth → `/auth/social`
- [x] ✅ Onboarding flow (`PATCH /auth/onboarding`, `/onboarding` page)
- [x] ✅ RBAC dependencies (Admin / Manager / Rep) on endpoints
- [ ] ⬜ Phone OTP login (`/auth/otp/request` + `/verify`)
- [ ] ⬜ Refresh-token rotation (`/auth/refresh`)
- [ ] ⬜ CI pipeline + deploy pipeline

## M1 — Leads core

- [x] ✅ Lead model + lifecycle + category enum (fresh / needs_followup / uncontacted / did_not_pick / outcome_unknown)
- [x] ✅ Lead CRUD: list (filterable), create, get, update
- [x] ✅ Manual lead assignment (`POST /leads/:id/assign`)
- [ ] 🚧 De-duplication on phone/email at create time _(model supports it; create path does not yet dedupe)_
- [ ] 🚧 Auto-categorization transitions _(enum exists; only `fresh` set on create — no rules engine)_
- [ ] 🚧 Rule-based distribution engine _(`DistributionRule` model exists; round-robin/by-load auto-assign not wired)_
- [ ] ⬜ CSV upload / import (`POST /leads/import`)

## M2 — Ingestion + OAuth scaffolding

- [x] ✅ Connector interface + registry + `isConfigured()` activation pattern
- [x] ✅ Webhook receivers: verify handshake (`GET /webhooks/:provider`) + receive (`POST`)
- [x] ✅ Idempotency via `WebhookEvent.external_id`
- [x] ✅ **Facebook** connector: full OAuth (connect → callback → discover assets → install)
- [x] ✅ Two-phase install flow: discover Pages/IG/ad-accounts, user selects which to install
- [x] ✅ Facebook `leadgen` webhook → fetch by `leadgen_id` → create Lead
- [x] ✅ Page subscription to `leadgen` (best-effort; needs `pages_manage_metadata` + Webhooks config)
- [x] ✅ **Instagram** connector (thin variant of Meta; IG accounts nested under Pages)
- [x] ✅ Integration status surfacing (`GET /integrations`, `/integrations/profiles`, profile detail)
- [x] ✅ Disconnect a single installed profile (`DELETE /integrations/profiles/:id`)
- [x] ✅ AES-Fernet token encryption at rest (`crypto_service`)
- [x] ✅ Signed CSRF `state` on OAuth callbacks
- [x] 🚧 **LinkedIn** connector _(code scaffold present; `awaiting_credentials` — partner approval pending)_ ➖
- [ ] ⬜ Google Sheets connector / poller
- [ ] ⬜ `X-Hub-Signature-256` HMAC verification on webhook POST
- [ ] ⬜ Token-refresh cron (scan `expires_at < now + buffer` → refresh)

## M3 — Activity & follow-ups

- [x] ✅ Activity logging API (`POST /leads/activities`, `GET /leads/:id/activities`)
- [x] ✅ Activity types: call_in / call_out / visit / note / whatsapp / status_change
- [x] ✅ Tasks: create (`POST /leads/tasks`) + "Today's Plan" (`GET /leads/tasks/today`)
- [ ] ⬜ Android call-log auto-capture (native app)
- [ ] ⬜ Voice-to-text note capture
- [ ] ⬜ Field-visit logging with geotag
- [ ] ⬜ Missed-task / missed-follow-up detection (cron)
- [ ] ⬜ Reminders / push on task due

## M4 — Engagement & pipeline

- [x] ✅ WhatsApp connect (Embedded Signup callback) — scaffolded
- [x] ✅ WhatsApp outbound template send (`POST /integrations/whatsapp/send`) → logs activity
- [ ] 🚧 WhatsApp status webhooks (sent/delivered/read) _(send path done; status callback processing pending)_
- [ ] ⬜ Message-template CRUD (`MessageTemplate` model exists; no API)
- [ ] ⬜ Deal stages API + auto stage-movement on outcome (`Deal`/`DealStage` models exist; no router)
- [ ] ⬜ File / brochure library + trackable links

## M5 — Analytics & polish

- [ ] ⬜ Analytics overview (leads by source, response time, calls/visits, conversion)
- [ ] ⬜ Rep leaderboard
- [ ] ⬜ Push notifications send (FCM) — `PushToken` model exists; no send logic
- [ ] ⬜ Data export / delete per org
- [ ] ⬜ Hardening + QA pass

---

## Frontend (web console)

- [x] ✅ Login / signup pages (NextAuth, credentials + Facebook)
- [x] ✅ Onboarding page
- [x] ✅ Dashboard with connection-state sync (connected profiles vs connect CTA)
- [x] ✅ Sidebar / app shell (`AppShell`, react-icons, no emojis)
- [x] ✅ Social Profiles two-pane page (network catalog + installed profiles `N/10`)
- [x] ✅ Profile-select modal (pick Pages / IG / ad accounts to install)
- [x] ✅ OAuth popup + postMessage bridge
- [x] ✅ Profile detail page with tabs (Overview / Permissions / Details + live Graph data)
- [ ] ⬜ Leads list / detail UI
- [ ] ⬜ Analytics UI

---

## Definition of Done (Phase 1)

- [ ] 🚧 End-to-end: lead arrives → assigned → push → call auto-logged → outcome → follow-up task → WhatsApp template → deal stage moves → manager sees it.
  _Built: lead arrival (FB), manual assign, activity logging, tasks, WhatsApp send.
  Missing: auto-distribution, push, call auto-log, deal auto-movement, analytics._
- [x] ✅ All social connectors have OAuth scaffolding that activates by supplying credentials/flags (Meta live; LinkedIn awaiting approval).
- [ ] 🚧 Security (encryption ✅, RBAC ✅, CSRF state ✅), idempotency ✅; webhook HMAC + data export/delete ⬜.
