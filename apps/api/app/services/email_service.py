"""SMTP email delivery via aiosmtplib.

Gracefully degrades to a no-op (logs a warning) when SMTP settings are blank,
so the app stays runnable in development without a mail server.
"""
import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger("leadmax.email")


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


async def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send an HTML email. Returns True if dispatched, False if skipped/failed."""
    if not smtp_configured():
        logger.warning("SMTP not configured — skipping email to %s (subject=%r)", to, subject)
        return False
    if not to:
        logger.warning("No recipient — skipping email (subject=%r)", subject)
        return False

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text or "Please view this message in an HTML-capable client.")
    message.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_USE_TLS,
            timeout=15,
        )
        logger.info("Email sent to %s (subject=%r)", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001 — email must never break the request
        logger.error("Failed to send email to %s: %s", to, exc)
        return False
