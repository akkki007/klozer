from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config as AlembicConfig
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
import app.models  # noqa: F401 — ensure all models are imported before mappers are configured
from app.routers import auth, leads, integrations, webhooks, users, dashboard, audit, notifications, whatsapp, linkedin

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def _check_current_revision(sync_conn) -> None:
    """Refuse to boot against a database whose schema doesn't match the
    latest migration. The API used to fall back to `Base.metadata.create_all`,
    which silently created any missing tables while leaving pre-existing
    tables un-altered — masking pending migrations until a route touching
    the missing column crashed at request time.
    """
    current = MigrationContext.configure(sync_conn).get_current_revision()
    head = ScriptDirectory.from_config(AlembicConfig(str(ALEMBIC_INI))).get_current_head()
    if current != head:
        raise RuntimeError(
            f"Database schema is out of date (current={current!r}, head={head!r}). "
            "Run `alembic upgrade head` in apps/api before starting the API."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(_check_current_revision)
    yield
    await engine.dispose()


app = FastAPI(
    title="LeadMax API",
    version="0.1.0",
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["whatsapp"])
app.include_router(linkedin.router, prefix="/api/linkedin", tags=["linkedin"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
