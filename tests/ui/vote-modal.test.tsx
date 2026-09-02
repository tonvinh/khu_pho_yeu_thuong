// @vitest-environment jsdom
// Popup "Bình chọn lời nhắc" — QC 2/9 · C5 + quyết định Q6.
// QC phát hiện nút "Thương" là TOGGLE: bấm lần 2 rút phiếu, 29 → 28. Server có thu
// hồi điểm đúng (invalidateScoreEvent) nên không phải bug dữ liệu, nhưng BA chốt
// luật là "1 phiếu/câu, KHÔNG được rút" → đã bình chọn thì khoá nút.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import VoteModal from "@/components/home/VoteModal";
import { runNow } from "./helpers";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

const ISSUE = {
  id: "iss-1", category: "tre_con_trong_xom", location_text: "Hẻm 42 Lê Lợi",
  description: null, status: "voting", photo_url: null,
  neighborhood_id: "nb-1", neighborhood_name: "Xóm Lò Gốm",
};

const sugg = (over: Record<string, unknown> = {}) => ({
  id: "s1", content: "Đi chậm chút nha", status: "approved",
  author_name: "Bà Liên", is_mine: false, votes: 28, voted: false,
  sign_photo_url: null, ...over,
});

function setup(suggestions: ReturnType<typeof sugg>[]) {
  apiGet.mockResolvedValue({ issue: ISSUE, suggestions });
  render(
    <VoteModal
      issueId="iss-1"
      requireIdentity={runNow}
      onClose={vi.fn()}
      showToast={vi.fn()}
      onChanged={vi.fn()}
      onWrite={vi.fn()}
    />
  );
}

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiSend.mockResolvedValue({ ok: true, voted: true });
});
afterEach(cleanup);

const card = async (content: string) => {
  await waitFor(() => expect(screen.getByText(content)).toBeTruthy());
  return screen.getByText(content).closest("[data-sugg]")! as HTMLElement;
};

describe("VoteModal · C5/Q6 — không cho rút phiếu", () => {
  it("chưa bình chọn → nút bấm được, gọi API đúng câu", async () => {
    setup([sugg()]);
    const box = await card("Đi chậm chút nha");
    const btn = within(box).getByRole("button");
    expect(btn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith("POST", "/api/v1/suggestions/s1/vote"));
  });

  it("bấm xong thì nút KHOÁ lại ngay, bấm tiếp không gọi API lần hai", async () => {
    setup([sugg()]);
    const box = await card("Đi chậm chút nha");
    const btn = within(box).getByRole("button");
    fireEvent.click(btn);
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(btn.hasAttribute("disabled")).toBe(true));
    fireEvent.click(btn);
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it("số phiếu chỉ TĂNG, không có đường giảm", async () => {
    setup([sugg({ votes: 28 })]);
    const box = await card("Đi chậm chút nha");
    fireEvent.click(within(box).getByRole("button"));
    await waitFor(() => expect(within(box).getByText("29")).toBeTruthy());
    fireEvent.click(within(box).getByRole("button"));
    expect(within(box).getByText("29")).toBeTruthy();
  });

  it("câu đã bình chọn từ trước (voted=true) thì nút khoá sẵn", async () => {
    setup([sugg({ voted: true })]);
    const box = await card("Đi chậm chút nha");
    expect(within(box).getByRole("button").hasAttribute("disabled")).toBe(true);
    expect(box.textContent).toContain("đã thương");
  });

  it("câu của chính mình vẫn không bấm được (quy tắc cứng 3)", async () => {
    setup([sugg({ is_mine: true })]);
    const box = await card("Đi chậm chút nha");
    expect(within(box).queryByRole("button")).toBeNull();
    expect(box.textContent).toContain("câu của bạn");
  });

  it("lỗi phụ thuộc: server từ chối → trả lại số cũ và mở khoá nút", async () => {
    apiSend.mockRejectedValue(new Error("Bạn đã bình chọn câu này rồi 💛"));
    setup([sugg({ votes: 28 })]);
    const box = await card("Đi chậm chút nha");
    fireEvent.click(within(box).getByRole("button"));
    await waitFor(() => expect(within(box).getByText("28")).toBeTruthy());
    expect(within(box).getByRole("button").hasAttribute("disabled")).toBe(false);
  });
});
