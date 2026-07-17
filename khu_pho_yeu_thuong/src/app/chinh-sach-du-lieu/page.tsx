// Trang chính sách dữ liệu (PDPD — NĐ 13/2023, 07 §2.1)
export const metadata = { title: "Chính sách dữ liệu — Khu Phố Của Tôi" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-brick">Chính sách dữ liệu</h1>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
        <p>
          Website “Khu Phố Của Tôi” (chiến dịch “Khu phố biết thương” — FPT Telecom) tôn trọng
          và bảo vệ dữ liệu cá nhân của bạn theo Nghị định 13/2023/NĐ-CP.
        </p>
        <h2 className="text-lg font-bold">Số điện thoại của bạn được dùng thế nào?</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Định danh:</strong> số điện thoại được băm một chiều (HMAC-SHA256) làm khoá
            tài khoản — để mỗi người một tài khoản, một phiếu thương. Bản băm không thể khôi
            phục lại số gốc.
          </li>
          <li>
            <strong>Liên hệ ưu đãi:</strong> chỉ khi bạn chủ động tick đồng ý nhận ưu đãi, số
            của bạn mới được lưu (mã hoá AES-256-GCM) để đội FPT liên hệ đúng mục đích đó —
            không dùng cho bất kỳ mục đích nào khác, không tự động gọi mời.
          </li>
          <li>
            Số điện thoại gốc <strong>không bao giờ</strong> hiển thị công khai, không nằm trong
            đường dẫn, cookie hay nhật ký hệ thống.
          </li>
        </ul>
        <h2 className="text-lg font-bold">Quyền của bạn</h2>
        <p>
          Bạn có quyền yêu cầu xoá dữ liệu liên hệ bất cứ lúc nào qua tổng đài{" "}
          <strong>1900 6600</strong>. Khi xoá: số điện thoại mã hoá bị xoá và mọi phiên đăng nhập
          bị thu hồi; điểm và câu nhắc giữ ở dạng ẩn danh để bảo toàn kết quả bình chọn của
          cả xóm.
        </p>
        <p className="text-sm text-ink-soft">
          Hotline hỗ trợ: 1900 6600 · FPT Telecom
        </p>
      </div>
    </main>
  );
}
