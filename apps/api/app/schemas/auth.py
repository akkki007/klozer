from pydantic import BaseModel, EmailStr, field_validator

from app.services.auth_service import validate_password_complexity, PasswordComplexityError


class SignupRequest(BaseModel):
    org_name: str
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    # Accepts an email OR an employee_code in `identifier`. `email` is kept as an
    # optional alias for backward compatibility with older clients.
    identifier: str | None = None
    email: str | None = None
    password: str

    @property
    def login_id(self) -> str:
        return (self.identifier or self.email or "").strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    org_id: str
    role: str
    name: str
    must_change_password: bool = False


class InviteUserRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "employee"


class SetPasswordRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def complexity(cls, v: str) -> str:
        try:
            return validate_password_complexity(v)
        except PasswordComplexityError as e:
            raise ValueError(str(e)) from e
