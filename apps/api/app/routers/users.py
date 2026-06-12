import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.dependencies import get_active_user, require_company_admin, require_head_or_admin
from app.models.org import Organization
from app.models.user import User, UserRole, UserStatus
from app.models.audit import AuditAction
from app.models.notification import NotificationType
from app.schemas.user import (
    CreateHeadRequest,
    CreateEmployeeRequest,
    UserUpdate,
    UserOut,
    ChangeManagerRequest,
    CredentialResponse,
    TreeNode,
)
from app.services.auth_service import hash_password
from app.services.credential_service import generate_employee_code, generate_temp_password
from app.services.audit_service import record_audit
from app.services.notification_service import notify, credentials_email_html

router = APIRouter()


async def _provision_user(
    db: AsyncSession,
    *,
    actor: User,
    org: Organization,
    role: UserRole,
    manager_id: uuid.UUID | None,
    body: CreateHeadRequest,
) -> CredentialResponse:
    """Shared create-with-credentials flow for heads and employees."""
    # Unique email within the whole system (email column is globally unique).
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    employee_code = body.employee_code or await generate_employee_code(
        db, org, body.full_name, body.joining_date
    )
    # Guard against a manual employee_code collision inside the company.
    dupe = await db.execute(
        select(User).where(User.org_id == org.id, User.employee_code == employee_code)
    )
    if dupe.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Employee code already in use")

    temp_password = generate_temp_password()

    user = User(
        org_id=org.id,
        manager_id=manager_id,
        created_by=actor.id,
        name=body.full_name,
        email=body.email,
        phone=body.mobile,
        password_hash=hash_password(temp_password),
        role=role,
        status=UserStatus.active,
        designation=body.designation,
        department=body.department,
        employee_code=employee_code,
        address=body.address,
        joining_date=body.joining_date,
        notes=body.notes,
        must_change_password=True,
    )
    db.add(user)
    await db.flush()

    await record_audit(
        db,
        org_id=org.id,
        actor_id=actor.id,
        action=AuditAction.user_created,
        target_id=user.id,
        detail={"role": role.value, "employee_code": employee_code},
    )

    login_url = f"{settings.FRONTEND_URL}/login"
    email_html = credentials_email_html(
        full_name=user.name,
        login_email=user.email or "",
        employee_code=employee_code,
        temp_password=temp_password,
        login_url=login_url,
    )
    note = await notify(
        db,
        user,
        type=NotificationType.account_created,
        title="Your LeadMax account is ready",
        body="A temporary password was issued. You'll be asked to change it on first login.",
        email_html=email_html,
    )
    # notify returns the in-app row; email_sent is implied by SMTP config.
    from app.services.email_service import smtp_configured

    return CredentialResponse(
        user_id=user.id,
        full_name=user.name,
        email=user.email,
        employee_code=employee_code,
        temp_password=temp_password,
        email_sent=bool(smtp_configured() and user.email),
    )


@router.post("/heads", response_model=CredentialResponse, status_code=201)
async def create_head(
    body: CreateHeadRequest,
    actor: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    org = (await db.execute(select(Organization).where(Organization.id == actor.org_id))).scalar_one()
    return await _provision_user(
        db, actor=actor, org=org, role=UserRole.head, manager_id=actor.id, body=body
    )


@router.post("/employees", response_model=CredentialResponse, status_code=201)
async def create_employee(
    body: CreateEmployeeRequest,
    actor: User = Depends(require_head_or_admin),
    db: AsyncSession = Depends(get_db),
):
    org = (await db.execute(select(Organization).where(Organization.id == actor.org_id))).scalar_one()

    # Determine the reporting manager.
    if actor.role == UserRole.head:
        manager_id = actor.id  # heads always create under themselves
    else:
        # company_admin: may target a specific head, else attach to the admin.
        manager_id = body.manager_id or actor.id
        if body.manager_id:
            mgr = (
                await db.execute(
                    select(User).where(User.id == body.manager_id, User.org_id == actor.org_id)
                )
            ).scalar_one_or_none()
            if not mgr:
                raise HTTPException(status_code=404, detail="Manager not found in your company")

    return await _provision_user(
        db, actor=actor, org=org, role=UserRole.employee, manager_id=manager_id, body=body
    )


@router.get("", response_model=list[UserOut])
async def list_users(
    role: UserRole | None = None,
    status_filter: UserStatus | None = Query(default=None, alias="status"),
    department: str | None = None,
    actor: User = Depends(require_head_or_admin),
    db: AsyncSession = Depends(get_db),
):
    filters = [User.org_id == actor.org_id]
    # Heads see only their direct reports (+ themselves).
    if actor.role == UserRole.head:
        filters.append((User.manager_id == actor.id) | (User.id == actor.id))
    if role:
        filters.append(User.role == role)
    if status_filter:
        filters.append(User.status == status_filter)
    if department:
        filters.append(User.department == department)

    result = await db.execute(select(User).where(*filters).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def _get_user_in_scope(db: AsyncSession, actor: User, user_id: uuid.UUID) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == actor.org_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if actor.role == UserRole.head and target.manager_id != actor.id and target.id != actor.id:
        raise HTTPException(status_code=403, detail="Not in your team")
    return target


@router.get("/tree", response_model=list[TreeNode])
async def org_tree(
    actor: User = Depends(require_head_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hierarchy tree. Admin sees the whole company; head sees their subtree."""
    result = await db.execute(select(User).where(User.org_id == actor.org_id))
    users = list(result.scalars().all())

    children: dict[uuid.UUID | None, list[User]] = {}
    for u in users:
        children.setdefault(u.manager_id, []).append(u)

    def build(u: User) -> TreeNode:
        return TreeNode(
            id=u.id,
            full_name=u.name,
            role=u.role.value,
            designation=u.designation,
            department=u.department,
            status=u.status.value,
            children=[build(c) for c in children.get(u.id, [])],
        )

    if actor.role == UserRole.head:
        return [build(actor)]
    # Admin: roots are users with no manager (or whose manager is outside the set).
    ids = {u.id for u in users}
    roots = [u for u in users if u.manager_id is None or u.manager_id not in ids]
    return [build(r) for r in roots]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: uuid.UUID,
    actor: User = Depends(require_head_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await _get_user_in_scope(db, actor, user_id)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    actor: User = Depends(require_head_or_admin),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_user_in_scope(db, actor, user_id)
    data = body.model_dump(exclude_none=True)
    field_map = {"full_name": "name", "mobile": "phone"}
    for field, value in data.items():
        setattr(target, field_map.get(field, field), value)
    await db.flush()
    await record_audit(
        db, org_id=actor.org_id, actor_id=actor.id,
        action=AuditAction.user_updated, target_id=target.id, detail=data,
    )
    return target


@router.post("/{user_id}/deactivate", response_model=UserOut)
async def deactivate_user(
    user_id: uuid.UUID,
    actor: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_user_in_scope(db, actor, user_id)
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")
    target.status = UserStatus.inactive
    await db.flush()
    await record_audit(
        db, org_id=actor.org_id, actor_id=actor.id,
        action=AuditAction.user_deactivated, target_id=target.id,
    )
    return target


@router.post("/{user_id}/activate", response_model=UserOut)
async def activate_user(
    user_id: uuid.UUID,
    actor: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_user_in_scope(db, actor, user_id)
    target.status = UserStatus.active
    await db.flush()
    await record_audit(
        db, org_id=actor.org_id, actor_id=actor.id,
        action=AuditAction.user_activated, target_id=target.id,
    )
    return target


@router.post("/{user_id}/reset-password", response_model=CredentialResponse)
async def reset_password(
    user_id: uuid.UUID,
    actor: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_user_in_scope(db, actor, user_id)
    temp_password = generate_temp_password()
    target.password_hash = hash_password(temp_password)
    target.must_change_password = True
    await db.flush()

    await record_audit(
        db, org_id=actor.org_id, actor_id=actor.id,
        action=AuditAction.password_reset, target_id=target.id,
    )

    from app.services.email_service import smtp_configured

    login_url = f"{settings.FRONTEND_URL}/login"
    email_html = credentials_email_html(
        full_name=target.name,
        login_email=target.email or "",
        employee_code=target.employee_code or "",
        temp_password=temp_password,
        login_url=login_url,
    )
    await notify(
        db, target,
        type=NotificationType.password_reset,
        title="Your LeadMax password was reset",
        body="A new temporary password was issued. You'll change it on next login.",
        email_html=email_html,
    )

    return CredentialResponse(
        user_id=target.id,
        full_name=target.name,
        email=target.email,
        employee_code=target.employee_code,
        temp_password=temp_password,
        email_sent=bool(smtp_configured() and target.email),
    )


@router.patch("/{user_id}/manager", response_model=UserOut)
async def change_manager(
    user_id: uuid.UUID,
    body: ChangeManagerRequest,
    actor: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_user_in_scope(db, actor, user_id)
    if body.manager_id:
        if body.manager_id == target.id:
            raise HTTPException(status_code=400, detail="A user cannot report to themselves")
        mgr = (
            await db.execute(
                select(User).where(User.id == body.manager_id, User.org_id == actor.org_id)
            )
        ).scalar_one_or_none()
        if not mgr:
            raise HTTPException(status_code=404, detail="Manager not found in your company")

    old_manager = target.manager_id
    target.manager_id = body.manager_id
    await db.flush()
    await record_audit(
        db, org_id=actor.org_id, actor_id=actor.id,
        action=AuditAction.manager_changed, target_id=target.id,
        detail={"from": str(old_manager) if old_manager else None,
                "to": str(body.manager_id) if body.manager_id else None},
    )
    await notify(
        db, target,
        type=NotificationType.manager_changed,
        title="Your reporting manager changed",
        body="Your reporting manager has been updated.",
    )
    return target
