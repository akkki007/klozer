import uuid
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field


# ── Creation ──────────────────────────────────────────────────────────────────
class CreateHeadRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    mobile: str | None = None
    department: str | None = None
    designation: str | None = None
    address: str | None = None
    joining_date: date | None = None
    employee_code: str | None = None  # optional override; generated if omitted
    notes: str | None = None


class CreateEmployeeRequest(CreateHeadRequest):
    # When a company_admin creates an employee they may target a specific head.
    # A head creating an employee implicitly becomes the manager.
    manager_id: uuid.UUID | None = None


# ── Updates ───────────────────────────────────────────────────────────────────
class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    mobile: str | None = None
    department: str | None = None
    designation: str | None = None
    address: str | None = None
    joining_date: date | None = None
    notes: str | None = None


class ChangeManagerRequest(BaseModel):
    manager_id: uuid.UUID | None = None  # None detaches (top-of-company)


# ── Output ────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    manager_id: uuid.UUID | None = None
    full_name: str = Field(validation_alias="name", serialization_alias="full_name")
    email: str | None = None
    mobile: str | None = Field(default=None, validation_alias="phone", serialization_alias="mobile")
    role: str
    status: str
    designation: str | None = None
    department: str | None = None
    employee_code: str | None = None
    must_change_password: bool = False
    created_at: datetime | None = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class CredentialResponse(BaseModel):
    """Returned ONCE when a user is created or their password is reset."""
    user_id: uuid.UUID
    full_name: str
    email: str | None
    employee_code: str | None
    temp_password: str
    email_sent: bool = False


class TreeNode(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str
    employee_code: str | None = None
    designation: str | None = None
    department: str | None = None
    status: str
    children: list["TreeNode"] = []
