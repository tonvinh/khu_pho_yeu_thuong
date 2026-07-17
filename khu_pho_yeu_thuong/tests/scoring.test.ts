// 3 test case điểm theo 05-SCORING-RULES §4 — BẮT BUỘC pass (CLAUDE.md quy tắc 4)
import { describe, it, expect } from "vitest";
import { computeScore, pointsFor, POINTS, WEEKLY_ISSUE_CAP, type ScoreEventLike } from "@/lib/scoring";

function events(issues: number, suggestions: number, votes: number, signs: number): ScoreEventLike[] {
  const out: ScoreEventLike[] = [];
  for (let i = 0; i < issues; i++) out.push({ type: "issue_approved", points: POINTS.issue_approved, is_valid: true });
  for (let i = 0; i < suggestions; i++) out.push({ type: "suggestion_approved", points: POINTS.suggestion_approved, is_valid: true });
  for (let i = 0; i < votes; i++) out.push({ type: "vote_received", points: POINTS.vote_received, is_valid: true });
  for (let i = 0; i < signs; i++) out.push({ type: "sign_installed", points: POINTS.sign_installed, is_valid: true });
  return out;
}

describe("Công thức điểm Đại sứ (05 §4)", () => {
  it("Cô Tám tạp hoá: 1 đề xuất + 3 câu + 34 thương + 1 treo = 81", () => {
    expect(computeScore(events(1, 3, 34, 1))).toBe(81);
  });

  it("Anh Dũng: 0 đề xuất + 2 câu + 47 thương + 1 treo = 87", () => {
    expect(computeScore(events(0, 2, 47, 1))).toBe(87);
  });

  it("Minh (lớp 11): 2 đề xuất + 4 câu + 21 thương + 0 treo = 45", () => {
    expect(computeScore(events(2, 4, 21, 0))).toBe(45);
  });

  it("event bị vô hiệu (lọc gian lận lặng lẽ) không được tính", () => {
    const evs = events(1, 3, 34, 1);
    evs.push({ type: "vote_received", points: 1, is_valid: false });
    expect(computeScore(evs)).toBe(81);
  });
});

describe("Trần 3 đề xuất/tuần (05 §3)", () => {
  it("đề xuất thứ 1–3 trong tuần được +2", () => {
    expect(pointsFor("issue_approved", 0)).toBe(2);
    expect(pointsFor("issue_approved", 2)).toBe(2);
  });
  it("đề xuất thứ 4 trở đi ghi event points=0 (vẫn hiển thị công khai)", () => {
    expect(pointsFor("issue_approved", WEEKLY_ISSUE_CAP)).toBe(0);
    expect(pointsFor("issue_approved", 10)).toBe(0);
  });
  it("các loại khác không có trần", () => {
    expect(pointsFor("vote_received")).toBe(1);
    expect(pointsFor("suggestion_approved")).toBe(5);
    expect(pointsFor("sign_installed")).toBe(30);
  });
});
