# LeadMax — Build Summary (Phase 1 + Integrations)

**Product:** LeadMax — Sales Lead Management & Call/WhatsApp Engagement Platform
**Status:** Phase 1 (MVP) in progress
**Source docs:** [`PRD.md`](./PRD.md) · [`Phase1.md`](./Phase1.md) · [`OAuth-Integrations.md`](./OAuth-Integrations.md)
**Progress tracker:** [`Phase1-Checklist.md`](./Phase1-Checklist.md)

This is a condensed merge of the Phase 1 build spec and the OAuth/Integrations design.
For full detail, read the two source docs linked above.

---

## 1. What we're building

A mobile-first sales execution platform. Leads flow in automatically from ad/marketplace
sources into one inbox, get distributed to reps, every call/visit is logged, reps follow up
over WhatsApp, and managers get pipeline + activity analytics.

**Core promise:** less manual data entry, zero missed follow-ups, 100% sales visibility.

**Phase 1 objective:** ship a usable MVP where a team can get leads in (manual + webhook +
Facebook/Instagram + Google Sheets), auto-distribute them, call/visit and log outcomes fast,
follow up on time, send WhatsApp messages, move deals through stages, and let managers see
activity & pipeline.

All social integrations are built as **OAuth-ready scaffolding** behind feature flags + env
credentials: connector code, callback routes, token storage, and webhook receivers exist and
are testable, so the moment credentials/approvals arrive each source activates without a code
change or redeploy.

---

## 2. Scope

**In scope (Phase 1)**
- Auth, orgs, users, roles (Admin/Manager/Rep).
- Lead model + lifecycle + de-dupe + categorization.
- Ingestion: manual, CSV, generic webhook, Google Sheets, **Facebook/Instagram lead ads**.
- Rule-based lead distribution.
- Call logging (Android auto-capture) + field visits + outcomes + voice-to-text notes.
- Tasks / follow-ups / reminders / "Today's Plan".
- WhatsApp outbound send (Cloud API).
- Configurable deal stages + auto-movement on outcome.
- Basic analytics dashboard + push notifications.
- OAuth scaffolding for Facebook, Instagram, LinkedIn, WhatsApp.

**Out of scope (deferred)**
- LinkedIn live ingestion (scaffold only in P1), IndiaMART / JustDial / Google Ads (P2),
  Zoho CRM sync (P2), email engagement + tracking (P2), iOS app (P2), cloud telephony &
  AI features (P3).

---

## 3. Data model (simplified)

```
Organization, User(role: admin|manager|rep), Team, TeamMember
LeadSource(type: manual|csv|webhook|gsheet|facebook|instagram|linkedin|whatsapp, status)
Lead(name, phone, email, status, category, stage_id, owner_id, raw_payload_json)
Activity(type: call_in|call_out|visit|note|whatsapp|status_change, outcome, duration_sec, body)
Task(title, due_at, status: open|done|missed)
DealStage, Deal
MessageTemplate, FileAsset
IntegrationCredential(provider, access_token_enc, refresh_token_enc, expires_at, scopes, status)
DistributionRule(strategy: round_robin|by_source|by_team|by_load)
WebhookEvent(provider, external_id, payload_json)   -- idempotency
PushToken(user_id, platform, token)
```

- Tokens are **AES-encrypted at rest** (`IntegrationCredential`) and never logged.
- `WebhookEvent.external_id` enforces idempotency (de-dupes replays).

---

## 4. Backend modules

`auth` · `org-users` · `leads` · `ingestion` · `distribution` · `activity` · `tasks` ·
`engagement` (WhatsApp) · `pipeline` · `analytics` · `integration` (OAuth + webhooks) ·
`notifications` (FCM).

### Key endpoints

```
POST /auth/signup · /auth/login · /auth/social · PATCH /auth/onboarding · GET /auth/me
GET/POST /leads · GET/PATCH /leads/:id · POST /leads/:id/assign
GET/POST /leads/:id/activities · POST /leads/activities
POST /leads/tasks · GET /leads/tasks/today
GET    /integrations · GET /integrations/:provider/connect|callback
GET    /integrations/:provider/assets · POST /integrations/:provider/install
GET    /integrations/profiles · GET/DELETE /integrations/profiles/:id
POST   /integrations/whatsapp/send
GET/POST /webhooks/:provider          (verify handshake + receive events)
```

---

## 5. Lead ingestion flow

```
Source (webhook) → /webhooks/:provider (verify + ack 200 fast)
  → persist WebhookEvent (idempotent on external_id)
  → normalize → dedupe → create Lead → run DistributionRule
  → emit lead.created / lead.assigned → push to assigned rep
```

Webhooks **ack within ~1–2s** and do real work async (Meta retries on non-200).
Google Sheets polls on interval (or Apps Script webhook). CSV/manual create synchronously.

---

## 6. Integrations — the credential-driven activation pattern

Every provider implements the same `SocialConnector` interface and registers in a registry.
On boot the registry checks each provider's `isConfigured()` (env/secrets present?); configured
connectors flip `active` and their routes/webhooks do real work, otherwise they stay
`scaffolded` / `awaiting_credentials` and the UI shows a "Connect" / "Coming soon" state.

**Dropping credentials into the env is the only action needed to go live — no code change.**

### Env contract (see [`.env.example`](../.env.example))

```bash
FB_APP_ID= / FB_APP_SECRET=        # Meta: Facebook + Instagram + WhatsApp share one app
META_GRAPH_VERSION=v25.0
META_WEBHOOK_VERIFY_TOKEN=         # you choose this string
FB_LOGIN_CONFIG_ID=                # Facebook Login for Business config (overrides FB_SCOPES)
WHATSAPP_CONFIGURATION_ID=         # Embedded Signup config id
LINKEDIN_CLIENT_ID= / LINKEDIN_CLIENT_SECRET=
TOKEN_ENC_KEY=                     # AES-Fernet key for tokens at rest
```

### Per-provider summary

| Provider | Auth | Key scopes | Real-time | Approval needed |
|---|---|---|---|---|
| **Facebook Lead Ads** | 3-legged OAuth (Page admin) | `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `ads_management` | `leadgen` webhook → fetch by `leadgen_id` | Meta App Review + Live mode |
| **Instagram lead ads** | Same Meta app | FB leadgen scopes + `instagram_basic`, `instagram_manage_*` | Same leadgen webhook on connected Page | Same Meta review |
| **LinkedIn Lead Sync** | 3-legged OAuth | `r_marketing_leadgen_automation` (+ `rw_ads`) | Lead notifications → fetch `leadFormResponses` | Marketing Developer Platform approval |
| **WhatsApp Cloud API** | Embedded Signup (FB Login for Business) | WhatsApp Business Mgmt, Business Asset Mgmt | Webhooks; outbound via Graph `/messages` | Meta Tech Provider + template approval |

### Meta lead flow (Facebook + Instagram)

1. `+` on a network → popup → Facebook OAuth → callback exchanges `code` for a long-lived
   **user token**, stored as a *pending* credential.
2. App lists every Page (with linked IG account) and ad account the token can access; user
   **picks which to install**.
3. Install creates one active `IntegrationCredential` per asset and subscribes Pages to the
   `leadgen` webhook.
4. On a `leadgen` event: verify `X-Hub-Signature-256`, ack 200, then fetch the lead by
   `leadgen_id` with the Page token → normalize → create Lead → distribute. De-dupe on
   `leadgen_id` via `WebhookEvent`.

### WhatsApp (outbound, Phase 1)

Embedded Signup connects a WABA + phone number. Only **approved templates** can initiate
(outside the 24h window). Each send is logged as a `whatsapp` activity with the message id.

---

## 7. Non-functional requirements

- **Performance:** webhook ack p95 < 1s; lead → push < 10s.
- **Security:** TLS everywhere; tokens AES-encrypted at rest; RBAC on every endpoint;
  signed CSRF `state`; verify `hub.verify_token` (GET) + `X-Hub-Signature-256` (POST).
- **Reliability:** idempotent webhook processing; retry with backoff; dead-letter queue.
- **Privacy:** data export + delete per org; PII access scoped by role.
- **Observability:** structured logs (no secrets), tracing, error alerting.
- **Feature flags:** every connector behind an env-credential check.

---

## 8. Tech stack (as built)

- **Backend:** Python FastAPI · SQLAlchemy 2.0 async · PostgreSQL · Alembic · Redis/arq ·
  AES-Fernet token encryption.
- **Web:** Next.js 15 (App Router) · React 19 · NextAuth v5 (JWT) · react-icons.
- **Mobile (planned):** Android native — call-log auto-capture (iOS deferred).
- **Push:** Firebase Cloud Messaging (planned).

---

## 9. Phase 1 milestones

1. **M0 — Foundations:** repo, auth, org/users/roles, DB schema.
2. **M1 — Leads core:** lead CRUD, categories, manual + CSV, distribution.
3. **M2 — Ingestion + OAuth scaffolding:** webhook receivers, normalizers, Google Sheets,
   FB/IG/WhatsApp/LinkedIn OAuth behind flags.
4. **M3 — Activity & follow-ups:** Android call logging, outcomes, voice-to-text, tasks.
5. **M4 — Engagement & pipeline:** WhatsApp send, templates, deal stages + auto-movement.
6. **M5 — Analytics & polish:** dashboards, leaderboard, notifications, hardening, QA.

See [`Phase1-Checklist.md`](./Phase1-Checklist.md) for the live status of each item.
