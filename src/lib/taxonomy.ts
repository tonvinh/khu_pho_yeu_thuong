// Taxonomy loại vấn đề — danh mục ĐÓNG, 8 loại (02 §2.1)
export const CATEGORIES = {
  toc_do: { label: "Tốc độ", icon: "🚸" },
  trom_cap: { label: "Trộm cắp", icon: "🔒" },
  an_toan_tre_em: { label: "An toàn trẻ em", icon: "🧒" },
  chieu_sang: { label: "Chiếu sáng", icon: "💡" },
  ve_sinh: { label: "Vệ sinh", icon: "🧹" },
  phong_chay: { label: "Phòng cháy", icon: "🧯" },
  giup_nhau: { label: "Giúp nhau, san sẻ", icon: "🤝" },
  nguoi_gia: { label: "Ông bà, người già", icon: "👵" },
} as const;

export type CategoryCode = keyof typeof CATEGORIES;

export const CATEGORY_CODES = Object.keys(CATEGORIES) as CategoryCode[];

export function categoryLabel(code: string): string {
  return (CATEGORIES as Record<string, { label: string }>)[code]?.label ?? code;
}

export function categoryIcon(code: string): string {
  return (CATEGORIES as Record<string, { icon: string }>)[code]?.icon ?? "📍";
}

export const ISSUE_STATUS_LABEL: Record<string, string> = {
  pending_review: "Chờ duyệt",
  waiting: "Đang chờ",
  voting: "Đang bình chọn",
  signed: "Đã có biển",
  rejected: "Từ chối",
};

export const INTERESTS = {
  internet: "📶 Internet cho cả nhà",
  internet_tv: "📺 Internet + Truyền hình",
  fpt_play: "🎬 Gói FPT Play",
  internet_camera: "📷 Internet + Camera",
} as const;
