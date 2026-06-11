# Product Requirements Document (PRD)

**Product (working name):** LeadMax — Sales Lead Management & Call/WhatsApp Engagement Platform
**Document type:** High-level PRD
**Status:** Draft v1.0
**Inspired by / benchmarked against:** SalesMax.ai

---

## 1. Summary

LeadMax is a mobile-first sales execution platform for SMB and mid-market field/inside sales teams. It pulls leads automatically from ad and marketplace sources into a single inbox, distributes them to reps, auto-logs every call and visit, and lets reps follow up over WhatsApp and email with trackable files — while managers get full pipeline visibility and analytics.

The core promise: **less manual data entry, zero missed follow-ups, 100% sales visibility.**

---

## 2. Problem statement

Sales teams (especially in markets like India that run on phone calls + WhatsApp) lose deals because:

- Leads arrive across many disconnected channels (Facebook/Instagram lead ads, IndiaMART, JustDial, Google Ads, website forms, spreadsheets) and get missed or picked up slowly.
- Reps forget to log calls/outcomes, so managers have no real picture of activity or pipeline.
- Follow-ups slip through the cracks — no reminders, no accountability.
- Messaging (WhatsApp/email) and file sharing happen on personal devices with no tracking.

LeadMax consolidates lead capture, engagement, follow-up, and reporting in one place.

---

## 3. Goals & non-goals

### Goals
- Capture leads from multiple sources in near real-time with push alerts.
- Auto-assign/distribute leads to reps by configurable rules.
- Auto-log calls (incoming/outgoing) and field visits; capture structured outcomes fast.
- Enable WhatsApp + email outreach with templates, file sharing, and open/click tracking.
- Task & follow-up engine that guarantees no lead goes cold silently.
- Deal stages with automatic creation/movement.
- Manager analytics: activity, pipeline, conversion, rep performance.

### Non-goals (for v1)
- Full-blown marketing automation / drip campaign builder.
- Native dialer/telephony switching (we integrate, not replace, telephony in v1).
- Deep ERP/accounting integration.
- AI call transcription/scoring (a later phase).

---

## 4. Target users & personas

| Persona | Needs |
|---|---|
| **Sales Rep (primary)** | Get leads instantly on phone, call & log fast, follow up on time, message on WhatsApp without saving contacts. |
| **Sales Manager** | Distribute leads, see who did what, spot stuck deals & missed follow-ups, measure team. |
| **Admin / Owner** | Connect lead sources & CRMs, manage users/roles, control data, billing. |

---

## 5. Core feature areas

### 5.1 Lead capture & ingestion
- Connectors to: Facebook Lead Ads, Instagram lead ads, IndiaMART, JustDial, Google Ads lead forms, Google Sheets, website webhook, CSV upload, manual entry.
- Incoming & outgoing phone calls auto-saved as leads.
- Real-time push notification on new lead.
- De-duplication on phone/email.

### 5.2 Lead distribution & ownership
- Rule-based assignment (round-robin, by source, by territory/team, by load).
- Manual reassignment & bulk upload + distribute.
- Auto-categorization: Fresh, Needs follow-up, Uncontacted, Did-not-pick, Outcome-unknown.

### 5.3 Activity capture (calls & visits)
- Auto-log every business call with duration & direction.
- Capture outcome via quick inputs and voice-to-text notes.
- "Today's Plan" daily to-do list per rep.
- Pre-call context: notes & history surfaced before the rep answers.

### 5.4 Engagement (messaging & files)
- Send personalized WhatsApp messages without saving the contact.
- Templates + brochure/file library.
- Trackable links — notify when a lead opens a file/message.
- Auto-log sent WhatsApp/email against the lead.

### 5.5 Tasks & follow-ups
- One-click "next step" task creation with reminders.
- "Days since last successful engagement" indicator.
- Missed-task / missed-follow-up visibility.
- "Did not pick" queue to retry later.

### 5.6 Pipeline & deals
- Configurable deal stages.
- Auto deal creation and stage movement based on outcomes.
- Per-lead timeline: entry → exit.

### 5.7 Analytics & reporting
- Real-time metrics: lead volume by source, response time, calls/visits, conversion, rep leaderboard.
- Stuck-deal and aging reports.

### 5.8 Integrations
- Lead sources (above).
- CRMs (Zoho first; HubSpot/others later) — keep CRM updated with calls, notes, tasks.
- Cloud telephony (later phase).

### 5.9 Admin, roles & data
- Roles: Admin, Manager, Rep.
- Org/team hierarchy.
- Secure cloud storage of logs/notes/tasks; user can export/delete data.

---

## 6. Platforms

- **Phase 1:** Android app (reps) + responsive web admin/manager console + backend APIs.
- **Later:** iOS app, deeper web parity.

> Note: native call-log auto-capture is an Android capability; iOS restricts call-log access, so iOS will rely on manual/VoIP logging.

---

## 7. High-level architecture

```
[Mobile App / Web Console]
        |
   [API Gateway / BFF]
        |
 ┌──────┴───────────────────────────────────┐
 | Core services                              |
 |  - Auth & Org/Users                        |
 |  - Lead service (ingest, dedupe, assign)   |
 |  - Activity service (calls, visits, notes) |
 |  - Engagement service (WhatsApp, email)    |
 |  - Task/Follow-up service                  |
 |  - Deal/Pipeline service                   |
 |  - Analytics service                       |
 |  - Integration/OAuth service  ◄── see OAuth doc
 └────────────────────────────────────────────┘
        |
 [Webhook receivers] ← FB/IG/WhatsApp/LinkedIn/IndiaMART/JustDial
        |
 [Queue (e.g. SQS/Rabbit/Redis)] → [Workers]
        |
 [Postgres] + [Object storage for files] + [Redis cache]
```

Lead sources push via webhooks → normalized → queued → assigned → notified. The **Integration/OAuth service** is where the social connectors live (see the separate OAuth doc).

---

## 8. Success metrics (north-star + supporting)

- **North star:** % of leads contacted within SLA (e.g. < 15 min).
- Lead-to-first-contact time.
- % leads with logged outcome.
- Follow-up completion rate / missed-task rate.
- Lead-to-deal conversion rate.
- Daily active reps / activities per rep.

---

## 9. Compliance & trust

- WhatsApp messaging must use the official WhatsApp Business / Cloud API and approved templates (no scraping/unofficial automation).
- LinkedIn lead data only via the official Lead Sync API (partner-approved).
- Facebook/Instagram lead data only via Meta Graph API with reviewed permissions.
- GDPR/India DPDP alignment: consent capture, data export, data deletion, retention controls.

---

## 10. Phasing overview

| Phase | Theme |
|---|---|
| **Phase 1 (MVP)** | Auth, leads core, manual + Facebook/Instagram + Google Sheets + webhook ingestion, distribution, call/visit logging, tasks/follow-ups, WhatsApp send, basic pipeline, basic analytics, **OAuth scaffolding for FB/LinkedIn/WhatsApp ready to activate on credentials.** |
| **Phase 2** | LinkedIn Lead Sync live, IndiaMART/JustDial/Google Ads connectors, CRM sync (Zoho), email engagement + tracking, richer analytics, iOS. |
| **Phase 3** | Cloud telephony, AI outcome/next-best-action, advanced automation, marketplace of connectors. |

Detailed Phase 1 scope is in the companion **Phase 1** document.

---

## 11. Key risks

- **Platform approval lead times:** Meta App Review, LinkedIn Marketing Partner approval, and WhatsApp Tech Provider onboarding can each take weeks. Mitigation: build connectors behind feature flags now (OAuth scaffolding doc) so the product works without them and they "switch on" when credentials/approvals land.
- **iOS call-logging limits:** restrict native auto-logging to Android in v1.
- **WhatsApp template/policy compliance:** enforce approved templates and opt-in.
