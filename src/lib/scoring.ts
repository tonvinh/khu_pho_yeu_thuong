// Công thức điểm Đại sứ (05-SCORING-RULES — KHÔNG tự chế trọng số):
// ĐIỂM = 2×đề_xuất_duyệt + 5×câu_4N_duyệt + 1×lượt_thương + 30×câu_được_treo
export const POINTS = {
  issue_approved: 2,
  suggestion_approved: 5,
  vote_received: 1,
  sign_installed: 30,
} as const;

export type ScoreEventType = keyof typeof POINTS;

/** Trần 3 đề xuất/tuần (ISO): đề xuất duyệt thứ 4 trở đi ghi event points=0 */
export const WEEKLY_ISSUE_CAP = 3;

export interface ScoreEventLike {
  type: ScoreEventType;
  points: number;
  is_valid: boolean;
}

/** Tổng điểm = SUM(points của events hợp lệ) — sổ cái append-only, không lưu tổng cứng */
export function computeScore(events: ScoreEventLike[]): number {
  return events.reduce((sum, e) => (e.is_valid ? sum + e.points : sum), 0);
}

/** Điểm cho một event mới, áp trần tuần với issue_approved */
export function pointsFor(type: ScoreEventType, approvedThisWeekBefore = 0): number {
  if (type === "issue_approved" && approvedThisWeekBefore >= WEEKLY_ISSUE_CAP) return 0;
  return POINTS[type];
}

/** Checklist 4N (Q2 — admin tick thủ công): đủ 4 ô mới được duyệt hiển thị */
export interface Review4N {
  nhac: boolean;
  nho: boolean;
  nho2: boolean;
  nhe: boolean;
}

export function passes4N(r: Review4N | null | undefined): boolean {
  return !!r && r.nhac === true && r.nho === true && r.nho2 === true && r.nhe === true;
}
