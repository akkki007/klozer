import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.org import Organization
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user

router = APIRouter()


class SocialAuthRequest(BaseModel):
    provider: str
    fb_id: str
    name: str
    email: str | None = None


class OnboardingRequest(BaseModel):
    org_name: str
    business_type: str
    team_size: str
    website: str | None = None
    lead_source_pref: str | None = None


class SocialTokenResponse(TokenResponse):
    is_new_user: bool
    onboarding_done: bool


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    org = Organization(name=body.org_name)
    db.add(org)
    await db.flush()

    user = User(
        org_id=org.id,
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.admin,
        status=UserStatus.active,
    )
    db.add(user)
    await db.flush()

    token = create_access_token({
        "sub": str(user.id),
        "org_id": str(org.id),
        "role": user.role.value,
    })
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        org_id=str(org.id),
        role=user.role.value,
        name=user.name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=403, detail="Account inactive")

    token = create_access_token({
        "sub": str(user.id),
        "org_id": str(user.org_id),
        "role": user.role.value,
    })
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        org_id=str(user.org_id),
        role=user.role.value,
        name=user.name,
    )


@router.post("/social", response_model=SocialTokenResponse)
async def social_auth(body: SocialAuthRequest, db: AsyncSession = Depends(get_db)):
    """Upsert a user authenticated via Facebook OAuth. Creates org on first login."""
    is_new_user = False

    result = await db.execute(select(User).where(User.fb_id == body.fb_id))
    user = result.scalar_one_or_none()

    if not user and body.email:
        result = await db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()
        if user:
            user.fb_id = body.fb_id

    if not user:
        is_new_user = True
        org = Organization(name="My Business")
        db.add(org)
        await db.flush()

        user = User(
            org_id=org.id,
            name=body.name,
            email=body.email,
            fb_id=body.fb_id,
            role=UserRole.admin,
            status=UserStatus.active,
        )
        db.add(user)
        await db.flush()

    result = await db.execute(select(Organization).where(Organization.id == user.org_id))
    org = result.scalar_one()

    token = create_access_token({
        "sub": str(user.id),
        "org_id": str(user.org_id),
        "role": user.role.value,
    })
    return SocialTokenResponse(
        access_token=token,
        user_id=str(user.id),
        org_id=str(user.org_id),
        role=user.role.value,
        name=user.name,
        is_new_user=is_new_user,
        onboarding_done=org.onboarding_done,
    )


@router.patch("/onboarding")
async def complete_onboarding(
    body: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = result.scalar_one()

    org.name = body.org_name
    org.business_type = body.business_type
    org.team_size = body.team_size
    org.website = body.website
    org.lead_source_pref = body.lead_source_pref
    org.onboarding_done = True

    return {"ok": True}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = result.scalar_one()
    return {
        "id": str(current_user.id),
        "org_id": str(current_user.org_id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "onboarding_done": org.onboarding_done,
    }
