// @vitest-environment jsdom
// Top bar + banner báo tin của trang chủ — ba lỗi QC 2/9:
//  · A1 banner báo tin bị nền hero (absolute) phủ kín vì khối banner là `static`
//    (7/9: banner chuyển hẳn thành lớp nổi `fixed` — xem describe đầu tiên)
//  · A3 nav chồng chữ ở mọi khổ 640–1169px vì bố cục Figma 1440 bật ngay từ sm=640
//  · B4 avatar không bấm được nên cư dân không đăng xuất được
// jsdom KHÔNG tính layout/media query nên ở đây kiểm ĐIỂM DỪNG khai báo trong markup;
// số đo chồng lấn thật đo bằng DOM trong trình duyệt (xem tests/e2e).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomeShell from "@/components/home/HomeShell";
import type { Me, NotificationItem } from "@/components/home/types";
import { homeData, issue } from "./helpers";

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

describe("HomeShell · banner báo tin là LỚP NỔI, không chèn vào luồng trang", () => {
  // QC 2/9 · A1: banner từng là khối `static` nên nền hero (absolute) phủ kín.
  // Lỗi 7/9: sửa A1 xong banner vẫn nằm TRONG luồng giữa nav và hero — 3 thông báo
  // đẩy hero tụt khỏi dải gradient cao cố định 900px (tiêu đề trắng trên nền kem).
  // Bất biến hiện tại: khối banner `fixed`, nằm NGOÀI khối bọc hero.
  it("khối banner là `fixed` và không nằm trong khối bọc nền hero", async () => {
    mockApi({ notifs: [NOTIF] });
    const { container } = render(<HomeShell initial={homeData()} />);

    const line = await screen.findByText(/Hẻm QC 1/);
    const wrap = line.closest("div.fixed");
    expect(wrap).toBeTruthy();
    expect(wrap!.className).toContain("z-40");

    // nền hero là lớp absolute cao 900 — banner không được là con của khối bọc nó
    const bg = container.querySelector('[aria-hidden].absolute.inset-x-0.top-0')!;
    expect(bg.parentElement!.contains(wrap!)).toBe(false);
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
    expect(screen.getByRole("dialog").textContent).toContain("Đề xuất khu phố mới");
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

// ── QC 7/9 · nút "Viết lời nhắc cho xóm mình" trong popup "Thông tin khu phố" ──
// Trước đây nút chỉ đóng popup rồi cuộn xuống #goc-xom nên người dùng đọc là "không
// chạy". Nay đi ĐÚNG luồng của CTA "+ Viết câu nhắc của riêng bạn" ở tab 2: mở popup
// "Chọn góc phố" — và vì đang xem hồ sơ một khu phố cụ thể, góc phố của CHÍNH khu đó
// phải được xếp lên nhóm đầu (không phải khu phố của người đã định danh).
describe("HomeShell · popup khu phố → 'Viết lời nhắc cho xóm mình'", () => {
  const DETAIL = {
    id: "nb-9", name: "Phường Tân Định", slug: "phuong-tan-dinh",
    ward: "Phường Tân Định", city: "Thành phố Hồ Chí Minh",
    certified_4n: false, certified_at: null, photo_urls: [], certificate_url: null,
    map_url: null, total_issues: 1, signed_issues: 0, suggestions_total: 0,
    progress_pct: 0, notes: [],
  };

  /** Mở popup khu phố qua deep-link `/?khu-pho=<slug>` rồi bấm nút đáy */
  async function openAndClickWrite() {
    window.history.replaceState(null, "", "/?khu-pho=phuong-tan-dinh");
    mockApi();
    const prev = apiGet.getMockImplementation()!;
    apiGet.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/v1/neighborhoods/")) return { neighborhood: DETAIL };
      return prev(path);
    });

    render(
      <HomeShell
        initial={homeData({
          issues: [
            issue({ id: "is-tan-dinh", location_text: "Hẻm 5 Trần Quang Khải",
                    neighborhood_id: "nb-9", neighborhood_name: "Phường Tân Định" }),
            issue({ id: "is-lo-gom", location_text: "Hẻm 42 Lê Lợi" }),
          ],
        })}
      />
    );
    fireEvent.click(await screen.findByText("Viết lời nhắc cho xóm mình"));
  }

  it("mở popup 'Chọn góc phố' thay vì chỉ cuộn trang", async () => {
    await openAndClickWrite();
    expect(await screen.findByText("Chọn góc phố")).toBeTruthy();
    // popup khu phố đã đóng — không mở chồng hai popup
    expect(screen.queryByText("Thông tin khu phố")).toBeNull();
  });

  it("nhóm đầu là góc phố của KHU PHỐ ĐANG XEM, không phải khu của người định danh", async () => {
    await openAndClickWrite();
    await screen.findByText("Chọn góc phố");
    expect(screen.getByText("📍 Góc phố ở Phường Tân Định")).toBeTruthy();
    // me.neighborhood_name = "Xóm Lò Gốm" — không được dùng làm nhóm đầu ở luồng này
    expect(screen.queryByText("📍 Góc phố ở Xóm Lò Gốm")).toBeNull();
  });
});
