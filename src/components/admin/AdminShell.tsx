"use client";
// Khung admin: sidebar điều hướng + guard phiên (API tự bảo vệ; đây là UX)
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiGet, apiSend } from "../client-api";

const NAV = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/de-xuat", label: "📥 Duyệt đề xuất" },
  { href: "/admin/cau-nhac", label: "✍️ Duyệt câu nhắc" },
  { href: "/admin/bien", label: "🪧 Chọn câu & biển" },
  { href: "/admin/khu-pho", label: "🏘️ Khu phố & bản đồ" },
  { href: "/admin/leads", label: "🧧 Leads" },
  { href: "/admin/gian-lan", label: "🛡️ Chống gian lận" },
  { href: "/admin/diem", label: "🧾 Sổ cái điểm" },
  { href: "/admin/import", label: "📦 Bulk import" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ admin: { email: string } }>("/api/admin/me")
      .then((r) => setEmail(r.admin.email))
      .catch(() => router.push("/admin/login"));
  }, [router]);

  const logout = async () => {
    try { await apiSend("POST", "/api/admin/auth/logout"); } catch { /* bỏ qua */ }
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-cream-dark bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brick text-lg text-white">💛</span>
          <div>
            <div className="text-sm font-extrabold text-brick">Admin Khu Phố</div>
            <div className="max-w-[140px] truncate text-[11px] text-ink-soft">{email || "…"}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
                pathname === n.href ? "bg-brick text-white" : "text-ink hover:bg-cream"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="mt-auto rounded-xl px-3 py-2.5 text-left text-sm text-ink-soft hover:bg-cream">
          ← Đăng xuất
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Nav mobile */}
        <div className="flex gap-1 overflow-x-auto border-b border-cream-dark bg-white p-2 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                pathname === n.href ? "bg-brick text-white" : "bg-cream"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {title && <h2 className="mb-3 font-extrabold">{title}</h2>}
      {children}
    </div>
  );
}

export function Btn({
  onClick, children, variant = "primary", disabled,
}: {
  onClick?: () => void; children: React.ReactNode;
  variant?: "primary" | "outline" | "danger" | "ghost"; disabled?: boolean;
}) {
  const cls = {
    primary: "bg-brick text-white",
    outline: "border border-brick text-brick",
    danger: "bg-status-waiting text-white",
    ghost: "text-ink-soft",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}
