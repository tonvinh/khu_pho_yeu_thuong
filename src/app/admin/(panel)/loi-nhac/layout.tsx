// Tiêu đề tab riêng cho màn này (QC 4/9 · D4). Layout cha (panel) đã khai
// template "%s — Admin Khu Phố" nên ở đây chỉ cần tên ngắn.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lời nhắc",
  description: "Duyệt lời nhắc, chọn câu lên biển và theo vòng đời biển.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
