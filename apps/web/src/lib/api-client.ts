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

export type ManagedUser = {
  id: string;
  org_id: string;
  manager_id: string | null;
  full_name: string;
  email: string | null;
  mobile: string | null;
  role: string;
  status: string;
  designation: string | null;
  department: string | null;
  employee_code: string | null;
  must_change_password: boolean;
  created_at: string | null;
};

export type Credentials = {
  user_id: string;
  full_name: string;
  email: string | null;
  employee_code: string | null;
  temp_password: string;
  email_sent: boolean;
};

export type OrgTreeNode = {
  id: string;
  full_name: string;
  role: string;
  employee_code: string | null;
  designation: string | null;
  department: string | null;
  status: string;
  children: OrgTreeNode[];
};

export type CreateUserBody = {
  full_name: string;
  email: string;
  mobile?: string;
  department?: string;
  designation?: string;
  address?: string;
  joining_date?: string;
  employee_code?: string;
  notes?: string;
  manager_id?: string;
};

export type DashboardData = { role: string; cards: Record<string, number> };

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export type WaConversation = {
  lead_id: string;
  name: string;
  phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_direction: string | null;
  unread: number;
  total: number;
};

export type WaMessage = {
  id: string;
  direction: string; // "in" | "out"
  body: string | null;
  wa_type: string;
  status: string | null;
  created_at: string | null;
};

export type LinkedInOrg = {
  urn: string;
  id: string;
  name: string;
  website: string | null;
  logo: string | null;
  industry: string | null;
  followers: number | null;
};

export type LinkedInStatus = {
  configured: boolean;
  connected: boolean;
  organization: LinkedInOrg | null;
  lead_count: number;
};

export type LinkedInAnalytics = {
  totals: {
    impressions: number; clicks: number; ctr: number;
    cpc: number; cpl: number; leads: number; spend: number;
  };
  campaigns: Array<{
    campaign_id: number; name: string; impressions: number; clicks: number;
    ctr: number; cpc: number; cpl: number; leads: number;
  }>;
};

export type WaConnection = {
  connected: boolean;
  phone: string | null;
  phone_number_id: string | null;
  name: string | null;
};

export type AuditEntry = {
  id: string;
  action: string;
  actor: string | null;
  target: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export const api = {
  auth: {
    signup: (body: { org_name: string; name: string; email: string; password: string }) =>
      request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
    me: (token: string) => request("/api/auth/me", { token }),
    changePassword: (token: string, body: { current_password: string; new_password: string }) =>
      request<{ access_token: string; must_change_password: boolean }>(
        "/api/auth/change-password",
        { method: "POST", body: JSON.stringify(body), token }
      ),
  },
  users: {
    list: (token: string, params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<ManagedUser[]>(`/api/users${qs}`, { token });
    },
    get: (token: string, id: string) => request<ManagedUser>(`/api/users/${id}`, { token }),
    createHead: (token: string, body: CreateUserBody) =>
      request<Credentials>("/api/users/heads", { method: "POST", body: JSON.stringify(body), token }),
    createEmployee: (token: string, body: CreateUserBody) =>
      request<Credentials>("/api/users/employees", { method: "POST", body: JSON.stringify(body), token }),
    update: (token: string, id: string, body: Record<string, unknown>) =>
      request<ManagedUser>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
    deactivate: (token: string, id: string) =>
      request<ManagedUser>(`/api/users/${id}/deactivate`, { method: "POST", token }),
    activate: (token: string, id: string) =>
      request<ManagedUser>(`/api/users/${id}/activate`, { method: "POST", token }),
    resetPassword: (token: string, id: string) =>
      request<Credentials>(`/api/users/${id}/reset-password`, { method: "POST", token }),
    changeManager: (token: string, id: string, manager_id: string | null) =>
      request<ManagedUser>(`/api/users/${id}/manager`, {
        method: "PATCH",
        body: JSON.stringify({ manager_id }),
        token,
      }),
    tree: (token: string) => request<OrgTreeNode[]>("/api/users/tree", { token }),
  },
  dashboard: {
    get: (token: string) => request<DashboardData>("/api/dashboard", { token }),
  },
  notifications: {
    list: (token: string, unreadOnly = false) =>
      request<{ unread_count: number; items: NotificationItem[] }>(
        `/api/notifications${unreadOnly ? "?unread_only=true" : ""}`,
        { token }
      ),
    markRead: (token: string, id: string) =>
      request(`/api/notifications/${id}/read`, { method: "POST", token }),
    markAllRead: (token: string) =>
      request("/api/notifications/read-all", { method: "POST", token }),
  },
  audit: {
    list: (token: string, params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<AuditEntry[]>(`/api/audit${qs}`, { token });
    },
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
  whatsapp: {
    conversations: (token: string) =>
      request<WaConversation[]>("/api/whatsapp/conversations", { token }),
    messages: (token: string, leadId: string) =>
      request<WaMessage[]>(`/api/whatsapp/conversations/${leadId}`, { token }),
    markRead: (token: string, leadId: string) =>
      request(`/api/whatsapp/conversations/${leadId}/read`, { method: "POST", token }),
    connection: (token: string) =>
      request<WaConnection>("/api/whatsapp/connection", { token }),
    connectManual: (token: string, body: { phone_number_id: string; access_token: string }) =>
      request<WaConnection>("/api/whatsapp/connect-manual", {
        method: "POST",
        body: JSON.stringify(body),
        token,
      }),
  },
  linkedin: {
    status: (token: string) => request<LinkedInStatus>("/api/linkedin/status", { token }),
    organizations: (token: string) =>
      request<LinkedInOrg[]>("/api/linkedin/organizations", { token }),
    selectOrganization: (token: string, org: LinkedInOrg) =>
      request<LinkedInStatus>("/api/linkedin/select-organization", {
        method: "POST", body: JSON.stringify(org), token,
      }),
    sync: (token: string) =>
      request<{ synced: number; seen: number }>("/api/linkedin/sync", { method: "POST", token }),
    analytics: (token: string) => request<LinkedInAnalytics>("/api/linkedin/analytics", { token }),
  },
  integrations: {
    list: (token: string) => request("/api/integrations", { token }),
    connect: (token: string, provider: string) =>
      request<{ auth_url?: string; method?: string; app_id?: string; configuration_id?: string; state?: string }>(`/api/integrations/${provider}/connect`, { token }),
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
