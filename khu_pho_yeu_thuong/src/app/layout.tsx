import type { Metadata } from "next";
import "./globals.css";
import { absoluteUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "Khu Phố Của Tôi — Cùng xây khu phố biết thương",
  description:
    "Bạn chọn một góc xóm. Cả xóm cùng viết câu nhắc dễ thương theo chuẩn 4N và bấm “thương” để bình chọn. Câu được thương nhiều nhất sẽ thành biển thật do FPT treo.",
  openGraph: {
    title: "Khu Phố Của Tôi — Cùng xây khu phố biết thương",
    description: "Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình.",
    url: absoluteUrl("/"),
    siteName: "Khu Phố Của Tôi",
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
