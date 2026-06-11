# OAuth & Social Lead Integrations

**Product:** LeadMax
**Scope:** OAuth + webhook integration design for social lead sources — **Facebook Lead Ads, Instagram, LinkedIn Lead Sync, WhatsApp (Cloud API)**
**Status:** Draft v1.0
**Companion docs:** `01_PRD.md`, `02_Phase1.md`

> **Design intent (your requirement):** Build all the OAuth/connector code now, behind feature flags + env-driven credentials. Each provider is **dormant** until its credentials exist, then **auto-activates** with no code change or redeploy of core logic. This doc gives you the flow, scopes, endpoints, token handling, webhook handling, and a credential-driven activation pattern for each.

---

## 0. The credential-driven activation pattern (core idea)

Every provider implements the same interface and is registered in a connector registry. On boot (and on a config-refresh signal), the registry checks whether each provider's credentials are present and valid; if so the connector flips to `active` and its routes/webhooks start doing real work. If not, the connector stays `scaffolded` and the UI shows a "Connect" / "Pending credentials" state.

```ts
// connector.interface.ts
export interface SocialConnector {
  provider: 'facebook' | 'instagram' | 'linkedin' | 'whatsapp';
  isConfigured(): boolean;                 // env/secrets present?
  getAuthUrl(orgId: string, state: string): string | null;  // null if not configured
  handleCallback(orgId: string, code: string): Promise<IntegrationCredential>;
  verifyWebhook(req): string | boolean;    // Meta hub.challenge / signature check
  handleWebhook(payload): Promise<void>;   // normalize → lead pipeline
  refreshToken?(cred: IntegrationCredential): Promise<IntegrationCredential>;
}
```

```ts
// registry.ts — single source of truth
const registry: Record<string, SocialConnector> = {
  facebook:  new FacebookConnector(),
  instagram: new InstagramConnector(),
  linkedin:  new LinkedInConnector(),
  whatsapp:  new WhatsAppConnector(),
};

export function activeConnectors() {
  return Object.values(registry).filter(c => c.isConfigured());
}
export function getConnector(p: string) { return registry[p]; }
```

```ts
// example isConfigured()
isConfigured() {
  return Boolean(process.env.FB_APP_ID && process.env.FB_APP_SECRET);
}
```

**Env contract (add to secrets manager; connectors stay dormant until filled):**

```bash
# Meta (Facebook + Instagram + WhatsApp share the same app)
FB_APP_ID=
FB_APP_SECRET=
META_GRAPH_VERSION=v21.0
META_WEBHOOK_VERIFY_TOKEN=          # you choose this string
WHATSAPP_CONFIGURATION_ID=          # Embedded Signup config id

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_API_VERSION=202602         # YYYYMM, bump periodically

# Common
OAUTH_REDIRECT_BASE=https://app.leadmax.example/integrations
TOKEN_ENC_KEY=                      # for AES encryption at rest
```

**Shared routes (same shape for every provider):**

```
GET  /integrations                       -> list providers + status
GET  /integrations/:provider/connect     -> 302 to provider auth URL (or 409 if not configured)
GET  /integrations/:provider/callback     -> exchange code, store cred, mark active
GET  /webhooks/:provider                   -> verification handshake (Meta)
POST /webhooks/:provider                   -> receive events (ack fast, process async)
DELETE /integrations/:provider             -> revoke/disconnect
```

**Token storage (`IntegrationCredential`):** access + refresh tokens **AES-encrypted at rest**, with `expires_at`, `scopes`, `external_account_id`, `status`. Never log raw tokens. A scheduled job refreshes tokens before expiry.

---

## 1. Facebook Lead Ads (Meta Graph API)

### 1.1 What it does
When a user submits a Facebook lead form, Meta sends a `leadgen` webhook to you; you then fetch the full lead by `leadgen_id` using a **Page access token** and create a Lead.

### 1.2 App setup (one-time, in Meta for Developers)
1. Create a **Business**-type app.
2. Add products: **Facebook Login for Business** and **Webhooks**.
3. Configure OAuth redirect URI: `${OAUTH_REDIRECT_BASE}/facebook/callback`.
4. Subscribe the Webhooks **Page** object to the `leadgen` field.
5. Submit for **App Review** for the permissions below (required before Live mode; dev mode only sees test leads).

### 1.3 OAuth flow (3-legged, per connecting org/page admin)
- **Scopes/permissions:** `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `pages_manage_ads`, `ads_management`.
  - `leads_retrieval` → fetch lead data.
  - `pages_manage_metadata` → subscribe page to webhook.
  - `pages_show_list` → list the user's pages to choose from.
- Flow:
  1. Redirect user to:
     ```
     https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth
       ?client_id=${FB_APP_ID}
       &redirect_uri=${OAUTH_REDIRECT_BASE}/facebook/callback
       &state=${state}
       &scope=leads_retrieval,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_manage_ads,ads_management
     ```
  2. Callback receives `code` → exchange for a **short-lived user token**:
     ```
     GET https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token
       ?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}
       &redirect_uri=...&code=${code}
     ```
  3. Exchange short-lived → **long-lived user token** (`grant_type=fb_exchange_token`).
  4. `GET /me/accounts` → list pages → get each **Page access token** (long-lived).
  5. For each chosen page, subscribe to leadgen:
     ```
     POST https://graph.facebook.com/${GRAPH_VERSION}/{page_id}/subscribed_apps
       ?subscribed_fields=leadgen   (with the PAGE access token)
     ```
  6. Store the **page token** (+ page id) as the credential used for lead retrieval.

### 1.4 Webhook handling
- **Verification (GET):** Meta sends `hub.mode`, `hub.verify_token`, `hub.challenge`. If `hub.verify_token === META_WEBHOOK_VERIFY_TOKEN`, respond with `hub.challenge` (200).
- **Events (POST):** verify `X-Hub-Signature-256` HMAC with `FB_APP_SECRET`. Payload contains `entry[].changes[].value.leadgen_id` + `page_id`. **Ack 200 immediately**, then async:
  ```
  GET https://graph.facebook.com/${GRAPH_VERSION}/{leadgen_id}
    ?access_token={PAGE_TOKEN}
  ```
  → returns `field_data` (name/email/phone/custom) → normalize → create Lead → distribute.
- Idempotency: de-dupe on `leadgen_id` via `WebhookEvent.external_id`.
- Rate limit note: prefer webhooks (real-time) over bulk reads; lead-retrieval is rate-limited per page.

### 1.5 Token lifecycle
- Long-lived page tokens are long-lived but can be invalidated (password change, permission revoke). Handle `OAuthException` → mark credential `expired` → prompt reconnect.

---

## 2. Instagram lead ads

Instagram lead ads run through the **same Meta app and Graph API** as Facebook. The Instagram account must be connected to a Facebook Page / Business. Practically:

- Same OAuth app, same `leadgen` webhook pattern; leads from IG forms arrive through the connected Page's leadgen events (plus Instagram-specific permissions where applicable, e.g. `instagram_basic`, `instagram_manage_*` depending on use case).
- Implement `InstagramConnector` as a thin variant of `FacebookConnector` (mostly shared code, different `provider` tag and any IG-specific scopes/fields). This is why Phase 1 lists IG as low marginal cost once FB is done.

---

## 3. LinkedIn Lead Sync API

> **Heads-up on access:** LinkedIn lead APIs require **Marketing Developer Platform / Lead Sync API approval** (partner application with use case + legal entity review; can take weeks). In Phase 1 you **scaffold** this; it goes live in Phase 2 once approved. The scaffolding below is ready for that moment.

### 3.1 What it does
Retrieves LinkedIn **Lead Gen Forms** and their responses, and registers for **lead notifications** for real-time sync into your CRM/pipeline.

### 3.2 App setup
1. Create an app in the LinkedIn Developer Portal (associated with a Company Page).
2. Request the **Lead Sync API** product (and Advertising API if you'll create forms).
3. Configure OAuth 2.0 redirect URL: `${OAUTH_REDIRECT_BASE}/linkedin/callback`.

### 3.3 OAuth flow (3-legged — required for member data)
- **Scopes:** `r_marketing_leadgen_automation` (retrieve forms + responses; this is the key one), plus `rw_ads` if creating/managing lead gen forms, and `r_organization_admin` (version 202210+) for org/admin lookup.
  - Note: `r_ads_leadgen_automation` is **deprecated** — use `r_marketing_leadgen_automation`.
- Authorization request:
  ```
  https://www.linkedin.com/oauth/v2/authorization
    ?response_type=code
    &client_id=${LINKEDIN_CLIENT_ID}
    &redirect_uri=${OAUTH_REDIRECT_BASE}/linkedin/callback
    &state=${state}
    &scope=r_marketing_leadgen_automation%20rw_ads%20r_organization_admin
  ```
- Token exchange:
  ```
  POST https://www.linkedin.com/oauth/v2/accessToken
    grant_type=authorization_code
    code=${code}
    client_id=${LINKEDIN_CLIENT_ID}
    client_secret=${LINKEDIN_CLIENT_SECRET}
    redirect_uri=...
  ```
- All Lead Sync calls use header `LinkedIn-Version: ${LINKEDIN_API_VERSION}` (YYYYMM) and `X-Restli-Protocol-Version: 2.0.0`.

### 3.4 Sync flow (per LinkedIn's Lead Sync use case)
1. Get the member's ad accounts.
2. Let the user select ad account(s).
3. Look up the organization.
4. Retrieve **Lead Gen Forms** for the account(s):
   ```
   GET https://api.linkedin.com/rest/leadForms?owner=(sponsoredAccount:urn:li:sponsoredAccount:{id})
   ```
5. Map form fields → your Lead fields.
6. **Register for lead notifications** (real-time) — store the subscription.
7. On notification, fetch `leadFormResponses` → normalize → create Lead → distribute.

### 3.5 Tokens
- LinkedIn access tokens are time-limited; use the **refresh token** flow to renew without re-consent. Store both encrypted; schedule refresh before `expires_at`.

---

## 4. WhatsApp (Cloud API via Embedded Signup)

> WhatsApp is **not** a "lead source" the way the others are — it's a **messaging channel** (outbound templates in Phase 1; inbound replies later). Connection is via Meta's **Embedded Signup** (Facebook Login for Business), which is OAuth-based. As of 2026 Embedded Signup is the default onboarding path and you'll need **Meta Tech Provider** standing for production.

### 4.1 App setup
- Same Meta **Business** app as Facebook/Instagram.
- Add the **WhatsApp** product.
- Create an **Embedded Signup configuration** → gives you `WHATSAPP_CONFIGURATION_ID`.
- You need `FB_APP_ID`, `FB_APP_SECRET`, `WHATSAPP_CONFIGURATION_ID`.

### 4.2 Embedded Signup flow (frontend + backend)
**Frontend** (Facebook JS SDK):
```html
<script async defer crossorigin="anonymous"
        src="https://connect.facebook.net/en_US/sdk.js"></script>
<script>
  window.fbAsyncInit = function () {
    FB.init({ appId: 'YOUR_APP_ID', cookie: true, xfbml: true, version: 'v21.0' });
  };
  function launchWhatsAppSignup() {
    FB.login(function (response) {
      if (response.authResponse) {
        const code = response.authResponse.code;  // short-lived (~10 min)
        // POST code to backend immediately
        fetch('/integrations/whatsapp/callback?code=' + code);
      }
    }, {
      config_id: 'YOUR_CONFIGURATION_ID',
      response_type: 'code',
      override_default_response_type: true
    });
  }
</script>
```
- Inside the Meta-hosted popup the user selects/creates their Business portfolio, WhatsApp Business Account (WABA), and phone number. Permissions requested: WhatsApp Business Management (manage WABA), Business Asset Management (phone numbers/templates), Webhook management.

**Backend** — exchange the short-lived `code` immediately:
```
GET https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token
  ?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&code=${code}
```
- Store the resulting access token (encrypted) as the WhatsApp credential, along with the WABA id and phone number id (read via Graph API after exchange).
- Subscribe your app to the WABA's webhooks for message status/inbound (inbound used in later phase).

### 4.3 Sending (Phase 1 — outbound templates)
```
POST https://graph.facebook.com/${GRAPH_VERSION}/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {WABA_ACCESS_TOKEN}
{
  "messaging_product": "whatsapp",
  "to": "{lead_phone_e164}",
  "type": "template",
  "template": { "name": "{approved_template}", "language": {"code":"en"},
                "components": [ ...variables... ] }
}
```
- Only **approved templates** can initiate (outside the 24-hour customer-service window).
- Log the returned `message id` as a `whatsapp` activity on the lead.

### 4.4 Webhooks (status + inbound)
- Same verify-token handshake as Facebook (GET `hub.challenge`).
- POST events carry message statuses (sent/delivered/read) and inbound messages → update activity / (later) create inbound lead replies.
- Verify `X-Hub-Signature-256`.

---

## 5. Shared implementation details

### 5.1 `state` & CSRF
- Generate a signed, short-lived `state` (includes `org_id`, nonce); validate on callback to prevent CSRF and to know which org/connection the callback belongs to.

### 5.2 Webhook security checklist
- Verify Meta `hub.verify_token` on GET.
- Verify `X-Hub-Signature-256` HMAC-SHA256 (app secret) on POST.
- Respond 200 within ~1–2s; process async (queue).
- Idempotency via `WebhookEvent.external_id` (`leadgen_id`, message id, LinkedIn lead id).
- Retry-tolerant: providers re-deliver on non-200.

### 5.3 Token refresh job
- Cron scans `IntegrationCredential` where `expires_at < now + buffer` and `refreshToken` exists → refresh → re-encrypt → update. On failure → mark `expired`, notify admin to reconnect.

### 5.4 Status surfacing to UI
`GET /integrations` returns per provider:
```json
[
  {"provider":"facebook","configured":true,"status":"active","account":"Acme Page"},
  {"provider":"instagram","configured":true,"status":"scaffolded"},
  {"provider":"linkedin","configured":false,"status":"awaiting_credentials"},
  {"provider":"whatsapp","configured":true,"status":"active","phone":"+91..."}
]
```
- `configured:false` → show "Coming soon / awaiting credentials".
- `configured:true & no cred` → show "Connect".
- `active` → show connected account + disconnect.

### 5.5 Connect endpoint guard (the auto-activation gate)
```ts
// GET /integrations/:provider/connect
const c = getConnector(req.params.provider);
if (!c) return res.status(404).send('Unknown provider');
if (!c.isConfigured()) return res.status(409).json({ status: 'awaiting_credentials' });
const state = signState({ orgId: req.org.id });
return res.redirect(c.getAuthUrl(req.org.id, state));
```
Because routes and connectors always exist, **dropping credentials into the secrets manager + flipping the flag is the only action needed to go live** — no code change.

---

## 6. Per-provider scope/permission summary

| Provider | Auth | Key scopes/permissions | Real-time mechanism | App review/approval |
|---|---|---|---|---|
| **Facebook Lead Ads** | 3-legged OAuth (Page admin) | `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `pages_manage_ads`, `ads_management` | `leadgen` webhook → fetch by `leadgen_id` | Meta App Review; Live mode |
| **Instagram lead ads** | Same Meta app | FB leadgen scopes + IG-specific (`instagram_basic`, etc.) | Same leadgen webhook on connected Page | Same Meta review |
| **LinkedIn Lead Sync** | 3-legged OAuth | `r_marketing_leadgen_automation` (+ `rw_ads`, `r_organization_admin`) | Lead notifications → fetch `leadFormResponses` | Marketing Developer Platform / Lead Sync approval |
| **WhatsApp Cloud API** | Embedded Signup (FB Login for Business) | WhatsApp Business Mgmt, Business Asset Mgmt, Webhooks | Webhooks (status/inbound); outbound via Graph `/messages` | Meta Tech Provider; template approval |

---

## 7. What to build now (Phase 1) vs activate later

**Build now (dormant-ready):**
- Connector interface + registry + `isConfigured()` per provider.
- All `/integrations/*` and `/webhooks/*` routes.
- Meta connectors (FB + IG + WhatsApp) — fully functional, gated on `FB_APP_ID/SECRET` (+ `WHATSAPP_CONFIGURATION_ID`).
- LinkedIn connector — code complete, gated on `LINKEDIN_CLIENT_ID/SECRET`, stays `awaiting_credentials` until partner approval.
- Token encryption + refresh job + webhook security + idempotency.

**Activate later (just supply credentials / approval):**
- Facebook/Instagram: after Meta App Review → set env → flips active.
- WhatsApp: after Tech Provider + config id → set env → Embedded Signup works.
- LinkedIn: after Lead Sync approval → set env → connect.

---

## 8. References (verify against current docs before coding)

- Meta Graph API — Lead Ads / `leadgen` webhooks & permissions (`leads_retrieval`, `pages_manage_metadata`, `ads_management`).
- Meta — WhatsApp Embedded Signup (Facebook Login for Business), Cloud API `/messages`, Tech Provider requirement (2026 default path).
- LinkedIn Marketing — Lead Sync API: `r_marketing_leadgen_automation`, 3-legged OAuth, `LinkedIn-Version` header; `r_ads_leadgen_automation` deprecated (July 2023).

> API versions, scope names, and review requirements change frequently. Re-confirm each provider's current developer docs at implementation time and pin the version (`META_GRAPH_VERSION`, `LINKEDIN_API_VERSION`).
