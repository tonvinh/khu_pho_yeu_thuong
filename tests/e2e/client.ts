// Bộ đồ nghề cho test E2E: gọi THẲNG vào server đang chạy (dev hoặc `next start`),
// không mock gì cả — đi qua route thật, DB thật, MinIO thật.
//
// Vì sao không dùng Playwright: dự án chưa có runtime trình duyệt trong node_modules và
// phần cần trình duyệt thật (số đo px, media query, prefers-reduced-motion) đằng nào
// cũng phải đo bằng DevTools — CLAUDE.md đã ghi rõ "đừng tin test suông" cho khoản đó.
// Bộ này phủ luồng HTTP + HTML SSR; phần hình ảnh nghiệm thu bằng tay theo QC §nghiệm thu.
export const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3001";

/** Server có đang chạy không — dùng để `describe.skipIf` khi chạy CI không có server.
 *  Thử 3 lần / 20 giây: dev server vừa sửa file thì lần gọi đầu phải biên dịch lại
 *  route, dễ quá 4–5 giây và bị hiểu nhầm là "server không chạy". */
export async function serverUp(): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/counters`, { signal: AbortSignal.timeout(20_000) });
      if (res.ok) return true;
    } catch { /* thử lại */ }
  }
  return false;
}

/** Một "trình duyệt" tối giản: giữ cookie jar + tự gắn header CSRF double-submit */
export class Client {
  private jar = new Map<string, string>();
  /** Rate-limit định danh tính theo (IP + User-Agent) — 3 SĐT mới/thiết bị/giờ (02 §8.4).
   *  Mỗi Client là một "thiết bị" riêng nên phải có UA riêng, nếu không vài lần chạy
   *  test liên tiếp sẽ tự đâm vào trần và nhận 429. */
  private ua = `KhuPho-E2E/${Math.random().toString(36).slice(2, 10)}`;

  cookie(name: string): string | undefined {
    return this.jar.get(name);
  }

  private header(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private absorb(res: Response) {
    // getSetCookie() gom đủ nhiều header Set-Cookie (Next hay trả 2 cái một lượt)
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (!value || /^(deleted)?$/i.test(value)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("user-agent", this.ua);
    const cookies = this.header();
    if (cookies) headers.set("cookie", cookies);
    const csrf = this.jar.get("kp_csrf");
    if (csrf && init.method && init.method !== "GET") headers.set("x-csrf-token", csrf);
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
    this.absorb(res);
    return res;
  }

  /** Lấy cookie kp_csrf trước khi ghi dữ liệu (đúng như client-api.ts làm) */
  async primeCsrf(): Promise<void> {
    if (!this.jar.has("kp_csrf")) await this.fetch("/api/v1/csrf");
  }

  async getJson<T = any>(path: string): Promise<{ status: number; body: T }> {
    const res = await this.fetch(path);
    return { status: res.status, body: (await res.json().catch(() => ({}))) as T };
  }

  async sendJson<T = any>(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: T }> {
    await this.primeCsrf();
    const res = await this.fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as T };
  }

  /** Upload multipart (import file) */
  async sendForm<T = any>(path: string, form: FormData): Promise<{ status: number; body: T }> {
    await this.primeCsrf();
    const res = await this.fetch(path, { method: "POST", body: form });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as T };
  }

  async html(path: string): Promise<string> {
    const res = await this.fetch(path);
    return res.text();
  }
}

/** Đăng nhập admin thật (email @fpt.com + Argon2id). Trả null nếu sai thông tin. */
export async function adminClient(): Promise<Client | null> {
  const c = new Client();
  const { status } = await c.sendJson("POST", "/api/admin/auth/login", {
    email: process.env.E2E_ADMIN_EMAIL || "admin@fpt.com",
    password: process.env.E2E_ADMIN_PASSWORD || "KhuPho@2026!Demo",
  });
  return status === 200 && c.cookie("kp_admin_session") ? c : null;
}
