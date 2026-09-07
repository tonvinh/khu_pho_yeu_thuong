// @vitest-environment jsdom
// Popup "Thông tin khu phố" — QC Figma bản 2/9 · B9 (frame MỚI 7756:2954).
// Design đổi ruột: bỏ tiến độ 4N / 3 con số / lưới biển SignCard, thay bằng DANH SÁCH
// CÂU NHẮC, mỗi thẻ 636×73 r=16 viền #3D3D3D 1.5px gồm nội dung câu + pill trạng thái
// + tên người viết + nút Bình chọn viền xanh.
// Quyết định Q5 (2/9): đổi theo design mới, NHƯNG trang share /khu-pho/[slug] giữ lại
// ảnh + badge 4N (là lý do tồn tại của trang đó + ảnh OG) → prop `hero`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import NeighborhoodView from "@/components/home/NeighborhoodView";
import type { NeighborhoodDetail, NeighborhoodNote } from "@/components/home/types";

const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: vi.fn(),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

const note = (over: Partial<NeighborhoodNote> = {}): NeighborhoodNote => ({
  id: "s1",
  content: "Đi chậm chút nha, có trẻ con đang chơi",
  status: "approved",
  author_name: "Bà Liên",
  votes: 12,
  voted: false,
  is_mine: false,
  ...over,
});

const detail = (over: Partial<NeighborhoodDetail> = {}): NeighborhoodDetail => ({
  id: "nb-1",
  name: "Phường Bàn Cờ",
  slug: "phuong-ban-co",
  ward: "Phường Bàn Cờ",
  city: "Thành phố Hồ Chí Minh",
  certified_4n: false,
  certified_at: null,
  photo_urls: [],
  certificate_url: null,
  map_url: null,
  total_issues: 3,
  signed_issues: 1,
  suggestions_total: 5,
  progress_pct: 33,
  notes: [note()],
  ...over,
});

beforeEach(() => {
  apiSend.mockReset();
  apiSend.mockResolvedValue({ ok: true, voted: true });
});
afterEach(cleanup);

const view = (over: Partial<Parameters<typeof NeighborhoodView>[0]> = {}) =>
  render(<NeighborhoodView nb={detail()} {...over} />);

describe("NeighborhoodView · B9 — ruột theo design mới", () => {
  it("hiện tên khu phố, dòng địa chỉ và dòng mời", () => {
    view();
    expect(screen.getByText("Phường Bàn Cờ", { selector: "h3" })).toBeTruthy();
    // wardAddress: giữ nguyên "Phường Bàn Cờ", viết tắt tỉnh thành "TP. …" như design
    expect(screen.getByTestId("nb-address").textContent).toBe("Phường Bàn Cờ, TP. Hồ Chí Minh");
    expect(
      screen.getByText("Cùng tham gia viết bình chọn câu nhắc cho khu phố bạn nhé!")
    ).toBeTruthy();
  });

  it("bỏ hẳn khối tiến độ 4N, 3 con số và lưới biển của bản 18/8", () => {
    const { container } = view();
    expect(screen.queryByText(/Hành trình đạt chuẩn 4N/)).toBeNull();
    expect(screen.queryByText("Biển của khu phố")).toBeNull();
    expect(screen.queryByText(/góc phố tham gia/)).toBeNull();
    expect(container.querySelector(".kp-sign")).toBeNull();
  });

  it("mỗi câu là một thẻ: nội dung + tên người viết + nút Bình chọn", () => {
    view();
    const card = screen.getByText(/Đi chậm chút nha/).closest("[data-note]")! as HTMLElement;
    expect(within(card).getByText(/Bà Liên/)).toBeTruthy();
    expect(within(card).getByRole("button", { name: /Bình chọn/ })).toBeTruthy();
  });
});

describe("NeighborhoodView · B9 — pill trạng thái", () => {
  const cases: [NeighborhoodNote["status"], string][] = [
    ["approved", "Đang chờ bạn bình chọn"],
    ["installed", "Đã lên biển"],
    ["selected", "Chờ treo biển"],
    ["produced", "Chờ treo biển"],
  ];

  for (const [status, label] of cases) {
    it(`status='${status}' → pill "${label}"`, () => {
      view({ nb: detail({ notes: [note({ status })] }) });
      expect(screen.getByText(label)).toBeTruthy();
    });
  }

  it("pill 'Đã lên biển' dùng đúng cặp màu #F0FFC8 / #5ED400", () => {
    view({ nb: detail({ notes: [note({ status: "installed" })] }) });
    const pill = screen.getByText("Đã lên biển");
    expect(pill.className).toContain("bg-[#F0FFC8]");
    expect(pill.className).toContain("text-[#5ED400]");
  });
});

describe("NeighborhoodView · B9 — bình chọn trong popup", () => {
  it("bấm Bình chọn gọi API đúng câu và khoá nút (luật Q6)", async () => {
    view();
    const btn = screen.getByRole("button", { name: /Bình chọn/ });
    fireEvent.click(btn);
    expect(apiSend).toHaveBeenCalledWith("POST", "/api/v1/suggestions/s1/vote");
    await vi.waitFor(() => expect(btn.hasAttribute("disabled")).toBe(true));
  });

  it("câu đã bình chọn thì nút khoá sẵn", () => {
    view({ nb: detail({ notes: [note({ voted: true })] }) });
    expect(screen.getByRole("button", { name: /Đã bình chọn/ }).hasAttribute("disabled")).toBe(true);
  });

  it("câu của chính mình không có nút bình chọn (quy tắc cứng 3)", () => {
    view({ nb: detail({ notes: [note({ is_mine: true })] }) });
    expect(screen.queryByRole("button", { name: /Bình chọn/ })).toBeNull();
  });

  // Chốt 7/9: chỉ trạng thái `approved` ("Đang chờ bạn bình chọn") mới có nút —
  // câu đã chọn / chờ treo biển / đã lên biển thì hết vòng bình chọn.
  for (const status of ["selected", "produced", "installed"] as const) {
    it(`status='${status}' → KHÔNG có nút bình chọn`, () => {
      view({ nb: detail({ notes: [note({ status })] }) });
      expect(screen.queryByRole("button", { name: /Bình chọn/ })).toBeNull();
    });

    it(`status='${status}' dù đã bình chọn cũng không hiện nút "Đã bình chọn"`, () => {
      view({ nb: detail({ notes: [note({ status, voted: true })] }) });
      expect(screen.queryByRole("button", { name: /bình chọn/i })).toBeNull();
    });
  }
});

describe("NeighborhoodView · Q5 — prop hero cho trang share", () => {
  it("mặc định (popup) KHÔNG dựng khối ảnh + badge 4N", () => {
    const { container } = view({ nb: detail({ certified_4n: true, photo_urls: ["/a.webp"] }) });
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText("Đạt chuẩn 4N")).toBeNull();
  });

  it("hero=true (trang share) dựng ảnh + badge 4N để giữ nội dung chứng nhận", () => {
    const { container } = view({
      nb: detail({ certified_4n: true, photo_urls: ["/a.webp"] }),
      hero: true,
    });
    expect(container.querySelector("img")).toBeTruthy();
    expect(screen.getByText("Đạt chuẩn 4N")).toBeTruthy();
  });

  it("hero=true nhưng khu chưa có ảnh nào → không crash, có khối thay thế", () => {
    view({ nb: detail({ photo_urls: [], map_url: null }), hero: true });
    expect(screen.getByText(/Khu phố chưa có ảnh/)).toBeTruthy();
  });
});

describe("NeighborhoodView · biên", () => {
  it("khu chưa có câu nhắc nào → câu rỗng, không có thẻ", () => {
    const { container } = view({ nb: detail({ notes: [] }) });
    expect(container.querySelectorAll("[data-note]")).toHaveLength(0);
    expect(screen.getByText(/lời nhắc đầu tiên có thể là của bạn/)).toBeTruthy();
  });

  it("khu không có phường/tỉnh → chỉ hiện tên, không render dòng địa chỉ rỗng", () => {
    view({ nb: detail({ ward: null, city: null }) });
    expect(screen.queryByTestId("nb-address")).toBeNull();
  });
});
