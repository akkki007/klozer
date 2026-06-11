from pydantic import BaseModel


class IntegrationStatusOut(BaseModel):
    provider: str
    configured: bool       # env credentials present
    status: str            # active | scaffolded | awaiting_credentials | expired
    account: str | None = None  # page name / phone number / etc.
    connect_url: str | None = None


# ─── Two-phase connect: discover → install ───────────────────────────────────

class DiscoveredAsset(BaseModel):
    """A single connectable asset surfaced after OAuth (Page / IG account / ad account)."""
    type: str                       # page | instagram | ad_account
    id: str
    name: str
    picture: str | None = None
    username: str | None = None     # instagram only
    page_id: str | None = None      # instagram only — parent Page
    page_name: str | None = None
    category: str | None = None     # page only
    currency: str | None = None     # ad_account only


class AssetDiscoveryOut(BaseModel):
    provider: str
    pages: list[DiscoveredAsset] = []
    instagram: list[DiscoveredAsset] = []
    ad_accounts: list[DiscoveredAsset] = []


class InstallRequest(BaseModel):
    assets: list[DiscoveredAsset]   # the subset the user chose to install


class InstalledProfileOut(BaseModel):
    id: str                         # credential id (for per-profile disconnect)
    provider: str
    type: str                       # page | instagram | ad_account
    name: str | None = None
    picture: str | None = None
    account_id: str | None = None
    status: str


class ProfileDetailOut(BaseModel):
    """Everything we know about one connected profile (no raw token)."""
    id: str
    provider: str
    type: str
    name: str | None = None
    picture: str | None = None
    account_id: str | None = None
    status: str
    scopes: list[str] = []
    leadgen_subscribed: bool | None = None
    created_at: str | None = None
    updated_at: str | None = None
    expires_at: str | None = None
    meta: dict = {}
    live: dict | None = None        # best-effort fresh data pulled from the provider
    live_error: str | None = None   # set if the live fetch failed


class WhatsAppSendRequest(BaseModel):
    lead_id: str
    template_name: str     # approved Meta template name
    language_code: str = "en"
    components: list[dict] = []  # template variable components
