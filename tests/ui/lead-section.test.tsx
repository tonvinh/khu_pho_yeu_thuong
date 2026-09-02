// @vitest-environment jsdom
// Khối ưu đãi — QC Figma bản 2/9 · B6.
// Design đổi từ 4 lựa chọn 1 hàng sang 6 lựa chọn lưới 3 cột × 2 hàng, và tiêu đề
// khối canh TRÁI (x=167) chứ không canh giữa.
// Quyết định Q3 (2/9): GIỮ NGUYÊN 4 mã cũ (lead đã lưu trong DB không phải migrate),
// chỉ đổi NHÃN hiển thị và thêm 2 mã mới `camera` + `internet_tv_camera`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LeadSection from "@/components/home/LeadSection";
import { INTERESTS } from "@/lib/taxonomy";
import { runNow, siteContent } from "./helpers";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiGet.mockResolvedValue({ provinces: [{ code: "79", name: "Thành phố Hồ Chí Minh" }] });
  apiSend.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

function section() {
  return render(
    <LeadSection
      me={null}
      content={siteContent()}
      requireIdentity={runNow}
      showToast={vi.fn()}
    />
  );
}

const LABELS = [
  "FPT Internet",
  "FPT Camera",
  "Truyền hình FPT Play",
  "Internet + truyền hình",
  "Internet + Camera",
  "Internet + Truyền hình + Camera",
];

describe("taxonomy · B6/Q3 — danh mục dịch vụ", () => {
  it("có đúng 6 lựa chọn, đúng nhãn và đúng thứ tự của design", () => {
    expect(Object.values(INTERESTS)).toEqual(LABELS);
  });

  it("giữ nguyên 4 MÃ cũ để lead đã lưu không phải migrate (Q3)", () => {
    const keys = Object.keys(INTERESTS);
    for (const old of ["internet", "internet_tv", "fpt_play", "internet_camera"]) {
      expect(keys).toContain(old);
    }
    expect(keys).toContain("camera");
    expect(keys).toContain("internet_tv_camera");
  });
});

describe("LeadSection · B6 — lưới lựa chọn dịch vụ", () => {
  it("render đủ 6 nút", () => {
    section();
    for (const label of LABELS) expect(screen.getByRole("button", { name: label })).toBeTruthy();
  });

  it("lưới 3 cột (2 hàng × 3) thay vì 4 cột một hàng", () => {
    section();
    const grid = screen.getByRole("button", { name: "FPT Camera" }).parentElement!;
    expect(grid.className).toContain("sm:grid-cols-3");
    expect(grid.className).not.toContain("sm:grid-cols-4");
  });

  it("tiêu đề khối canh TRÁI theo .fig (x=167), không canh giữa", () => {
    const { container } = section();
    const h2 = container.querySelector("h2")!;
    expect(h2.className).not.toContain("text-center");
  });
});

describe("LeadSection · B6 — gửi đúng MÃ dịch vụ", () => {
  async function fill() {
    section();
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Thành phố Hồ Chí Minh" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
  }

  it("chọn 2 mã mới → body gửi lên đúng 'camera' và 'internet_tv_camera'", async () => {
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "FPT Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Internet + Truyền hình + Camera" }));
    fireEvent.click(screen.getByRole("button", { name: /Nhận ưu đãi|Gửi/ }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    const body = apiSend.mock.calls[0][2] as { interests: string[] };
    expect(body.interests).toEqual(["camera", "internet_tv_camera"]);
  });

  it("bấm lần hai thì bỏ chọn, không gửi mã đó", async () => {
    await fill();
    const btn = screen.getByRole("button", { name: "FPT Camera" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole("button", { name: /Nhận ưu đãi|Gửi/ }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    const body = apiSend.mock.calls[0][2] as { interests: string[] };
    expect(body.interests).toEqual([]);
  });

  it("lỗi: chưa tick đồng ý thì KHÔNG gọi API", async () => {
    section();
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "FPT Camera" }));
    fireEvent.click(screen.getByRole("button", { name: /Nhận ưu đãi|Gửi/ }));
    expect(apiSend).not.toHaveBeenCalled();
    expect(screen.getByText(/Cần tick đồng ý/)).toBeTruthy();
  });

  it("lỗi: đã tick nhưng chưa chọn tỉnh thì KHÔNG gọi API", async () => {
    section();
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Nhận ưu đãi|Gửi/ }));
    expect(apiSend).not.toHaveBeenCalled();
    expect(screen.getByText(/Chọn tỉnh\/thành/)).toBeTruthy();
  });
});
