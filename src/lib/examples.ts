// Ví dụ minh hoạ theo từng danh mục — lấy từ seed 06 §5 và prototype v4.
// Chỉ dùng làm gợi ý/placeholder trên UI, KHÔNG phải dữ liệu thật.
import type { CategoryCode } from "./taxonomy";

/** Câu nhắc mẫu chuẩn 4N — chip bấm để điền nhanh trong form viết câu */
export const EXAMPLE_SUGGESTIONS: Record<CategoryCode, string[]> = {
  toc_do: [
    "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.",
    "Hẻm nhỏ, lòng người thì rộng — chạy chậm giùm nhau.",
  ],
  trom_cap: [
    "Khoá cửa cẩn thận nha, đi đâu cũng an tâm hơn.",
    "Thấy người lạ, mình hỏi thăm một câu cho ấm ngõ.",
  ],
  an_toan_tre_em: [
    "Tụi nhỏ hay chơi trước sân, mình để mắt giùm một chút nha.",
    "Tan học đông vui, nhường tụi nhỏ qua đường trước nha.",
  ],
  chieu_sang: [
    "Bật giùm bóng đèn trước ngõ, tối về ai cũng thấy đường.",
    "Đèn nhà mình sáng thêm chút, ngõ mình ấm thêm nhiều.",
  ],
  ve_sinh: [
    "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.",
    "Quét thêm một nhát trước cửa, sạch nhà mình vui cả xóm.",
  ],
  phong_chay: [
    "Ra khỏi phòng nhớ tắt bếp, cả khu trọ ngủ ngon.",
    "Sạc xe chỗ thoáng, ngủ ngon cả xóm trọ mình.",
  ],
  giup_nhau: [
    "Trời sắp mưa, hô nhau cất đồ — một tiếng gọi đỡ cả buổi phơi.",
    "Nhà ai có chuyện, mình ghé hỏi một câu cho đỡ tủi.",
  ],
  nguoi_gia: [
    "Đi ngang nhà cụ, chào một tiếng — cụ vui cả buổi.",
    "Ông bà đi chậm, mình chờ chút một — ngõ mình đâu có vội.",
  ],
};

/** Placeholder mô tả vấn đề khi đề xuất góc xóm — theo danh mục */
export const EXAMPLE_ISSUE_DESC: Record<CategoryCode, string> = {
  toc_do: "VD: Xe hay phóng nhanh đoạn cua, gần chỗ trẻ con chơi.",
  trom_cap: "VD: Dạo này hay mất đồ vặt để trước cửa.",
  an_toan_tre_em: "VD: Tụi nhỏ hay chạy ra đường lúc tan học, xe đông.",
  chieu_sang: "VD: Đoạn giữa ngách tối, buổi tối khó thấy đường.",
  ve_sinh: "VD: Góc cuối hẻm hay bị bỏ rác không đúng giờ.",
  phong_chay: "VD: Khu trọ đông người, nhiều xe sạc qua đêm.",
  giup_nhau: "VD: Nhiều cô chú lớn tuổi sống một mình, cần xóm để ý giúp nhau.",
  nguoi_gia: "VD: Ông bà hay đi bộ buổi chiều, xe ra vào đông.",
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
