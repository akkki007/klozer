from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Credentials/URLs pasted into .env often carry a stray trailing space or
    # newline. Such junk silently breaks OAuth (e.g. Facebook rejects a secret
    # with a trailing char), so strip whitespace off these fields up front.
    @field_validator(
        "FB_APP_ID", "FB_APP_SECRET", "FB_SCOPES", "FB_LOGIN_CONFIG_ID",
        "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_SCOPES",
        "JWT_SECRET", "TOKEN_ENC_KEY", "OAUTH_REDIRECT_BASE",
        "FRONTEND_URL", "API_BASE_URL",
        mode="before",
    )
    @classmethod
    def _strip_whitespace(cls, v):
        return v.strip() if isinstance(v, str) else v

    # App
    APP_ENV: str = "development"
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str
    DATABASE_SYNC_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # Token encryption (Fernet key for OAuth tokens at rest)
    TOKEN_ENC_KEY: str = ""

    # Meta / Facebook / Instagram / WhatsApp
    FB_APP_ID: str = ""
    FB_APP_SECRET: str = ""
    # Comma-separated OAuth scopes to request — used only by the CLASSIC Facebook
    # Login flow. Leave blank to use the full marketing default in
    # connectors/facebook.py. Ignored when FB_LOGIN_CONFIG_ID is set.
    FB_SCOPES: str = ""
    # Facebook Login for Business: the configuration ID created in the dashboard.
    # When set, permissions come from that configuration and `scope` is NOT sent.
    FB_LOGIN_CONFIG_ID: str = ""
    META_GRAPH_VERSION: str = "v25.0"
    META_WEBHOOK_VERIFY_TOKEN: str = ""
    WHATSAPP_CONFIGURATION_ID: str = ""

    # LinkedIn
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_API_VERSION: str = "202602"
    # Space-separated OAuth scopes — request ONLY the scopes whose products are
    # provisioned, else LinkedIn rejects the whole authorization. Add more as
    # products are approved (rw_ads for analytics, r_organization_admin for org).
    LINKEDIN_SCOPES: str = "r_marketing_leadgen_automation"

    # OAuth redirect base (FastAPI server-side OAuth)
    OAUTH_REDIRECT_BASE: str = "http://localhost:8000/api/integrations"

    # SMTP (credential delivery emails). Blank host = email is a no-op.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
