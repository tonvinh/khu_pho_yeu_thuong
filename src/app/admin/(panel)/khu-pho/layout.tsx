// Tiêu đề tab riêng cho màn này (QC 4/9 · D4). Layout cha (panel) đã khai
// template "%s — Admin Khu Phố" nên ở đây chỉ cần tên ngắn.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khu phố",
  description: "Danh sách khu phố và hàng chờ duyệt đề xuất góc phố.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
