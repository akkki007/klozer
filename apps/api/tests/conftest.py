"""Pytest fixtures: an isolated `leadmax_test` Postgres + an httpx client.

To avoid pytest-asyncio's session-vs-function event-loop mismatch (which makes
asyncpg raise "another operation is in progress"), DB/schema setup runs once in
a synchronous fixture via ``asyncio.run``, and every test gets its own
``NullPool`` engine created on the test's own loop.
"""
import asyncio

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

import app.models  # noqa: F401 — register all mappers
from app.config import settings
from app.database import Base, get_db
from app.main import app as fastapi_app

TEST_DB_NAME = "leadmax_test"


def _swap_db(url: str, name: str) -> str:
    base, _, _ = url.rpartition("/")
    return f"{base}/{name}"


TEST_ASYNC_URL = _swap_db(settings.DATABASE_URL, TEST_DB_NAME)


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    """Create the test database + schema once, on a throwaway loop."""
    async def _do():
        admin = create_async_engine(settings.DATABASE_URL, isolation_level="AUTOCOMMIT")
        async with admin.connect() as conn:
            exists = await conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": TEST_DB_NAME}
            )
            if not exists:
                await conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
        await admin.dispose()

        eng = create_async_engine(TEST_ASYNC_URL, poolclass=NullPool)
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        await eng.dispose()

    asyncio.run(_do())
    yield


@pytest_asyncio.fixture
async def client():
    """Per-test NullPool engine bound to this test's event loop."""
    engine = create_async_engine(TEST_ASYNC_URL, poolclass=NullPool)
    TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _override_get_db():
        async with TestSession() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=fastapi_app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
    finally:
        fastapi_app.dependency_overrides.clear()
        # Truncate every table so the next test starts clean.
        table_names = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        async with engine.begin() as conn:
            await conn.execute(text(f"TRUNCATE {table_names} RESTART IDENTITY CASCADE"))
        await engine.dispose()


# ── Helpers ───────────────────────────────────────────────────────────────────
async def signup(client: AsyncClient, *, org="Acme", name="Admin One", email="admin@acme.com", pw="Passw0rd!"):
    res = await client.post(
        "/api/auth/signup",
        json={"org_name": org, "name": name, "email": email, "password": pw},
    )
    assert res.status_code == 201, res.text
    return res.json()


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
