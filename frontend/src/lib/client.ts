import { API_URL } from "@/lib/api";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "sales" | "dealer" | "client" | string;
  company_name?: string | null;
  phone?: string | null;
  tax_status?: string;
  sales_tax_percent?: string;
  avatar_url?: string | null;
};

export function sessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("jah_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function authHeaders(json = true): HeadersInit {
  const token = localStorage.getItem("jah_token");
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem("jah_token");
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body.message || firstError(body.errors) || "That request did not go through.";
    throw new Error(message);
  }
  return body as T;
}

function firstError(errors: Record<string, string[]> | undefined) {
  if (!errors) return null;
  const first = Object.values(errors)[0];
  return first?.[0] ?? null;
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem("jah_token", token);
  localStorage.setItem("jah_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("jah_token");
  localStorage.removeItem("jah_user");
}

export async function signOut() {
  const token = localStorage.getItem("jah_token");
  if (token) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  clearSession();
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "JA";
}
