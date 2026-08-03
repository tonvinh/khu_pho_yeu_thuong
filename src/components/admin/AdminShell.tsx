"use client";
// Khung admin: sidebar điều hướng + guard phiên (API tự bảo vệ; đây là UX)
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiGet, apiSend } from "../client-api";

// Mục "Khu phố" tách riêng (yêu cầu 3/8) — bảng quản lý thông tin, ảnh, trạng thái
// hiển thị/tiêu biểu/chứng nhận 4N + vị trí block tiêu biểu (bỏ quản lý bản đồ/pin).
const NAV = [
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/khu-pho", icon: "🏘️", label: "Khu phố" },
  { href: "/admin/cau-nhac", icon: "✍️", label: "Câu duyệt" },
  { href: "/admin/voting", icon: "💛", label: "Theo dõi thương" },
  { href: "/admin/leads", icon: "🧧", label: "Leads" },
  { href: "/admin/gian-lan", icon: "🛡️", label: "Chống gian lận" },
  { href: "/admin/diem", icon: "🧾", label: "Sổ cái điểm" },
  { href: "/admin/import", icon: "📦", label: "Bulk import" },
];

const SIDEBAR_KEY = "kp_admin_sidebar"; // localStorage: "collapsed" | "open"

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  // Thu gọn sidebar (chỉ icon) — đọc localStorage sau mount để không lệch SSR
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    apiGet<{ admin: { email: string } }>("/api/admin/me")
      .then((r) => setEmail(r.admin.email))
      .catch(() => router.push("/admin/login"));
  }, [router]);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "collapsed");
  }, []);
  const toggleSidebar = () =>
    setCollapsed((c) => {
      localStorage.setItem(SIDEBAR_KEY, c ? "open" : "collapsed");
      return !c;
    });

  const logout = async () => {
    try { await apiSend("POST", "/api/admin/auth/logout"); } catch { /* bỏ qua */ }
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <aside
        className={`hidden shrink-0 flex-col border-r border-cream-dark bg-white transition-[width] duration-200 md:flex ${
          collapsed ? "w-[64px] p-2" : "w-60 p-4"
        }`}
      >
        <div className={`mb-4 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brick text-lg text-white">💛</span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-brick">Admin Khu Phố</div>
              <div className="max-w-[140px] truncate text-[11px] text-ink-soft">{email || "…"}</div>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className={`mb-2 rounded-xl py-1.5 text-sm font-bold text-ink-soft hover:bg-cream hover:text-brick ${
            collapsed ? "px-0 text-center" : "px-3 text-left"
          }`}
        >
          {collapsed ? "»" : "« Thu gọn"}
        </button>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={n.label}
              className={`rounded-xl py-2.5 text-sm font-semibold ${
                collapsed ? "px-0 text-center text-base" : "px-3"
              } ${pathname === n.href ? "bg-brick text-white" : "text-ink hover:bg-cream"}`}
            >
              {n.icon}
              {!collapsed && <span className="ml-1.5">{n.label}</span>}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          title="Đăng xuất"
          className={`mt-auto rounded-xl py-2.5 text-sm text-ink-soft hover:bg-cream ${
            collapsed ? "px-0 text-center" : "px-3 text-left"
          }`}
        >
          ←{!collapsed && " Đăng xuất"}
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
              {n.icon} {n.label}
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
