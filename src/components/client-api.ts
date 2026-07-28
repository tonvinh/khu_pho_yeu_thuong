"use client";
// Fetch helper phía client: tự gắn CSRF header (double-submit) + basePath

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

let csrfReady: Promise<void> | null = null;

async function ensureCsrf(): Promise<string> {
  let token = readCookie("kp_csrf");
  if (!token) {
    if (!csrfReady) csrfReady = fetch(`${BASE}/api/v1/csrf`).then(() => undefined);
    await csrfReady;
    token = readCookie("kp_csrf");
  }
  return token || "";
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw Object.assign(new Error("api"), { status: res.status, body: await res.json().catch(() => ({})) });
  return res.json();
}

export async function apiSend<T = unknown>(
  method: "POST" | "PATCH",
  path: string,
  body?: unknown
): Promise<T> {
  const csrf = await ensureCsrf();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error || "Có lỗi xảy ra"), { status: res.status, body: data });
  return data as T;
}

export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const csrf = await ensureCsrf();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "x-csrf-token": csrf },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error || "Có lỗi xảy ra"), { status: res.status, body: data });
  return data as T;
}

export { BASE };
