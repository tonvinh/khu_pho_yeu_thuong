// @vitest-environment jsdom
// Top bar + banner báo tin của trang chủ — ba lỗi QC 2/9:
//  · A1 banner báo tin bị nền hero (absolute) phủ kín vì khối banner là `static`
//  · A3 nav chồng chữ ở mọi khổ 640–1169px vì bố cục Figma 1440 bật ngay từ sm=640
//  · B4 avatar không bấm được nên cư dân không đăng xuất được
// jsdom KHÔNG tính layout/media query nên ở đây kiểm ĐIỂM DỪNG khai báo trong markup;
// số đo chồng lấn thật đo bằng DOM trong trình duyệt (xem tests/e2e).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import HomeShell from "@/components/home/HomeShell";
import type { Me, NotificationItem } from "@/components/home/types";
import { homeData } from "./helpers";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

const ME: Me = {
  display_name: "Cô Bảy", share_slug: "co-bay-abc",
  neighborhood_id: "nb-1", neighborhood_name: "Xóm Lò Gốm", score: 82,
};

const NOTIF: NotificationItem = {
  id: "n1",
  type: "sign_installed",
  ref_id: "sg-1",
  payload: { location_text: "Hẻm QC 1" },
  created_at: "2026-09-02T00:00:00.000Z",
};

/** Trả lời theo đường dẫn — HomeShell gọi /api/v1/me rồi /api/v1/me/notifications */
function mockApi({ me = ME as Me | null, notifs = [] as NotificationItem[] } = {}) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") {
      if (!me) throw Object.assign(new Error("401"), { status: 401 });
      return { me };
    }
    if (path === "/api/v1/me/notifications") return { notifications: notifs };
    if (path === "/api/v1/leaderboard") return { ambassadors: [] };
    // LeadSection nạp danh mục tỉnh/thành ngay khi mount
    if (path.startsWith("/api/v1/geo")) return { provinces: [{ code: "79", name: "Thành phố Hồ Chí Minh" }] };
    return {};
  });
}

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiSend.mockResolvedValue({ ok: true });
  mockApi();
});
afterEach(cleanup);

describe("HomeShell · A1 — banner báo tin không bị nền hero phủ", () => {
  it("khối banner có `relative` (nền hero là absolute nên con `static` bị vẽ đè)", async () => {
    mockApi({ notifs: [NOTIF] });
    render(<HomeShell initial={homeData()} />);

    const line = await screen.findByText(/Hẻm QC 1/);
    // leo lên khối bao ngoài cùng của banner (div bg hero)
    const wrap = line.closest("div.bg-\\[var\\(--kp-hero-from\\)\\]");
    expect(wrap).toBeTruthy();
    expect(wrap!.className).toContain("relative");
  });

  it("banner 'đã treo biển' có nút Chia sẻ trỏ /bien/{id} và nút Đóng", async () => {
    mockApi({ notifs: [NOTIF] });
    render(<HomeShell initial={homeData()} />);
    const share = (await screen.findByText("Chia sẻ")) as HTMLAnchorElement;
    expect(share.getAttribute("href")).toBe("/bien/sg-1");
    expect(screen.getByText("Đóng")).toBeTruthy();
  });

  it("nền hero vẫn là lớp absolute aria-hidden (không đổi bố cục hero khi sửa A1)", () => {
    const { container } = render(<HomeShell initial={homeData()} />);
    const bg = container.querySelector('[aria-hidden].absolute.inset-x-0.top-0');
    expect(bg).toBeTruthy();
  });
});

describe("HomeShell · A3 — nav không chồng chữ ở dải 640–1169px", () => {
  it("hai link nav chỉ bật từ xl (1280), không phải sm (640)", () => {
    render(<HomeShell initial={homeData()} />);
    // "Góc phố đang chờ" cũng là nhãn của dải 3 con số → lấy đúng cái nằm trong <button> nav
    const link = screen
      .getAllByText("Góc phố đang chờ")
      .find((el) => el.tagName === "BUTTON")!;
    const nav = link.parentElement!;
    expect(nav.className).toContain("xl:flex");
    expect(nav.className).not.toContain("sm:flex");
    // link thứ hai nằm cùng khối nên cũng theo ngưỡng xl
    expect(nav.textContent).toContain("Quà dành cho cư dân");
  });

  it("nhãn CTA đầy đủ chỉ bật từ lg (1024); dưới đó dùng nhãn rút gọn", () => {
    render(<HomeShell initial={homeData()} />);
    const short = screen.getByText("+ Đề xuất");
    const full = screen.getByText("+ Đề xuất góc phố mới", { selector: "span" });
    expect(short.className).toContain("lg:hidden");
    expect(short.className).not.toContain("sm:hidden");
    expect(full.className).toContain("hidden");
    expect(full.className).toContain("lg:inline");
  });
});

describe("HomeShell · B4 — avatar mở menu đăng xuất", () => {
  it("đã định danh → avatar là nút, chưa định danh → không có avatar", async () => {
    const { unmount } = render(<HomeShell initial={homeData()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Tài khoản của Cô Bảy/ })).toBeTruthy());
    unmount();

    mockApi({ me: null });
    render(<HomeShell initial={homeData()} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/api/v1/me"));
    expect(screen.queryByRole("button", { name: /Tài khoản của/ })).toBeNull();
  });
});
