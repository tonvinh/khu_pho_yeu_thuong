// Ảnh OG trang chủ (dieuchinh.1.8 #18) — trước đây chỉ subpage có OG image nên
// share link gốc lên MXH không hiện thumbnail. Render động bằng next/og như các trang share.
import { ogCard, OG_SIZE } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Khu Phố Của Tôi — Cùng xây khu phố biết thương";

export default function Image() {
  return ogCard({
    badge: "Khu phố biết thương",
    title: "Muốn gửi một lời thương cho xóm mình?",
    subtitle: "Viết câu nhắc 4N, bấm “Thương” để bình chọn — câu được thương nhất sẽ lên biển thật.",
    emoji: "💛",
  });
}
