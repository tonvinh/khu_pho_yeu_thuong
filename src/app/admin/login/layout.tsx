// Trang đăng nhập nằm ngoài nhóm (panel) nên tự khai tiêu đề đầy đủ + noindex
// (QC 4/9 · D4 — trước đây dùng chung tiêu đề của trang chủ công khai).
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập — Admin Khu Phố",
  description: "Đăng nhập tài khoản vận hành chiến dịch “Khu phố biết thương”.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
