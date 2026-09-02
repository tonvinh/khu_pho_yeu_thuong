// Biển "Khu phố biết thương" — dựng theo `INT - EPL-01 1` trong docs/lp/LandingpageFCM.fig.
//
// BẢN 2/9 ĐỔI HÌNH: khung biển từ 404×269 xuống **404×199** (r=8) và DẢI KHUYẾN MÃI Ở
// ĐÁY BIẾN MẤT — panel trắng nở ra chiếm gần hết tấm biển, chỉ còn lockup logo ở trên
// và câu nhắc ở giữa. Đối chiếu ảnh export `docs/lp/Landing page.png` (2880×7560 = 2x):
// panel trắng nằm ở 1.2%…98.3% ngang, 2%…97% dọc; lockup logo cao 12.6% bắt đầu ở 6.3%;
// chữ canh giữa phần còn lại, cap height 28.5px trên khổ 199 ⇒ cỡ chữ ≈ 9.6cqw.
// (Bản 18/8 có thêm ô QR fpt.vn, 2 dòng banner, 2 chip số điện thoại và cụm FPT Play ở
// đáy — design 2/9 bỏ hết, nên 4 khoá site_content tương ứng cũng đã gỡ.)
//
// Mảng tĩnh cắt từ chính file .fig ở 4096px: public/brand/sign-logos.webp — lockup
// FPT Telecom + sticker "Khu phố biết thương".
//
// Dùng chung 3 nơi: trang chủ (SignGallery), admin duyệt câu và admin sửa nội dung.

/**
 * Cỡ chữ câu nhắc theo ĐỘ DÀI câu.
 *
 * Panel mới thấp hơn bản 18/8 (199 thay vì 269) nhưng chữ trong design lại TO hơn
 * (cap height 28.5 trên khổ 199 ⇒ ~9.6cqw): design chỉ vẽ câu 2 dòng ngắn. Câu thật
 * dài tới 120 ký tự (trần ô nhập) nên để một cỡ cố định là tràn khỏi panel — đo trên
 * Chrome thấy câu 3–4 dòng bị cắt cụt đáy.
 *
 * Ba bậc dưới đây giữ đúng cỡ của design cho câu ngắn, và thu lại vừa đủ để câu dài
 * nhất vẫn nằm trong ~150px chiều cao còn trống dưới lockup logo.
 */
function fontSizeFor(content: string): string {
  const n = content.trim().length;
  if (n <= 45) return "clamp(16px, 9.6cqw, 40px)"; // ≤ 3 dòng — đúng cỡ .fig
  if (n <= 75) return "clamp(14px, 7.4cqw, 31px)"; // ≤ 4 dòng
  return "clamp(12px, 6.2cqw, 26px)"; // ≤ 5 dòng, đủ cho câu 120 ký tự
}

export default function SignCard({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[404/199] overflow-hidden rounded-[8px] bg-gradient-to-br from-brick to-[#FF9E3D] ${className}`}
    >
      {/* Panel trắng: viền cam ló ra ~1.3% hai bên, 2% trên, 3% dưới (đo trên export) */}
      <div className="absolute inset-x-[1.3%] bottom-[3%] top-[2%] flex flex-col rounded-[6px] bg-white px-[3.2%] pt-[4.5%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/sign-logos.webp"
          alt="FPT Telecom — Khu phố biết thương"
          loading="lazy"
          className="block w-full"
        />
        {/* Câu nhắc canh giữa khoảng trống dưới lockup. Cỡ chữ tính bằng cqw của chính
            tấm biển (`.kp-sign` đặt container-type) nên biển to nhỏ gì chữ cũng đúng
            tỷ lệ; clamp để ở khổ mobile chữ không tụt xuống dưới ngưỡng đọc được.
            `min-h-0` để flex item được phép co lại thay vì đẩy tràn panel. */}
        <p
          style={{ fontSize: fontSizeFor(content) }}
          className="m-0 flex min-h-0 flex-1 items-center justify-center px-[2%] pb-[2%] text-center font-display font-bold leading-[1.15] text-brick text-balance"
        >
          {content}
        </p>
      </div>
    </div>
  );
}
