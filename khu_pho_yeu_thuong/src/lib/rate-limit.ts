// Rate limit in-memory (MVP chạy 1 instance — 07 §2.1):
// 3 định danh mới/thiết bị+IP/giờ · 30 hành động ghi/user/giờ · đăng nhập admin theo IP.
type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __kpRate: Map<string, Bucket> | undefined;
}

function store(): Map<string, Bucket> {
  if (!globalThis.__kpRate) globalThis.__kpRate = new Map();
  return globalThis.__kpRate;
}

/** true = cho phép; false = vượt ngưỡng */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const s = store();
  if (s.size > 50000) {
    for (const [k, b] of s) if (b.resetAt < now) s.delete(k);
  }
  const b = s.get(key);
  if (!b || b.resetAt < now) {
    s.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

export const LIMITS = {
  IDENTIFY_PER_DEVICE_HOUR: 3,
  WRITES_PER_USER_HOUR: 30,
  ADMIN_LOGIN_PER_IP_15MIN: 20,
  HOUR: 3600_000,
  MIN15: 900_000,
};
