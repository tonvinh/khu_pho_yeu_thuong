// @vitest-environment jsdom
// Popup "Cây bút khu phố" — QC Figma bản 2/9 · B10 (frame MỚI 7727:1743, web CHƯA có).
// Mở từ nút "Bình chọn" ở tab 3 của IssueBoard (quyết định Q7).
// .fig: tên + phường 30px Bold · dòng mời 18px Regular · mỗi câu là thẻ 636×81 nền
// #E8F8FF KHÔNG viền, gồm nội dung 18px + pin địa chỉ + pill "Đạt chuẩn 4N" 125×25
// nền #2323FF + nút thương 156×43 r=80 nền #FF8206 với "160 lượt thương".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AmbassadorModal from "@/components/home/AmbassadorModal";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

const note = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  content: "Đi chậm chút nha, có trẻ con đang chơi",
  ward: "Phường Bàn Cờ",
  city: "Thành phố Hồ Chí Minh",
  votes: 160,
  voted: false,
  is_mine: false,
  ...over,
});

const detail = (over: Record<string, unknown> = {}) => ({
  display_name: "Chị Dậu",
  share_slug: "chi-dau-abc",
  ward: "Phường Bàn Cờ",
  city: "Thành phố Hồ Chí Minh",
  notes: [note()],
  ...over,
});

function modal(over: Record<string, unknown> = {}) {
  return render(
    <AmbassadorModal slug="chi-dau-abc" onClose={vi.fn()} showToast={vi.fn()} onChanged={vi.fn()} {...over} />
  );
}

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiGet.mockResolvedValue({ ambassador: detail() });
  apiSend.mockResolvedValue({ ok: true, voted: true });
});
afterEach(cleanup);

describe("AmbassadorModal · B10 — khung và nội dung", () => {
  it("gọi đúng endpoint theo share_slug", async () => {
    modal();
    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith("/api/v1/ambassadors/chi-dau-abc")
    );
  });

  it("tiêu đề popup là 'Cây bút khu phố'", async () => {
    modal();
    await waitFor(() => expect(screen.getByText("Cây bút khu phố")).toBeTruthy());
  });

  it("hiện 'Tên - Phường, TP' và dòng mời của design", async () => {
    modal();
    await waitFor(() =>
      expect(screen.getByText("Chị Dậu - Phường Bàn Cờ, TP. Hồ Chí Minh")).toBeTruthy()
    );
    expect(screen.getByText("Cùng bình chọn cho cây bút khu phố bạn nhé")).toBeTruthy();
  });

  it("mỗi câu là thẻ nền #E8F8FF, có pin địa chỉ và pill 'Đạt chuẩn 4N'", async () => {
    modal();
    await waitFor(() => expect(screen.getByText(/Đi chậm chút nha/)).toBeTruthy());
    const card = screen.getByText(/Đi chậm chút nha/).closest("[data-note]")! as HTMLElement;
    expect(card.className).toContain("bg-[#E8F8FF]");
    expect(within(card).getByText("Phường Bàn Cờ, TP. Hồ Chí Minh")).toBeTruthy();
    expect(within(card).getByText("Đạt chuẩn 4N")).toBeTruthy();
  });

  it("nút thương hiện đúng '160 lượt thương'", async () => {
    modal();
    await waitFor(() => expect(screen.getByRole("button", { name: /160 lượt thương/ })).toBeTruthy());
  });
});

describe("AmbassadorModal · B10 — bình chọn", () => {
  it("bấm thương gọi API đúng câu, số tăng và nút khoá (Q6)", async () => {
    modal();
    const btn = await screen.findByRole("button", { name: /160 lượt thương/ });
    fireEvent.click(btn);
    expect(apiSend).toHaveBeenCalledWith("POST", "/api/v1/suggestions/s1/vote");
    await waitFor(() => expect(screen.getByText(/161 lượt thương/)).toBeTruthy());
    expect(screen.getByRole("button", { name: /161 lượt thương/ }).hasAttribute("disabled")).toBe(true);
  });

  it("câu đã thương từ trước thì nút khoá sẵn", async () => {
    apiGet.mockResolvedValue({ ambassador: detail({ notes: [note({ voted: true })] }) });
    modal();
    const btn = await screen.findByRole("button", { name: /160 lượt thương/ });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("câu của chính mình KHÔNG có nút thương (quy tắc cứng 3)", async () => {
    apiGet.mockResolvedValue({ ambassador: detail({ notes: [note({ is_mine: true })] }) });
    modal();
    await waitFor(() => expect(screen.getByText(/Đi chậm chút nha/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /lượt thương/ })).toBeNull();
  });

  it("server từ chối thì hoàn lại số cũ và mở khoá nút", async () => {
    apiSend.mockRejectedValue(new Error("Bạn đã bình chọn câu này rồi 💛"));
    const showToast = vi.fn();
    modal({ showToast });
    const btn = await screen.findByRole("button", { name: /160 lượt thương/ });
    fireEvent.click(btn);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Bạn đã bình chọn câu này rồi 💛"));
    expect(screen.getByRole("button", { name: /160 lượt thương/ }).hasAttribute("disabled")).toBe(false);
  });
});

describe("AmbassadorModal · biên và lỗi", () => {
  it("lỗi phụ thuộc: API 404/500 → báo không tìm thấy, không crash", async () => {
    apiGet.mockRejectedValue(new Error("404"));
    modal();
    await waitFor(() => expect(screen.getByText(/Không tìm thấy cây bút này/)).toBeTruthy());
  });

  it("cây bút chưa có câu nào được duyệt → câu rỗng, không có thẻ", async () => {
    apiGet.mockResolvedValue({ ambassador: detail({ notes: [] }) });
    const { container } = modal();
    await waitFor(() => expect(screen.getByText(/chưa có câu nào được duyệt/i)).toBeTruthy());
    expect(container.querySelectorAll("[data-note]")).toHaveLength(0);
  });

  it("cây bút chưa gắn khu phố → chỉ hiện tên, không có dấu gạch thừa", async () => {
    apiGet.mockResolvedValue({ ambassador: detail({ ward: null, city: null }) });
    modal();
    await waitFor(() => expect(screen.getByTestId("amb-name").textContent).toBe("Chị Dậu"));
  });
});
