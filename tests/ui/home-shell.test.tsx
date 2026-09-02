// @vitest-environment jsdom
// Top bar + banner báo tin của trang chủ — ba lỗi QC 2/9:
//  · A1 banner báo tin bị nền hero (absolute) phủ kín vì khối banner là `static`
//  · A3 nav chồng chữ ở mọi khổ 640–1169px vì bố cục Figma 1440 bật ngay từ sm=640
//  · B4 avatar không bấm được nên cư dân không đăng xuất được
// jsdom KHÔNG tính layout/media query nên ở đây kiểm ĐIỂM DỪNG khai báo trong markup;
// số đo chồng lấn thật đo bằng DOM trong trình duyệt (xem tests/e2e).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// jsdom không cài `scrollIntoView` — nav "Đóng góp lời nhắc"/"Ưu đãi dành cho cư dân"
// gọi nó nên nếu không stub sẽ ném unhandled error, làm hỏng cả test khác cùng file.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
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
    const link = screen.getByRole("button", { name: "Đóng góp lời nhắc" });
    const nav = link.parentElement!;
    expect(nav.className).toContain("xl:flex");
    expect(nav.className).not.toContain("sm:flex");
    // link thứ hai nằm cùng khối nên cũng theo ngưỡng xl
    expect(nav.textContent).toContain("Đề xuất khu phố cần treo biển");
  });

  it("nhãn CTA đầy đủ chỉ bật từ lg (1024); dưới đó dùng nhãn rút gọn", () => {
    render(<HomeShell initial={homeData()} />);
    const short = screen.getByText("Ưu đãi");
    const full = screen.getByText("Ưu đãi dành cho cư dân", { selector: "span" });
    expect(short.className).toContain("lg:hidden");
    expect(short.className).not.toContain("sm:hidden");
    expect(full.className).toContain("hidden");
    expect(full.className).toContain("lg:inline");
  });
});

// ── QC Figma mới 2/9 · B1 ───────────────────────────────────────────────────
// Figma 7217:1990 đổi cả ba nhãn của thanh nav. Quan trọng hơn nhãn: CTA bên phải
// không còn mở form đề xuất nữa mà cuộn xuống khối ưu đãi — cửa vào luồng đề xuất
// chuyển sang LINK 2 "Đề xuất khu phố cần treo biển" (quyết định Q1, 2/9).
describe("HomeShell · B1 — nhãn nav và cửa vào luồng đề xuất", () => {
  const nav = () => screen.getByRole("button", { name: "Đóng góp lời nhắc" }).parentElement!;

  it("ba nhãn mới thay ba nhãn cũ", () => {
    render(<HomeShell initial={homeData()} />);
    expect(screen.getByRole("button", { name: "Đóng góp lời nhắc" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đề xuất khu phố cần treo biển" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ưu đãi dành cho cư dân/ })).toBeTruthy();
    expect(nav().textContent).not.toContain("Góc phố đang chờ");
    expect(nav().textContent).not.toContain("Quà dành cho cư dân");
  });

  it("LINK 2 mở popup đề xuất (cửa vào luồng, Q1)", () => {
    render(<HomeShell initial={homeData()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đề xuất khu phố cần treo biển" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("dialog").textContent).toContain("Đề xuất góc phố");
  });

  it("CTA 'Ưu đãi dành cho cư dân' chỉ cuộn xuống khối ưu đãi, KHÔNG mở popup", () => {
    render(<HomeShell initial={homeData()} />);
    fireEvent.click(screen.getByRole("button", { name: /Ưu đãi dành cho cư dân/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("LINK 1 'Đóng góp lời nhắc' cũng chỉ cuộn, không mở popup", () => {
    render(<HomeShell initial={homeData()} />);
    fireEvent.click(screen.getByRole("button", { name: "Đóng góp lời nhắc" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lề trái thanh nav 77px theo .fig (link 1 bắt đầu x=159 trên khối từ x=82)", () => {
    const { container } = render(<HomeShell initial={homeData()} />);
    const bar = container.querySelector(".max-w-\\[1276px\\]")!;
    expect(bar.className).toContain("sm:pl-[77px]");
    expect(bar.className).toContain("sm:pr-[14px]");
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

// ── QC Figma mới 2/9 · mục A ────────────────────────────────────────────────
// Frame 202 (ảnh KV 1244×570 + logo 286.5×153.2) bị `visible=false` trong bản .fig
// upload 2/9 → chân trang chỉ còn KHỐI CHỮ rộng 697, canh giữa, 16px, màu #000.
// Ảnh KV cũng chính là thủ phạm của C1 (không có width/height → CLS ~673px).
describe("HomeShell · A — chân trang không còn khối KV", () => {
  it("footer KHÔNG còn ảnh nào (gỡ KV + logo, hết luôn CLS của C1)", () => {
    const { container } = render(<HomeShell initial={homeData()} />);
    const footer = container.querySelector("footer")!;
    expect(footer.querySelectorAll("img")).toHaveLength(0);
  });

  it("logo vẫn còn ở top bar — chỉ gỡ ở chân trang", () => {
    const { container } = render(<HomeShell initial={homeData()} />);
    const logos = container.querySelectorAll('img[src="/brand/logo-khu-pho.svg"]');
    expect(logos).toHaveLength(1);
    expect(logos[0].closest("footer")).toBeNull();
  });

  it("khối chữ chân trang giữ đủ 4 dòng + link chính sách dữ liệu", () => {
    const { container } = render(<HomeShell initial={homeData()} />);
    const footer = container.querySelector("footer")!;
    expect(footer.textContent).toContain("Chính sách dữ liệu");
    expect(footer.querySelector('a[href="/chinh-sach-du-lieu"]')).toBeTruthy();
  });

  it("chữ chân trang màu #000 (design), không còn text-ink #3D3D3D", () => {
    const { container } = render(<HomeShell initial={homeData()} />);
    const box = container.querySelector("footer > div")!;
    expect(box.className).toContain("text-black");
    expect(box.className).not.toContain("text-ink");
  });
});
