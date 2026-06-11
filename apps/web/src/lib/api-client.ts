/**
 * Typed API client for FastAPI backend.
 * Pass the access token from the NextAuth session on every call.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type DiscoveredAsset = {
  type: "page" | "instagram" | "ad_account";
  id: string;
  name: string;
  picture?: string | null;
  username?: string | null;
  page_id?: string | null;
  page_name?: string | null;
  category?: string | null;
  currency?: string | null;
};

export type AssetDiscovery = {
  provider: string;
  pages: DiscoveredAsset[];
  instagram: DiscoveredAsset[];
  ad_accounts: DiscoveredAsset[];
};

export type InstalledProfile = {
  id: string;
  provider: string;
  type: string;
  name: string | null;
  picture: string | null;
  account_id: string | null;
  status: string;
};

export type ProfileDetail = InstalledProfile & {
  scopes: string[];
  leadgen_subscribed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  expires_at: string | null;
  meta: Record<string, unknown>;
  live: Record<string, unknown> | null;
  live_error: string | null;
};

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  auth: {
    signup: (body: { org_name: string; name: string; email: string; password: string }) =>
      request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
    me: (token: string) => request("/api/auth/me", { token }),
  },
  leads: {
    list: (token: string, params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/api/leads${qs}`, { token });
    },
    create: (token: string, body: { name: string; phone?: string; email?: string }) =>
      request("/api/leads", { method: "POST", body: JSON.stringify(body), token }),
    get: (token: string, id: string) => request(`/api/leads/${id}`, { token }),
    update: (token: string, id: string, body: Record<string, unknown>) =>
      request(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
    todayTasks: (token: string) => request("/api/leads/tasks/today", { token }),
  },
  integrations: {
    list: (token: string) => request("/api/integrations", { token }),
    connect: (token: string, provider: string) =>
      request<{ auth_url?: string; method?: string }>(`/api/integrations/${provider}/connect`, { token }),
    assets: (token: string, provider: string) =>
      request<AssetDiscovery>(`/api/integrations/${provider}/assets`, { token }),
    install: (token: string, provider: string, assets: DiscoveredAsset[]) =>
      request<InstalledProfile[]>(`/api/integrations/${provider}/install`, {
        method: "POST",
        body: JSON.stringify({ assets }),
        token,
      }),
    profiles: (token: string) => request<InstalledProfile[]>("/api/integrations/profiles", { token }),
    profileDetail: (token: string, id: string) =>
      request<ProfileDetail>(`/api/integrations/profiles/${id}`, { token }),
    disconnectProfile: (token: string, credId: string) =>
      request(`/api/integrations/profiles/${credId}`, { method: "DELETE", token }),
    disconnect: (token: string, provider: string) =>
      request(`/api/integrations/${provider}`, { method: "DELETE", token }),
    sendWhatsApp: (
      token: string,
      body: { lead_id: string; template_name: string; language_code?: string; components?: unknown[] }
    ) => request("/api/integrations/whatsapp/send", { method: "POST", body: JSON.stringify(body), token }),
  },
};
