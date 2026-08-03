// Ví dụ minh hoạ theo từng chủ đề (6 chủ đề — dieuchinh.1.8 ACTION LIST #2).
// Chỉ dùng làm gợi ý/placeholder trên UI, KHÔNG phải dữ liệu thật.
import type { CategoryCode } from "./taxonomy";

/** Câu nhắc mẫu chuẩn 4N — chip bấm để điền nhanh trong form viết câu */
export const EXAMPLE_SUGGESTIONS: Record<CategoryCode, string[]> = {
  khoe_moi_ngay: [
    "Chiều mát ra đầu ngõ đi bộ vài vòng, khoẻ người vui xóm.",
    "Rủ nhau tập thể dục sáng, ngõ mình rộn ràng hẳn ra.",
  ],
  tre_con_trong_xom: [
    "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.",
    "Tan học đông vui, nhường tụi nhỏ qua đường trước nha.",
  ],
  van_minh_tu_te: [
    "Gặp nhau đầu ngõ, cười một cái — nhẹ cả ngày.",
    "Bật giùm bóng đèn trước hiên, tối về ai cũng thấy đường.",
    "Đi ngang nhà cụ, chào một tiếng — cụ vui cả buổi.",
  ],
  giup_do_san_se: [
    "Trời sắp mưa, hô nhau cất đồ — một tiếng gọi đỡ cả buổi phơi.",
    "Đi đâu vài bữa, gửi xóm để mắt giùm căn nhà nha.",
    "Để lối đi thông thoáng chút, có chuyện còn chạy kịp.",
  ],
  xom_xanh_sach: [
    "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.",
    "Dắt cưng đi dạo nhớ hốt dọn, ngõ sạch ai cũng vui.",
  ],
  song_vui_co_ich: [
    "Hẻm nhỏ, lòng người thì rộng — chạy chậm giùm nhau.",
    "Khuya rồi vặn nhỏ tiếng chút, cả xóm ngủ ngon.",
  ],
};

/** Placeholder mô tả vấn đề khi đề xuất góc phố — theo chủ đề */
export const EXAMPLE_ISSUE_DESC: Record<CategoryCode, string> = {
  khoe_moi_ngay: "VD: Xóm ít vận động, muốn rủ nhau đi bộ buổi chiều cho khoẻ.",
  tre_con_trong_xom: "VD: Tụi nhỏ hay chạy ra đường lúc tan học, xe đông.",
  van_minh_tu_te: "VD: Đoạn giữa ngách tối, mong nhà nào cũng treo đèn trước hiên.",
  giup_do_san_se: "VD: Nhiều cô chú lớn tuổi sống một mình, cần xóm để ý giúp nhau.",
  xom_xanh_sach: "VD: Góc cuối hẻm hay bị bỏ rác không đúng giờ.",
  song_vui_co_ich: "VD: Xe hay phóng nhanh đoạn cua, buổi tối còn ồn khuya.",
};

/** Biển mẫu cho mục "ví dụ minh hoạ" trên trang chủ */
export const EXAMPLE_SIGNS: Array<{ quote: string; by: string; spot: string }> = [
  { quote: "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.", by: "Bà Liên", spot: "Cuối hẻm chợ Xóm Mới" },
  { quote: "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.", by: "Cô Tám tạp hoá", spot: "Hẻm 42 Lê Lợi" },
  { quote: "Đi ngang nhà cụ, chào một tiếng — cụ vui cả buổi.", by: "Chú Ba xe ôm", spot: "Đầu ngõ 7 Trần Phú" },
  { quote: "Bật giùm bóng đèn trước ngõ, tối về ai cũng thấy đường.", by: "Anh Dũng", spot: "Ngách 5 Bàn Cờ" },
  { quote: "Trời sắp mưa, hô nhau cất đồ — một tiếng gọi đỡ cả buổi phơi.", by: "Quân", spot: "Khu trọ 88 Hai Bà Trưng" },
  { quote: "Gặp nhau đầu ngõ, cười một cái — nhẹ cả ngày.", by: "Anh Dũng", spot: "Hẻm 9 Phan Bội Châu" },
];
