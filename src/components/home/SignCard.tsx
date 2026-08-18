// Biển "Khu phố biết thương" dựng theo ĐÚNG artwork trong docs/lp/LandingpageFCM.fig
// (layer "INT - EPL-01 1", 404×269, r=8):
//   card nền CAM → panel trắng bo tròn ở trên (logo FPT + logo chiến dịch + câu nhắc)
//   → dải khuyến mãi ở đáy (ô QR "fpt.vn" · 2 dòng text · 2 chip số · artwork FPT Play).
// Hai mảng TĨNH của biển được cắt từ chính file .fig ở độ phân giải 4096px:
//   public/brand/sign-logos.webp   — lockup FPT Telecom + sticker "Khu phố biết thương"
//   public/brand/sign-fptplay.webp — cụm cầu thủ + TV + modem
// Text banner/hotline vẫn là DOM thật để /admin/noi-dung sửa được.
//
// Dùng chung 2 nơi: trang chủ (SignGallery) và màn admin duyệt câu (preview).

export interface SignPromo {
  /** Dòng 1 banner cam, VD "Đăng ký Internet nhanh" */
  line1: string;
  /** Dòng 2 banner cam, VD "Xem Ngoại Hạng Anh cùng FPT" */
  line2: string;
  /** Số tổng đài bán hàng in trên biển */
  sale_phone: string;
  /** Hotline chăm sóc khách hàng */
  hotline: string;
}

export default function SignCard({
  content,
  promo,
  className = "",
}: {
  content: string;
  promo: SignPromo;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[404/269] overflow-hidden rounded-[8px] bg-gradient-to-br from-brick to-[#FF9E3D] ${className}`}
    >
      {/* Panel trắng: chiếm ~71% chiều cao, chèn đều 2.5% mỗi bên */}
      <div className="absolute inset-x-[2.5%] top-[3.5%] flex h-[68%] flex-col rounded-[6px] bg-white px-[3.5%] pt-[3.5%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/sign-logos.webp"
          alt="FPT Telecom — Khu phố biết thương"
          loading="lazy"
          className="block w-full"
        />
        <p className="m-0 flex flex-1 items-center justify-center px-[2%] pb-[3%] text-center font-display text-[clamp(15px,6.4cqw,30px)] font-bold leading-[1.2] text-brick text-balance">
          {content}
        </p>
      </div>

      {/* Dải khuyến mãi ở đáy */}
      <div className="absolute inset-x-0 bottom-0 flex h-[28.5%] items-center gap-[2.5%] px-[2.5%]">
        <span className="grid aspect-square h-[72%] flex-none place-items-center rounded-[4px] bg-white text-[clamp(5px,1.1cqw,8px)] font-bold text-ink-soft">
          fpt.vn
        </span>
        <span className="min-w-0 flex-1 text-[clamp(7px,1.9cqw,11px)] font-bold leading-[1.3] text-white">
          {promo.line1}
          <span className="block">{promo.line2}</span>
          <span className="mt-[3%] flex flex-wrap gap-[3%]">
            <span className="rounded-[3px] bg-white px-1.5 py-[1px] text-[clamp(6px,1.7cqw,10px)] font-bold text-brick">
              {promo.sale_phone}
            </span>
            <span className="rounded-[3px] bg-[#FFE082] px-1.5 py-[1px] text-[clamp(6px,1.7cqw,10px)] font-bold text-[#C62828]">
              {promo.hotline}
            </span>
          </span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/sign-fptplay.webp"
          alt=""
          aria-hidden
          loading="lazy"
          className="hidden h-[92%] flex-none object-contain sm:block"
        />
      </div>
    </div>
  );
}
