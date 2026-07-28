// Token tạm cho bước 2 TOTP (5 phút, in-memory — MVP 1 instance)
import { sha256Hex, newSessionToken } from "./crypto";

declare global {
  // eslint-disable-next-line no-var
  var __kpTotpPending: Map<string, { adminId: string; expiresAt: number }> | undefined;
}

function store() {
  if (!globalThis.__kpTotpPending) globalThis.__kpTotpPending = new Map();
  return globalThis.__kpTotpPending;
}

export function createPendingTotp(adminId: string): string {
  const { token, tokenHash } = newSessionToken();
  store().set(tokenHash, { adminId, expiresAt: Date.now() + 5 * 60_000 });
  return token;
}

export function takePendingTotp(token: string): string | null {
  const key = sha256Hex(token);
  const entry = store().get(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  store().delete(key);
  return entry.adminId;
}
