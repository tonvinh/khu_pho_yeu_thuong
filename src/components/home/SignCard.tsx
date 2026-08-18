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

      {/* Dải khuyến mãi ở đáy — toạ độ lấy TỪ ARTWORK gốc (đo trên ảnh 4096×2731 rồi
          quy về khổ biển 404×269): dải bắt đầu y=194.1, ô QR 42×42 ở (13, 208.5),
          hai dòng chữ x=88.8 y=211.7 (cỡ 13, dãn dòng 13.8), hai chip 84×14 ở y=244,
          cụm FPT Play 107.5×65.8 ở (282.9, 198). Mọi cỡ chữ tính bằng cqw của chính
          tấm biển (.kp-sign đặt container-type) nên biển to nhỏ gì chữ cũng đúng tỷ lệ. */}
      <div className="absolute inset-0">
        {/* Ô QR + nhãn fpt.vn nằm DƯỚI ô (design), không phải chữ trong ô */}
        <span className="absolute left-[3.2%] top-[77.5%] block h-[15.6%] w-[10.4%] rounded-[12%] border-[0.4cqw] border-[#FF8206] bg-white" />
        <span className="absolute left-[3.2%] top-[94%] w-[10.4%] text-center text-[2.1cqw] font-bold leading-none text-white">
          fpt.vn
        </span>

        <p className="absolute left-[22%] top-[77.7%] m-0 w-[48%] text-[3.2cqw] font-bold leading-[1.06] text-white">
          {promo.line1}
          <span className="block">{promo.line2}</span>
        </p>

        <span className="absolute left-[18.3%] top-[90.3%] flex h-[5.6%] items-stretch gap-[1%]">
          <PromoChip label={["Liên hệ", "lắp đặt"]} value={promo.sale_phone} />
          <PromoChip label={["Hotline"]} value={promo.hotline} yellow />
        </span>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/sign-fptplay.webp"
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute left-[70%] top-[73.6%] hidden h-[24.5%] w-[26.6%] object-contain sm:block"
        />
      </div>
    </div>
  );
}

/** Chip số điện thoại ở dải khuyến mãi: nhãn nhỏ 1–2 dòng + số to (theo artwork) */
function PromoChip({
  label,
  value,
  yellow = false,
}: {
  label: string[];
  value: string;
  yellow?: boolean;
}) {
  return (
    <span
      className={`flex flex-none items-center gap-[0.6cqw] rounded-[1.2cqw] px-[1cqw] text-[#FF6A13] ${
        yellow ? "bg-[#FFEC00]" : "bg-white"
      }`}
    >
      <span className="flex-none whitespace-nowrap text-[1.05cqw] font-bold uppercase leading-[1.2]">
        {label.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </span>
      <span className="whitespace-nowrap text-[3.2cqw] font-bold leading-none">{value}</span>
    </span>
  );
}
