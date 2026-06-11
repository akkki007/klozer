# LeadMax

> Sales Lead Management & Call/WhatsApp Engagement Platform

LeadMax pulls leads automatically from ad and marketplace sources (Facebook/Instagram lead
ads, webhooks, Google Sheets, CSV, manual) into a single inbox, distributes them to reps,
auto-logs calls and visits, and lets reps follow up over WhatsApp — while managers get full
pipeline visibility and analytics.

**Core promise:** less manual data entry, zero missed follow-ups, 100% sales visibility.

📄 **Docs:** [Build Summary](docs/Build-Summary.md) · [Phase 1 Checklist](docs/Phase1-Checklist.md) · [PRD](docs/PRD.md) · [Phase 1 Spec](docs/Phase1.md) · [OAuth & Integrations](docs/OAuth-Integrations.md)

---

## Tech stack

| Layer | Stack |
|---|---|
| **Backend** (`apps/api`) | Python · FastAPI · SQLAlchemy 2.0 (async) · PostgreSQL · Alembic · Redis/arq · AES-Fernet token encryption |
| **Web** (`apps/web`) | Next.js 15 (App Router) · React 19 · NextAuth v5 (JWT) · react-icons |
| **Integrations** | Meta Graph API (Facebook + Instagram lead ads, WhatsApp Cloud API), LinkedIn Lead Sync (scaffold) |

---

## Repository layout

```
.
├── apps/
│   ├── api/            FastAPI backend (auth, leads, integrations, webhooks)
│   │   ├── app/        models · routers · connectors · services · schemas
│   │   └── alembic/    database migrations
│   └── web/            Next.js web console
│       └── src/        app router pages · components · lib (auth, api-client)
├── docs/               PRD, Phase 1 spec, OAuth design, build summary, checklist
├── docker-compose.yml  Postgres (and optional Redis)
├── dev.sh              one-command dev startup (db + api + web)
└── .env.example        backend environment template
```

---

## Prerequisites

- **Python** 3.11+
- **Node.js** 20+ and npm
- **Docker** (for Postgres) — or a local Postgres on `:5433`

---

## Setup

### 1. Clone & configure environment

```bash
git clone <your-repo-url> leadmax && cd leadmax

# Backend env — the API loads apps/api/.env
cp .env.example apps/api/.env

# Web env
cp apps/web/.env.local.example apps/web/.env.local
```

Then edit the two env files:

- **`apps/api/.env`** — at minimum set `TOKEN_ENC_KEY` and `JWT_SECRET`. Add `FB_APP_ID` /
  `FB_APP_SECRET` (+ `FB_LOGIN_CONFIG_ID`) to enable Facebook/Instagram. See comments in the
  file and [OAuth & Integrations](docs/OAuth-Integrations.md) for each provider.
  ```bash
  # generate a token-encryption key
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```
- **`apps/web/.env.local`** — set `AUTH_SECRET` (`openssl rand -base64 32`) and, for Facebook
  login, `AUTH_FACEBOOK_ID` / `AUTH_FACEBOOK_SECRET`.

### 2. Install dependencies

```bash
# Backend
cd apps/api
python -m venv .venv
.venv/bin/pip install -r requirements.txt

# Web
cd ../web
npm install
cd ../..
```

### 3. Database

```bash
# Start Postgres (Docker) on :5433
docker compose up -d postgres

# Run migrations
cd apps/api && .venv/bin/alembic upgrade head && cd ../..
```

### 4. Run everything

```bash
./dev.sh            # starts Postgres (if needed) + API + web; Ctrl-C stops all
./dev.sh --no-db    # skip the Postgres/docker step (DB already running)
```

| Service | URL |
|---|---|
| Web console | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

---

## Connecting Meta (Facebook + Instagram)

1. Create a **Business**-type app at [developers.facebook.com](https://developers.facebook.com/).
2. Add **Facebook Login for Business** + **Webhooks** products.
3. Set the OAuth redirect to `http://localhost:8000/api/integrations/facebook/callback`.
4. Put `FB_APP_ID`, `FB_APP_SECRET`, and your Login-for-Business `FB_LOGIN_CONFIG_ID` in
   `apps/api/.env`.
5. In the web console, open **Social Profiles** → `+` on Facebook → authorize → pick which
   Pages / Instagram accounts to install.

> The Meta app stays in **Development mode** until App Review approves the requested scopes;
> in dev mode only app admins/testers can connect and only test assets/leads appear. Ad and
> business permissions additionally require Business Verification. See
> [OAuth & Integrations](docs/OAuth-Integrations.md) for the full per-provider flow.

---

## Project status

Phase 1 (MVP) is in progress. Meta (Facebook + Instagram) OAuth, lead webhooks, WhatsApp
outbound send, auth/RBAC, lead CRUD, activities, and tasks are working. Distribution,
analytics, push, and the Android app are not yet built. See the
[Phase 1 Checklist](docs/Phase1-Checklist.md) for item-by-item status.

---

## Security notes

- OAuth tokens are **AES-encrypted at rest** and never logged.
- `apps/api/.env` and `apps/web/.env.local` hold secrets and are git-ignored — only the
  `*.example` templates are committed. **Never commit real credentials.**
- Every API endpoint is RBAC-guarded; OAuth callbacks use a signed CSRF `state`.
