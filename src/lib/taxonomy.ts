// Taxonomy chủ đề — danh mục ĐÓNG, ĐÚNG 6 chủ đề (dieuchinh.1.8 ACTION LIST #2)
export const CATEGORIES = {
  khoe_moi_ngay: {
    label: "Khoẻ mỗi ngày",
    icon: "🏃",
    desc: "Kêu gọi người dân vận động, thể dục, đi bộ,...",
  },
  tre_con_trong_xom: {
    label: "Trẻ con trong xóm",
    icon: "🧒",
    desc: "Nhắc chạy chậm vì có trẻ nhỏ, khu vực trường học,...",
  },
  van_minh_tu_te: {
    label: "Lối sống văn minh, tử tế",
    icon: "💛",
    desc: "Đề cao nếp sống đẹp: Hỏi thăm, chào hỏi, giúp đỡ người lớn tuổi, treo đèn trước hiên tối,...",
  },
  giup_do_san_se: {
    label: "Giúp đỡ, san sẻ",
    icon: "🤝",
    desc: "Trông nhà giúp nhau, thấy lạ báo nhau, hô hoán khi cháy, giữ lối thông thoáng",
  },
  xom_xanh_sach: {
    label: "Xóm xanh, xóm sạch",
    icon: "🌿",
    desc: "Vứt rác đúng chỗ, giữ vệ sinh khi nuôi thú cưng, giữ ngõ sạch,...",
  },
  song_vui_co_ich: {
    label: "Sống vui, sống có ích",
    icon: "🎈",
    desc: "An toàn giao thông, không gây ồn",
  },
} as const;

export type CategoryCode = keyof typeof CATEGORIES;

export const CATEGORY_CODES = Object.keys(CATEGORIES) as CategoryCode[];

export function categoryLabel(code: string): string {
  return (CATEGORIES as Record<string, { label: string }>)[code]?.label ?? code;
}

export function categoryIcon(code: string): string {
  return (CATEGORIES as Record<string, { icon: string }>)[code]?.icon ?? "📍";
}

export function categoryDesc(code: string): string {
  return (CATEGORIES as Record<string, { desc: string }>)[code]?.desc ?? "";
}

export const ISSUE_STATUS_LABEL: Record<string, string> = {
  pending_review: "Chờ duyệt",
  waiting: "Đang chờ",
  voting: "Đang bình chọn",
  signed: "Đã có biển",
  rejected: "Từ chối",
};

// Figma bản 2/9 · B6: khối ưu đãi có 6 lựa chọn (lưới 3 cột × 2 hàng), nhãn đọc từ
// `docs/lp/Landing page.png`. Quyết định Q3 (2/9): GIỮ NGUYÊN 4 MÃ cũ và chỉ đổi
// nhãn hiển thị — `leads.interests` là text[] nên lead đã lưu không phải migrate;
// đổi mã sẽ làm hỏng báo cáo của sale trên dữ liệu lịch sử.
// Thứ tự khai báo = thứ tự hiện trên lưới.
export const INTERESTS = {
  internet: "FPT Internet",
  camera: "FPT Camera",
  fpt_play: "Truyền hình FPT Play",
  internet_tv: "Internet + truyền hình",
  internet_camera: "Internet + Camera",
  internet_tv_camera: "Internet + Truyền hình + Camera",
} as const;
