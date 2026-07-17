// Copy chuẩn — dùng NGUYÊN VĂN từ 06-CONTENT-COPY §2 (quy tắc cứng 6)
export const COPY = {
  heroTitle1: "Muốn gửi một lời thương cho xóm mình?",
  heroTitle2: "Viết một câu nhắc nhỏ nhẹ.",
  heroBody:
    "Bạn chọn một góc xóm. Cả xóm cùng viết câu nhắc dễ thương theo chuẩn 4N và bấm “thương” để bình chọn. Câu được thương nhiều nhất sẽ thành biển thật do FPT treo — nối tiếp hơn 10.000 lời nhắc đã có mặt khắp ngõ hẻm Việt Nam.",
  ctaMain: "+ Gửi lời nhắc cho xóm mình",
  ctaSecondary: "Xem góc xóm đang chờ",
  ctaTertiary: "🧧 Ưu đãi cư dân",
  ctaCampaign: "“Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình.”",
  counterLabels: ["biển đã treo", "góc xóm đang chờ", "người đóng góp", "khu phố tham gia"],
  suggestionPlaceholder: "VD: Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi...",
  note4N: "Câu của bạn sẽ được đội chiến dịch duyệt theo chuẩn 4N trước khi hiển thị",
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
  optInCheckbox: "Tôi muốn nhận ưu đãi dành riêng cho cư dân khu phố biết thương từ FPT.",
  optInNoteTier1: "Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn.",
  optInNoteTier2: "Không tick, không sao cả — câu nhắc của bạn vẫn được trân trọng như nhau.",
  leadBadge: "🧧 Món quà nhỏ cho người góp câu thương",
  leadTitle: "FPT muốn gửi lại xóm mình một điều dễ thương",
  leadBody:
    "FPT xin gửi lại ưu đãi dành riêng cho cư dân khu phố biết thương: gói Internet, Truyền hình và FPT Play với mức giá “tình làng nghĩa xóm”. Chỉ khi bạn muốn, tụi mình mới liên hệ.",
  leadPrivacy:
    "🔒 Số điện thoại của bạn chỉ dùng để gửi ưu đãi này khi bạn chủ động đồng ý — không dùng cho bất kỳ mục đích nào khác, không tự động gọi mời.",
  leadButton: "Nhận ưu đãi của xóm mình",
  footerSupport:
    "Đang là khách FPT và cần hỗ trợ kỹ thuật? Gọi tổng đài 1900 6600 — không cần điền form này.",
  panelSignTitle: "Biển đã treo tại đây",
  panelSignThanks: "Cảm ơn cả khu phố đã cùng viết nên câu nhắc này 💛",
  proposeWarning:
    "⚠️ Danh mục đóng: chỉ nhận vấn đề an toàn đời thường. Mọi đề xuất hiển thị sau khi qua duyệt — đây là bước giữ trung lập và đúng mực.",
  leaderboardTitle: "🏆 Cây bút của khu phố",
  leaderboardSub: "Người viết câu nhắc được cả xóm thương nhất",
  toastSuggestionSent: "Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛",
  emptySuggestions: "Chưa có câu nào. Bạn viết câu đầu tiên cho điểm này nhé!",
} as const;
