export const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "cc_token";
const USER_KEY = "cc_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}
export function getStoredUser<T = any>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
export function setStoredUser(user: any | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: any;
  auth?: boolean;
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { body, headers, auth = true, ...rest } = options;
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const finalHeaders: Record<string, string> = { ...(headers as any) };
  let finalBody: BodyInit | undefined;

  if (body instanceof FormData) {
    finalBody = body;
  } else if (body !== undefined && body !== null) {
    finalHeaders["Content-Type"] = finalHeaders["Content-Type"] || "application/json";
    finalBody = typeof body === "string" ? body : JSON.stringify(body);
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: finalHeaders, body: finalBody });
  } catch (e: any) {
    throw new ApiError(e?.message || "Network error", 0);
  }

  let data: any = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else if (res.status !== 204) {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      setStoredUser(null);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    const msg =
      (data && (data.detail || data.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(typeof msg === "string" ? msg : "Request failed", res.status, data);
  }
  return data as T;
}
