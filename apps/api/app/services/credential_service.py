"""Credential generation: employee codes and temporary passwords.

Adapted from the reference repo's atomic login-ID allocator. Employee codes are
allocated per-company, per-year using a row-locked counter so concurrent user
creation never collides.
"""
import re
import secrets
import string
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.org import Organization
from app.models.notification import EmployeeCodeCounter


def _initials(full_name: str) -> str:
    """First two letters of first name + first two of last name, upper-cased.

    Falls back gracefully for single-word or short names (e.g. "Sam" -> "SAXX").
    """
    parts = [p for p in re.split(r"\s+", full_name.strip()) if p]
    first = parts[0] if parts else "X"
    last = parts[-1] if len(parts) > 1 else "X"
    a = re.sub(r"[^A-Za-z]", "", first)[:2].upper().ljust(2, "X")
    b = re.sub(r"[^A-Za-z]", "", last)[:2].upper().ljust(2, "X")
    return a + b


def _company_prefix(org: Organization) -> str:
    """Short uppercase prefix from company_code, else derived from the name."""
    if org.company_code:
        return re.sub(r"[^A-Za-z0-9]", "", org.company_code)[:6].upper() or "ORG"
    base = re.sub(r"[^A-Za-z0-9]", "", org.name or "ORG")
    return (base[:3] or "ORG").upper()


async def generate_employee_code(
    db: AsyncSession,
    org: Organization,
    full_name: str,
    joining_date: date | None = None,
) -> str:
    """Allocate the next employee code, e.g. ``ACME JODO 2026 0001`` (no spaces).

    Format: <COMPANY_PREFIX><INITIALS><YEAR><4-digit zero-padded serial>.
    The counter row is locked FOR UPDATE to serialize concurrent allocation.
    """
    year = (joining_date or date.today()).year

    result = await db.execute(
        select(EmployeeCodeCounter)
        .where(EmployeeCodeCounter.org_id == org.id, EmployeeCodeCounter.year == year)
        .with_for_update()
    )
    counter = result.scalar_one_or_none()
    if counter is None:
        counter = EmployeeCodeCounter(org_id=org.id, year=year, last_serial=0)
        db.add(counter)
        await db.flush()
        # Re-lock the freshly inserted row.
        result = await db.execute(
            select(EmployeeCodeCounter)
            .where(EmployeeCodeCounter.id == counter.id)
            .with_for_update()
        )
        counter = result.scalar_one()

    counter.last_serial += 1
    serial = counter.last_serial
    await db.flush()

    return f"{_company_prefix(org)}{_initials(full_name)}{year}{serial:04d}"


def generate_temp_password(length: int = 12) -> str:
    """Cryptographically-random temporary password meeting complexity rules:
    at least one lower, upper, digit and symbol. Ambiguous chars are avoided.
    """
    lowers = "abcdefghjkmnpqrstuvwxyz"
    uppers = "ABCDEFGHJKMNPQRSTUVWXYZ"
    digits = "23456789"
    symbols = "!@#$%*?"
    alphabet = lowers + uppers + digits + symbols

    while True:
        pwd = [
            secrets.choice(lowers),
            secrets.choice(uppers),
            secrets.choice(digits),
            secrets.choice(symbols),
        ]
        pwd += [secrets.choice(alphabet) for _ in range(max(length, 8) - 4)]
        secrets.SystemRandom().shuffle(pwd)
        candidate = "".join(pwd)
        # Guard against accidental whitespace-only edge cases.
        if candidate.strip() == candidate:
            return candidate
