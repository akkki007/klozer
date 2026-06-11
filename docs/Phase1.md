# Phase 1 — Build Specification

**Product:** LeadMax
**Scope:** Everything to develop in Phase 1 (MVP)
**Status:** Draft v1.0
**Companion docs:** `PRD.md`, `OAuth-Integrations.md`

---

## 1. Phase 1 objective

Ship a usable MVP where a sales team can: get leads in (manual + webhook + Facebook/Instagram + Google Sheets), have them auto-distributed, call/visit and log outcomes fast, follow up on time, send WhatsApp messages, move deals through stages, and let managers see activity & pipeline.

**All social integrations are built as OAuth-ready scaffolding** (see OAuth doc): the connector code, callback routes, token storage, and webhook receivers exist and are testable, gated behind feature flags + env credentials, so that the moment credentials/approvals arrive, each source activates without redeploying core logic.

---

## 2. In scope vs out of scope (Phase 1)

### In scope
- Auth, orgs, users, roles (Admin/Manager/Rep).
- Lead model + lifecycle + de-dupe + categorization.
- Lead ingestion: manual entry, CSV upload, generic website webhook, Google Sheets, **Facebook/Instagram lead ads** (live if credentials available, else scaffolded).
- Rule-based lead distribution.
- Call logging (Android auto-capture) + field visit logging + outcomes + voice-to-text notes.
- Tasks / follow-ups / reminders / "Today's Plan".
- WhatsApp outbound send (Cloud API; scaffolded + live when number connected).
- Deal stages (configurable) + auto movement on outcome.
- Basic analytics dashboard.
- Push notifications.
- OAuth scaffolding for Facebook, LinkedIn, WhatsApp (per OAuth doc).

### Out of scope (defer)
- LinkedIn live ingestion (scaffold only in P1).
- IndiaMART / JustDial / Google Ads connectors (P2).
- CRM sync (Zoho) (P2).
- Email engagement + open tracking (P2 — WhatsApp first).
- iOS app (P2).
- Cloud telephony, AI features (P3).

---

## 3. User stories (Phase 1)

### Auth & org
- As an admin, I can create an organization, invite users, and assign roles.
- As a user, I can sign in (email+password or phone OTP) and stay signed in on mobile.

### Leads
- As a rep, I receive a push notification within seconds of a new lead.
- As a rep, I see my lead list filtered by category (Fresh, Needs follow-up, Uncontacted, Did-not-pick).
- As a manager, I can upload a CSV of leads and distribute them by rule.
- As an admin, I can connect a lead source (or see "connect" state when credentials aren't configured yet).

### Calls & visits
- As a rep (Android), my outgoing/incoming business calls are auto-logged against the matching lead.
- As a rep, I capture an outcome in 2 taps and dictate a note (voice-to-text).
- As a rep, I see the lead's prior notes before/at call time.

### Follow-ups
- As a rep, I create a next-step task in one tap and get a reminder.
- As a rep, my "Today's Plan" lists everything due today.
- As a manager, I see missed follow-ups and stuck leads.

### Engagement
- As a rep, I send a templated WhatsApp message to a lead without saving the contact, and it's logged on the lead timeline.

### Pipeline & analytics
- As a manager, deals appear and move stages automatically based on outcomes.
- As a manager, I see lead volume by source, response time, activity, and a rep leaderboard.

---

## 4. Data model (Phase 1, simplified)

```
Organization(id, name, plan, created_at)
User(id, org_id, name, email, phone, role[admin|manager|rep], status)
Team(id, org_id, name, manager_id)
TeamMember(team_id, user_id)

LeadSource(id, org_id, type[manual|csv|webhook|gsheet|facebook|instagram|linkedin|whatsapp],
           status[connected|scaffolded|error], config_json, created_at)

Lead(id, org_id, source_id, owner_id, name, phone, email, status,
     category[fresh|needs_followup|uncontacted|did_not_pick|outcome_unknown],
     stage_id, created_at, updated_at, last_engaged_at, raw_payload_json)

Activity(id, lead_id, user_id, type[call_in|call_out|visit|note|whatsapp|status_change],
         outcome, duration_sec, body, meta_json, created_at)

Task(id, lead_id, assignee_id, title, due_at, status[open|done|missed], created_at)

DealStage(id, org_id, name, order)
Deal(id, lead_id, stage_id, value, status, created_at, updated_at)

MessageTemplate(id, org_id, channel[whatsapp|email], name, body, variables_json)
FileAsset(id, org_id, name, url, type, tracking_token)

IntegrationCredential(id, org_id, provider[facebook|instagram|linkedin|whatsapp],
     access_token_enc, refresh_token_enc, expires_at, scopes, external_account_id,
     status[active|pending|expired|revoked], meta_json)   ◄── see OAuth doc

DistributionRule(id, org_id, strategy[round_robin|by_source|by_team|by_load],
     config_json, priority)

WebhookEvent(id, provider, external_id, payload_json, processed_at, status)  -- idempotency
PushToken(id, user_id, platform, token)
```

Notes:
- Tokens are stored **encrypted at rest** (`IntegrationCredential`); never logged.
- `WebhookEvent.external_id` enforces idempotency (de-dupe replays).

---

## 5. Backend services / modules

| Module | Responsibility |
|---|---|
| **auth** | Sign up/in, JWT/refresh, OTP, org bootstrap, RBAC middleware. |
| **org-users** | Orgs, teams, users, roles, invites. |
| **leads** | CRUD, lifecycle, dedupe, categorization, search/filter. |
| **ingestion** | Normalizers per source → write Lead → emit `lead.created`. |
| **distribution** | Apply rules, assign owner, emit `lead.assigned`. |
| **activity** | Calls/visits/notes/outcomes; voice-to-text passthrough. |
| **tasks** | Tasks, reminders, Today's Plan, missed detection (cron). |
| **engagement** | WhatsApp send via Cloud API; template render; log to activity. |
| **pipeline** | Deal stages, auto-stage rules. |
| **analytics** | Aggregations, leaderboard, source/response metrics. |
| **integration** | OAuth flows, token storage/refresh, webhook receivers (see OAuth doc). |
| **notifications** | Push (FCM), in-app. |

---

## 6. Key API endpoints (Phase 1 — illustrative)

```
POST   /auth/signup
POST   /auth/login
POST   /auth/otp/request        POST /auth/otp/verify
POST   /auth/refresh

GET    /leads          POST /leads        GET /leads/:id   PATCH /leads/:id
POST   /leads/import   (CSV)
POST   /leads/:id/assign

POST   /activities                 (log call/visit/note/outcome)
GET    /leads/:id/activities

POST   /tasks    PATCH /tasks/:id   GET /tasks?due=today

GET    /deals    PATCH /deals/:id/stage
GET    /pipeline/stages   POST /pipeline/stages

POST   /engagement/whatsapp/send

GET    /analytics/overview
GET    /analytics/leaderboard

# Integration / OAuth (detailed in OAuth doc)
GET    /integrations
GET    /integrations/:provider/connect        -> returns auth URL / signup config
GET    /integrations/:provider/callback       -> token exchange
POST   /webhooks/:provider                     -> inbound leads/events
GET    /webhooks/:provider                     -> verification handshake (Meta)
```

---

## 7. Lead ingestion flow (Phase 1)

```
Source (webhook/poll) 
  → /webhooks/:provider (verify + ack fast, 200)
  → persist WebhookEvent (idempotent on external_id)
  → enqueue job
  → worker: normalize → dedupe → create Lead → run DistributionRule
  → emit lead.created / lead.assigned
  → notifications: push to assigned rep
```

- Webhooks **ack within ~2s**, do real work async (Meta retries on non-200).
- Google Sheets: poll on interval OR Apps Script webhook to `/webhooks/gsheet`.
- CSV/manual: synchronous create + async distribute.

---

## 8. Call & visit logging (Android)

- Android app reads call log (with runtime permission) and matches number → lead; creates `call_in`/`call_out` activity with duration.
- Outcome capture screen: quick chips (Interested, Call back, Not interested, Wrong number, etc.) + voice-to-text note.
- Visit logging: manual "Log visit" with optional geotag + outcome.
- Background sync queue for offline; reconcile on reconnect.

> iOS deferred — document the limitation in-app.

---

## 9. WhatsApp send (Phase 1, minimal)

- Uses WhatsApp Cloud API (see OAuth doc for connection).
- Send approved **template** messages to leads (outbound, no saved contact).
- Render variables from lead fields.
- Log send as `whatsapp` activity; store message id for later status (status callbacks can land in P2).
- If no number connected → feature shows "Connect WhatsApp" state (scaffold).

---

## 10. Notifications

- FCM push for: new lead assigned, task due/overdue, lead reply (when inbound enabled later).
- Store `PushToken` per device; topic per user.

---

## 11. Analytics (Phase 1 minimum)

- Overview: leads today/this week by source, avg first-response time, calls/visits count, conversion %.
- Leaderboard: per-rep activities, contacted %, deals moved.
- Implemented as periodic aggregation + on-read queries (no heavy warehouse yet).

---

## 12. Non-functional requirements

- **Performance:** webhook ack p95 < 1s; lead → push < 10s.
- **Security:** TLS everywhere; tokens AES-encrypted at rest; RBAC on every endpoint; audit log on integration changes.
- **Reliability:** idempotent webhook processing; retry with backoff; dead-letter queue.
- **Privacy:** data export + delete per org; PII access scoped by role.
- **Observability:** structured logs (no secrets), request tracing, error alerting.
- **Feature flags:** every connector behind a flag + env credential check.

---

## 13. Suggested stack (adjust to your team)

- **Backend:** Node.js (NestJS) or Python (FastAPI) — pick what your team wires fastest.
- **DB:** PostgreSQL. **Cache/queue:** Redis (+ BullMQ) or SQS/Rabbit.
- **Storage:** S3-compatible for files.
- **Mobile:** Android native (Kotlin) or Flutter.
- **Web console:** React.
- **Push:** Firebase Cloud Messaging.
- **Secrets:** vault / cloud secrets manager (for the OAuth credentials).

---

## 14. Phase 1 milestones (suggested sequence)

1. **M0 — Foundations:** repo, CI, auth, org/users/roles, DB schema, deploy pipeline.
2. **M1 — Leads core:** lead CRUD, categories, manual + CSV, distribution rules.
3. **M2 — Ingestion + OAuth scaffolding:** webhook receivers, normalizers, Google Sheets, **FB/IG/WhatsApp/LinkedIn OAuth scaffolding** (per OAuth doc) behind flags.
4. **M3 — Activity & follow-ups:** Android call logging, outcomes, voice-to-text, tasks, Today's Plan, reminders.
5. **M4 — Engagement & pipeline:** WhatsApp send, templates, deal stages + auto movement.
6. **M5 — Analytics & polish:** dashboards, leaderboard, notifications, hardening, QA.

---

## 15. Definition of done (Phase 1)

- A rep can go end-to-end: lead arrives (manual/CSV/webhook/FB if live) → assigned → push → call auto-logged → outcome captured → follow-up task → WhatsApp template sent → deal stage moves → manager sees it on dashboard.
- All four social connectors (FB, IG, LinkedIn, WhatsApp) have working OAuth scaffolding that activates purely by supplying credentials/flags, with no core code change.
- Security, idempotency, and data export/delete in place.
