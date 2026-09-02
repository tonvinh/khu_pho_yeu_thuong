// @vitest-environment jsdom
// QC 2/9 · B2 — ô "ngày treo" phải riêng cho TỪNG DÒNG. Trước khi sửa, cả khối dùng
// chung một state nên nhập ngày ở dòng A rồi bấm "Đã treo biển" ở dòng B lại ghi ngày
// của A — admin ghi sai ngày treo mà không nhận ra.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SignsPanel from "@/components/admin/SignsPanel";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  apiUpload: vi.fn(),
  BASE: "",
}));

const sugg = (id: string, content: string) => ({
  id, content, status: "produced", author_name: "Cô Bảy", votes: 3,
  issue_id: `i-${id}`, category: "sach_dep", location_text: `Hẻm ${id}`,
  neighborhood_name: "Xóm Lò Gốm",
});

const A = sugg("a", "Câu A");
const B = sugg("b", "Câu B");

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiSend.mockResolvedValue({ ok: true });
  apiGet.mockImplementation(async (path: string) =>
    path.includes("status=produced") ? { suggestions: [A, B] } : { suggestions: [] }
  );
});
afterEach(cleanup);

async function panel() {
  render(<SignsPanel />);
  await screen.findByText("“Câu A”");
  const dates = screen.getAllByLabelText(/Ngày treo biển/) as HTMLInputElement[];
  const buttons = screen.getAllByText("Đã treo biển");
  return { dates, buttons };
}

describe("SignsPanel — ngày treo theo từng dòng (B2)", () => {
  it("gõ ngày ở dòng A không làm đổi ô ngày của dòng B", async () => {
    const { dates } = await panel();
    expect(dates).toHaveLength(2);

    fireEvent.change(dates[0], { target: { value: "2026-09-01" } });
    expect(dates[0].value).toBe("2026-09-01");
    expect(dates[1].value).toBe("");
  });

  it("bấm 'Đã treo biển' ở dòng B gửi đúng ngày của B, không phải của A", async () => {
    const { dates, buttons } = await panel();
    fireEvent.change(dates[0], { target: { value: "2026-09-01" } });
    fireEvent.change(dates[1], { target: { value: "2026-09-02" } });

    fireEvent.click(buttons[1]);
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith("PATCH", "/api/admin/suggestions/b", {
      action: "installed",
      installed_date: "2026-09-02",
    });
  });

  it("dòng chưa nhập ngày thì bỏ trống installed_date (server tự lấy hôm nay)", async () => {
    const { dates, buttons } = await panel();
    fireEvent.change(dates[0], { target: { value: "2026-09-01" } });

    fireEvent.click(buttons[1]);
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith("PATCH", "/api/admin/suggestions/b", {
      action: "installed",
      installed_date: undefined,
    });
  });
});
