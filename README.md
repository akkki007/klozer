  # LeadMax

  > Sales Lead Management & Call/WhatsApp Engagement Platform

  LeadMax pulls leads automatically from ad and marketplace sources (Facebook/Instagram lead
  ads, webhooks, Google Sheets, CSV, manual) into a single inbox, distributes them to reps,
  auto-logs calls and visits, and lets reps follow up over WhatsApp — while managers get full
  pipeline visibility and analytics. It also provides a multi-company **organizational
  hierarchy** (Company Admin → Head → Employee) with admin-driven user provisioning, generated
  credentials, mandatory first-login password change, an org tree, audit logs, and notifications.

  **Core promise:** less manual data entry, zero missed follow-ups, 100% sales visibility.

  📄 **Docs:** [Build Summary](docs/Build-Summary.md) · [Phase 1 Checklist](docs/Phase1-Checklist.md) · [PRD](docs/PRD.md) · [Phase 1 Spec](docs/Phase1.md) · [OAuth & Integrations](docs/OAuth-Integrations.md)

  ---

  ## Tech stack

  | Layer | Stack |
  |---|---|
  | **Backend** (`apps/api`) | Python · FastAPI · SQLAlchemy 2.0 (async) · PostgreSQL · Alembic · Redis/arq · AES-Fernet token encryption · bcrypt · aiosmtplib (credential email) |
  | **Web** (`apps/web`) | Next.js 15 (App Router) · React 19 · NextAuth v5 (JWT) · react-icons · jsPDF (credential export) |
  | **Auth & access** | JWT + role-based access control (`company_admin` / `head` / `employee`), per-company tenant isolation, mandatory first-login password change |
  | **Integrations** | Meta Graph API (Facebook + Instagram lead ads, WhatsApp Cloud API), LinkedIn Lead Sync (scaffold) |
  | **Testing** | pytest · pytest-asyncio · httpx (API integration tests) |

  ---

  ## Repository layout

  ```
  .
  ├── apps/
  │   ├── api/            FastAPI backend
  │   │   ├── app/
  │   │   │   ├── models/     org · user · lead · audit · notification · ...
  │   │   │   ├── routers/    auth · users · dashboard · audit · notifications · leads · integrations · webhooks
  │   │   │   ├── services/   auth · credential · email · notification · audit · crypto
  │   │   │   └── schemas/    auth · user · lead · integration
  │   │   ├── alembic/    database migrations
  │   │   └── tests/      pytest suite (RBAC, tenant isolation, password lifecycle)
  │   └── web/            Next.js web console
  │       └── src/app/    dashboard · users · org · audit · change-password · integrations · (auth)
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
  - **Email (optional)** — to email generated credentials to new users, set the `SMTP_*` vars in
    `apps/api/.env`. Leave `SMTP_HOST` blank to disable email; credentials are still shown once
    in the UI (copy / download PDF).

  ### 2. Install dependencies

  ```bash
  # Backend
  cd apps/api
  python -m venv .venv
  .venv/bin/pip install -r requirements.txt      # Windows: .venv/Scripts/pip

  # Web
  cd ../web
  npm install
  cd ../..
  ```

  > **Windows:** the venv binaries live in `.venv/Scripts/` (not `.venv/bin/`). `dev.sh`
  > auto-detects both layouts. Run `dev.sh` from **Git Bash**, not PowerShell.

  ### 3. Database

  ```bash
  # Start Postgres (Docker) on :5433
  docker compose up -d postgres

  # Run migrations
  cd apps/api && .venv/bin/alembic upgrade head && cd ../..   # Windows: .venv/Scripts/alembic
  ```

  > The first signed-up user of each company becomes its **Company Admin**. From there, the
  > admin creates Heads and Employees from the **User Management** page (see below).

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

  ## Organizational hierarchy & user management

  LeadMax models a strict, multi-company hierarchy. Every company (organization) is fully
  isolated — no user can see another company's data.

  **Roles**

  | Role | Can do |
  |---|---|
  | `company_admin` | Create Heads & Employees · view all company leads · assign/reassign · reset passwords · deactivate users · change reporting manager · view analytics & audit log |
  | `head` | Create Employees under themselves · view only their team's leads · track their team |
  | `employee` | View assigned leads · update status · log activities · follow up via WhatsApp |

  **User provisioning flow**

  1. An admin (or head) fills a new-user form. The system generates a unique **employee code**
    (atomic per-company/year) and a **temporary password**.
  2. The credentials are shown **once** — copy, download as PDF, or (if SMTP is configured)
    emailed to the user.
  3. On first login the user is **forced to `/change-password`** before they can reach anything
    else. This gate is enforced both in the API (a `must_change_password` JWT claim) and in the
    Next.js middleware.

  **Pages**

  | Page | Who |
  |---|---|
  | **User Management** (`/users`) | admin & head — add/edit/activate/deactivate, reset password, change manager |
  | **Organization** (`/org`) | admin & head — expandable reporting tree |
  | **Audit Log** (`/audit`) | admin — every user-management action |
  | **Dashboard** (`/dashboard`) | role-aware cards (admin / head / employee) |
  | Notification bell | all — account-created / password-reset / manager-changed alerts |

  ---

  ## Running tests

  API integration tests cover RBAC, tenant isolation, the mandatory password-change lifecycle,
  employee-code uniqueness, and per-role lead visibility.

  ```bash
  cd apps/api
  .venv/bin/pytest            # Windows: .venv/Scripts/pytest
  ```

  > Tests need a running Postgres (they create and use a `leadmax_test` database on the same
  > server as your dev DB). Start it with `docker compose up -d postgres` first.

  ---

  ## Project status

  Phase 1 (MVP) is in progress.

  **Working:** Meta (Facebook + Instagram) OAuth, lead webhooks, WhatsApp outbound send,
  auth + RBAC, lead CRUD, activities, tasks, and the full **organizational hierarchy & user
  management** suite (provisioning with generated credentials, mandatory password change, org
  tree, audit log, notifications, role-aware dashboards).

  **Not yet built:** lead distribution rules, analytics, push notifications, and the Android app.
  See the [Phase 1 Checklist](docs/Phase1-Checklist.md) for item-by-item status.

  ---

  ## Security notes

  - OAuth tokens are **AES-encrypted at rest** and never logged.
  - Passwords are **bcrypt-hashed**; new accounts get a temporary password and must rotate it on
    first login. New passwords are complexity-checked (length + upper/lower/digit).
  - **Tenant isolation** is enforced per `org_id` on every query; heads/employees additionally
    see only data within their part of the hierarchy.
  - Every user-management mutation (create, edit, reset, deactivate, manager change) is written
    to an **immutable audit log**.
  - `apps/api/.env` and `apps/web/.env.local` hold secrets and are git-ignored — only the
    `*.example` templates are committed. **Never commit real credentials.**
  - Every API endpoint is RBAC-guarded; OAuth callbacks use a signed CSRF `state`.
