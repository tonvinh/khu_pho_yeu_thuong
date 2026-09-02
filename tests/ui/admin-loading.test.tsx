// @vitest-environment jsdom
// QC 2/9 · B3 — hai trang admin loé thông báo RỖNG trong lúc đang tải: khung hình đầu
// tiên đã có rows.length === 0 nên "Chưa có khu phố nào…" / "Không có câu nào khớp bộ
// lọc." hiện ra trước khi dữ liệu về. Mạng chậm hoặc DB lạnh → admin tưởng mất sạch
// dữ liệu. Mẫu đúng là "Đang tải…" như /admin/gian-lan và /admin/noi-dung.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import NeighborhoodsPage from "@/app/admin/(panel)/khu-pho/page";
import SuggestionsTablePage from "@/app/admin/(panel)/loi-nhac/page";

const apiGet = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: vi.fn().mockResolvedValue({}),
  apiUpload: vi.fn().mockResolvedValue({}),
  BASE: "",
}));

/** Promise treo lơ lửng — giả lập mạng chậm / DB lạnh */
function pending<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

beforeEach(() => apiGet.mockReset());
afterEach(cleanup);

describe("/admin/khu-pho — trạng thái đang tải (B3)", () => {
  it("chưa có phản hồi → 'Đang tải…', KHÔNG nói 'Chưa có khu phố nào'", async () => {
    const gate = pending<{ neighborhoods: unknown[] }>();
    apiGet.mockImplementation((path = "") =>
      String(path).startsWith("/api/admin/neighborhoods") ? gate.promise : Promise.resolve({})
    );

    render(<NeighborhoodsPage />);
    expect(screen.getByText("Đang tải…")).toBeTruthy();
    expect(screen.queryByText(/Chưa có khu phố nào/)).toBeNull();

    gate.resolve({ neighborhoods: [] });
    await waitFor(() => expect(screen.getByText(/Chưa có khu phố nào/)).toBeTruthy());
    expect(screen.queryByText("Đang tải…")).toBeNull();
  });

  it("API lỗi cũng phải thoát trạng thái tải (không kẹt 'Đang tải…' mãi)", async () => {
    apiGet.mockImplementation((path = "") =>
      String(path).startsWith("/api/admin/neighborhoods")
        ? Promise.reject(new Error("500"))
        : Promise.resolve({})
    );
    render(<NeighborhoodsPage />);
    await waitFor(() => expect(screen.getByText(/Chưa có khu phố nào/)).toBeTruthy());
  });
});

describe("/admin/loi-nhac — trạng thái đang tải (B3)", () => {
  it("chưa có phản hồi → 'Đang tải…', KHÔNG nói 'Không có câu nào khớp bộ lọc'", async () => {
    const gate = pending<{ suggestions: unknown[]; total: number }>();
    apiGet.mockImplementation((path = "") => {
      const p = String(path);
      if (p.startsWith("/api/admin/suggestions")) return gate.promise;
      if (p.startsWith("/api/admin/neighborhoods")) return Promise.resolve({ neighborhoods: [] });
      return Promise.resolve({ overrides: {} });
    });

    render(<SuggestionsTablePage />);
    await waitFor(() => expect(screen.getByText("Đang tải…")).toBeTruthy());
    expect(screen.queryByText(/Không có câu nào khớp bộ lọc/)).toBeNull();

    gate.resolve({ suggestions: [], total: 0 });
    await waitFor(() => expect(screen.getByText(/Không có câu nào khớp bộ lọc/)).toBeTruthy());
  });
});
