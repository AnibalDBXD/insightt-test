import type { ApiErrorCode } from "./http";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: Record<string, string[]>;

  constructor(status: number, code: ApiErrorCode, details?: Record<string, string[]>) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TOKEN_KEY = "auth.accessToken";
const EMAIL_KEY = "auth.email";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionEmail() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EMAIL_KEY);
}

export function saveSession(accessToken: string, email: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: ApiErrorCode; details?: Record<string, string[]> };
  };
  if (!res.ok) {
    throw new ApiError(res.status, data.error?.code || "INTERNAL_ERROR", data.error?.details);
  }
  return data as T;
}
