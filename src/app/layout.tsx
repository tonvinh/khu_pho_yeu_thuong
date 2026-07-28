import type { Metadata } from "next";
import "./globals.css";
import { absoluteUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "Khu Phố Của Tôi — Cùng xây khu phố biết thương",
  description:
    "Chọn một góc xóm, cùng mọi người gửi những câu nhắc dễ thương theo tinh thần 4N và bấm “Thương” để bình chọn. Câu được nhiều lượt “Thương” nhất sẽ được FPT đưa lên biển thật.",
  openGraph: {
    title: "Khu Phố Của Tôi — Cùng xây khu phố biết thương",
    description: "Gửi một lời nhắc, thêm một chút thương cho xóm mình.",
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
