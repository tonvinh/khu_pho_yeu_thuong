import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  // QC 4/9 · D4: mỗi màn admin có tiêu đề tab riêng. Trang là client component nên
  // metadata đặt ở layout của từng route; layout này giữ khuôn "<tên màn> — Admin Khu Phố".
  title: { default: "Dashboard — Admin Khu Phố", template: "%s — Admin Khu Phố" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
