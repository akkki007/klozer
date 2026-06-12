"""In-app notifications (+ optional email) for user lifecycle events."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.services.email_service import send_email


async def notify(
    db: AsyncSession,
    user: User,
    type: NotificationType,
    title: str,
    body: str | None = None,
    email_html: str | None = None,
) -> Notification:
    """Create an in-app notification for ``user``; optionally email them too.

    The DB row is always written; email is best-effort (no-op if SMTP unset).
    """
    note = Notification(
        org_id=user.org_id,
        user_id=user.id,
        type=type,
        title=title,
        body=body,
    )
    db.add(note)
    await db.flush()

    if email_html and user.email:
        await send_email(to=user.email, subject=title, html=email_html)

    return note


def credentials_email_html(
    *, full_name: str, login_email: str, employee_code: str, temp_password: str, login_url: str
) -> str:
    """HTML body shown to a newly-provisioned user with their temporary credentials."""
    return f"""\
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
  <h2 style="color:#714B67">Welcome to LeadMax</h2>
  <p>Hi {full_name},</p>
  <p>An account has been created for you. Use these temporary credentials to sign in.
     You'll be asked to set a new password on first login.</p>
  <table style="border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px 12px;color:#666">Login email</td>
        <td style="padding:6px 12px;font-weight:600">{login_email}</td></tr>
    <tr><td style="padding:6px 12px;color:#666">Employee code</td>
        <td style="padding:6px 12px;font-weight:600">{employee_code}</td></tr>
    <tr><td style="padding:6px 12px;color:#666">Temporary password</td>
        <td style="padding:6px 12px;font-weight:600">{temp_password}</td></tr>
  </table>
  <a href="{login_url}" style="display:inline-block;background:#714B67;color:#fff;
     padding:10px 18px;border-radius:6px;text-decoration:none">Sign in</a>
  <p style="color:#999;font-size:12px;margin-top:20px">
     If you did not expect this email, please ignore it.</p>
</div>"""
