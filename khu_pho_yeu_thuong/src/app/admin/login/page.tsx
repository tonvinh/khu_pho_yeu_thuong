"use client";
// Đăng nhập admin (04 §0): email @fpt.com + mật khẩu, bước 2 TOTP nếu đã bật
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/components/client-api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ totp_required?: boolean; totp_token?: string }>(
        "POST", "/api/admin/auth/login", { email, password }
      );
      if (res.totp_required && res.totp_token) setTotpToken(res.totp_token);
      else router.push("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  const verifyTotp = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiSend("POST", "/api/admin/auth/totp", { totp_token: totpToken, code });
      router.push("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brick text-2xl text-white">
            💛
          </span>
          <h1 className="mt-3 text-xl font-extrabold">Admin Khu Phố</h1>
          <p className="text-xs text-ink-soft">Đội vận hành chiến dịch — FPT Telecom</p>
        </div>

        {!totpToken ? (
          <div className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@fpt.com"
              autoComplete="username"
              className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu (≥12 ký tự)"
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
            />
            {error && <p className="text-sm font-medium text-status-waiting">{error}</p>}
            <button
              onClick={login}
              disabled={busy}
              className="tap w-full rounded-full bg-brick px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {busy ? "Đang kiểm tra…" : "Đăng nhập"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-ink-soft">Nhập mã 6 số từ app authenticator:</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              onKeyDown={(e) => e.key === "Enter" && verifyTotp()}
              className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3 text-center text-2xl tracking-[0.5em]"
            />
            {error && <p className="text-sm font-medium text-status-waiting">{error}</p>}
            <button
              onClick={verifyTotp}
              disabled={busy || code.length !== 6}
              className="tap w-full rounded-full bg-brick px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              Xác thực
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
