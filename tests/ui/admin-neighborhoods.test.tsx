// @vitest-environment jsdom
// QC 7/9 — /admin/khu-pho: 3 yêu cầu của điểm "Trong Admin ⇒ Khu phố".
//  1. Ba trạng thái (hiển thị website / khu phố tiêu biểu / đạt chuẩn 4N) bật tắt TỰ DO,
//     không còn khoá theo điều kiện nào (trước: tiêu biểu phải đang hiển thị, 4N phải
//     100% biển đã treo).
//  2. Xoá mềm + khôi phục ở tab "🗑 Đã xoá".
//  3. Cột vị trí là SLOT SLIDE của hero, trần 10.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import NeighborhoodsPage from "@/app/admin/(panel)/khu-pho/page";
import { FEATURED_SLOTS } from "@/lib/featured";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  apiUpload: vi.fn().mockResolvedValue({}),
  BASE: "",
}));

function nb(over: Record<string, unknown> = {}) {
  return {
    id: "n1", name: "Xóm Lò Gốm", ward: "Phường Bàn Cờ", city: "Thành phố Hồ Chí Minh",
    slug: "xom-lo-gom", visible: false, is_featured: false, featured_position: null,
    certified_4n: false, certified_at: null, certificate_photo_url: null, deleted_at: null,
    photos: [], total_issues: 0, signed_issues: 0,
    ...over,
  };
}

async function show(rows: ReturnType<typeof nb>[]) {
  apiGet.mockImplementation((path = "") =>
    String(path).startsWith("/api/admin/neighborhoods")
      ? Promise.resolve({ neighborhoods: rows })
      : Promise.resolve({ provinces: [], wards: [] })
  );
  const out = render(<NeighborhoodsPage />);
  await waitFor(() => expect(screen.getByText("Xóm Lò Gốm")).toBeTruthy());
  return out;
}

const toggle = (label: RegExp) => screen.getByRole("switch", { name: label });

beforeEach(() => { apiGet.mockReset(); apiSend.mockReset().mockResolvedValue({}); });
afterEach(cleanup);

describe("/admin/khu-pho — 3 trạng thái không còn điều kiện", () => {
  it("khu ĐANG ẨN vẫn bật được 'Khu phố tiêu biểu'", async () => {
    await show([nb({ visible: false })]);
    const sw = toggle(/Khu phố tiêu biểu/);
    expect(sw.hasAttribute("disabled")).toBe(false);

    fireEvent.click(sw);
    expect(apiSend).toHaveBeenCalledWith(
      "PATCH", "/api/admin/neighborhoods/n1", { is_featured: true }
    );
  });

  it("khu CHƯA treo biển nào vẫn bật được 'Đạt chuẩn 4N'", async () => {
    await show([nb({ total_issues: 3, signed_issues: 0 })]);
    const sw = toggle(/Đạt chuẩn 4N/);
    expect(sw.hasAttribute("disabled")).toBe(false);

    fireEvent.click(sw);
    expect(apiSend).toHaveBeenCalledWith("PATCH", "/api/admin/neighborhoods/n1/certify", {});
  });

  it("ẩn website KHÔNG còn tự tắt tiêu biểu — chỉ gửi đúng cờ vừa bấm", async () => {
    await show([nb({ visible: true, is_featured: true, featured_position: 2 })]);
    fireEvent.click(toggle(/Hiển thị website/));
    expect(apiSend).toHaveBeenCalledWith(
      "PATCH", "/api/admin/neighborhoods/n1", { visible: false }
    );
    await waitFor(() =>
      expect(screen.getByText(/cờ tiêu biểu và vị trí slide giữ nguyên/)).toBeTruthy()
    );
  });
});

describe("/admin/khu-pho — vị trí slide 1..10", () => {
  it("ô vị trí chốt trần bằng FEATURED_SLOTS, quá trần thì không gửi lên server", async () => {
    await show([nb({ is_featured: true, featured_position: 3 })]);
    const input = screen.getByDisplayValue("3") as HTMLInputElement;
    expect(input.max).toBe(String(FEATURED_SLOTS));
    expect(input.min).toBe("1");

    fireEvent.change(input, { target: { value: String(FEATURED_SLOTS + 1) } });
    fireEvent.blur(input);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it("khu chưa bật tiêu biểu thì không có ô vị trí", async () => {
    await show([nb({ is_featured: false })]);
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  // QC 7/9 trên Chrome: câu thông báo phải nói ĐÚNG chuyện gì vừa xảy ra với khu đang
  // giữ slot đích — gộp một câu chung là sai 2/3 số ca.
  it.each([
    ["slot còn trống", 8, null, "Đã xếp vào slot slide số 8 ✓"],
    ["đổi chỗ (khu vừa xếp đang giữ slot khác)", 2, 5,
      'Đã xếp vào slot slide số 2 ✓ — đổi chỗ với "Xóm Đình" (giờ ở slot 5).'],
    ["đẩy ra (khu vừa xếp chưa có slot)", 2, null,
      'Đã xếp vào slot slide số 2 ✓ — "Xóm Đình" bị đẩy ra khỏi 10 slot.'],
  ])("thông báo xếp slot — %s", async (_label, pos, mine, expected) => {
    await show([
      nb({ id: "n1", is_featured: true, featured_position: mine }),
      nb({ id: "n2", name: "Xóm Đình", slug: "xom-dinh", is_featured: true, featured_position: 2 }),
    ]);
    const input = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(input, { target: { value: String(pos) } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.getByText(expected)).toBeTruthy());
  });

  it("bỏ trống ô vị trí → nhả slot", async () => {
    await show([nb({ is_featured: true, featured_position: 4 })]);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(apiSend).toHaveBeenCalledWith(
      "PATCH", "/api/admin/neighborhoods/n1", { featured_position: null }
    );
  });

  it("xếp slot hợp lệ → PATCH featured_position", async () => {
    await show([nb({ is_featured: true, featured_position: null })]);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.blur(input);
    expect(apiSend).toHaveBeenCalledWith(
      "PATCH", "/api/admin/neighborhoods/n1", { featured_position: 1 }
    );
  });
});

describe("/admin/khu-pho — xoá mềm & khôi phục", () => {
  it("bấm Xoá → popup xác nhận, đồng ý mới gọi DELETE", async () => {
    await show([nb({ visible: true })]);
    fireEvent.click(screen.getByText("🗑 Xoá"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/biến mất khỏi website/)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByText("🗑 Xoá khu phố"));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith("DELETE", "/api/admin/neighborhoods/n1")
    );
  });

  it("khu đã xoá KHÔNG nằm ở tab 'Tất cả', chỉ ở tab 'Đã xoá' và có nút Khôi phục", async () => {
    await show([
      nb({ id: "n1", name: "Xóm Lò Gốm" }),
      nb({ id: "n2", name: "Xóm Đã Xoá", slug: "xom-da-xoa", deleted_at: "2026-09-07T00:00:00Z" }),
    ]);
    expect(screen.queryByText("Xóm Đã Xoá")).toBeNull();

    fireEvent.click(screen.getByText(/Đã xoá/));
    await waitFor(() => expect(screen.getByText("Xóm Đã Xoá")).toBeTruthy());
    expect(screen.queryByText("Xóm Lò Gốm")).toBeNull();
    // Hàng đã xoá không còn công tắc trạng thái nào
    expect(screen.queryAllByRole("switch")).toHaveLength(0);

    fireEvent.click(screen.getByText("↩️ Khôi phục"));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith(
        "PATCH", "/api/admin/neighborhoods/n2", { restore: true }
      )
    );
  });
});
