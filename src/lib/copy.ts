// Copy chuẩn — gốc từ 06-CONTENT-COPY §2, đã cập nhật wording theo
// docs/khupho_dieuchinh_28_7.xlsx (bản duyệt 28/7). Không tự ý sửa lời.
export const COPY = {
  heroTitle1: "Muốn gửi một lời thương cho xóm mình?",
  heroTitle2: "Hãy viết một câu nhắc nhỏ nhẹ nhé!",
  heroBody:
    "Chọn một góc xóm, cùng mọi người gửi những câu nhắc dễ thương theo tinh thần 4N và bấm “Thương” để bình chọn. Câu được nhiều lượt “Thương” nhất sẽ được FPT đưa lên biển thật, nối tiếp hơn 10.000 lời nhắc đã hiện diện khắp ngõ hẻm Việt Nam.",
  ctaMain: "+ Gửi lời nhắc cho xóm mình",
  ctaSecondary: "Xem góc phố đang chờ",
  ctaTertiary: "🧧 Quà dành cho cư dân",
  ctaCampaign: "Gửi một lời nhắc, thêm một chút thương cho xóm mình.",
  counterLabels: ["biển đã treo", "góc phố đang chờ", "người đóng góp", "khu phố tham gia"],
  suggestionPlaceholder: "VD: Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi...",
  note4N: "Câu nhắc của bạn sẽ được FPT chúng tớ duyệt theo chuẩn 4N trước khi hiển thị lên website",
  noteEthics:
    "💛 Giữ cho dễ thương: gọi tên một việc tốt cụ thể, không nêu đích danh người/nhà nào. Câu được chọn sẽ qua bộ lọc 4N và đội ngũ chiến dịch duyệt trước khi lên biển.",
  bannerGoodNews: (viTri: string) =>
    `🎉 Câu của bạn đã được treo tại ${viTri}! Cảm ơn bạn đã thương xóm mình.`,
  shareSign: (cau: string, viTri: string) =>
    `Câu nhắc của xóm mình đã lên biển thật 🎉 “${cau}” — ${viTri}. Cùng viết câu thương cho xóm bạn tại Khu Phố Của Tôi nhé!`,
  shareAmbassador:
    "Mình vừa được vinh danh trên bảng “Cây bút của khu phố” 🏆 Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình nha!",
  shareCertified: (tenKhu: string) =>
    `${tenKhu} đã đạt “Khu phố biết thương” chuẩn 4N 💛 100% biển đã treo!`,
  optInCheckbox: "Tôi đồng ý để FPT liên hệ tư vấn ưu đãi dành riêng cho cư dân “Khu phố biết thương”.",
  optInNoteTier1: "Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn.",
  leadBadge: "🧧 Món quà nhỏ gửi người góp lời thương",
  leadTitle: "FPT muốn gửi lại xóm mình một điều dễ thương",
  leadBody:
    "FPT dành riêng cho cư dân “Khu phố biết thương” những ưu đãi khi đăng ký Internet, Truyền hình và FPT Play. Khi muốn tìm hiểu thêm, bạn chỉ cần để lại thông tin để FPT liên hệ tư vấn.",
  leadPrivacy:
    "🔒 Số điện thoại chỉ được sử dụng để tư vấn ưu đãi này khi có sự đồng ý của bạn, không dùng cho mục đích khác và không tự động gọi mời.",
  leadButton: "Nhận ưu đãi của xóm mình",
  footerSupport:
    "Đã là khách hàng của FPT và cần hỗ trợ kỹ thuật? Gọi 1900 6600, không cần điền biểu mẫu này.",
  panelSignTitle: "Biển đã treo tại đây",
  panelSignThanks: "Cảm ơn cả khu phố đã cùng viết nên câu nhắc này 💛",
  proposeWarning:
    "⚠️ Khu Phố Của Tôi tiếp nhận những góp ý về an toàn và nếp sống khu phố. Mỗi đề xuất sẽ được xem xét trước khi hiển thị để lời nhắc luôn phù hợp và văn minh.",
  leaderboardTitle: "🏆 Cây bút của khu phố",
  leaderboardSub: "Những cây bút nhận được nhiều lượt “Thương” nhất từ bà con",
  toastSuggestionSent: "Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛",
  emptySuggestions: "Chưa có câu nào. Bạn viết câu đầu tiên cho điểm này nhé!",
} as const;
