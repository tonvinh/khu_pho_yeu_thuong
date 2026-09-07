// @vitest-environment jsdom
// QC 2/9 · C3 — slider hero phải ĐỨNG YÊN khi hệ điều hành bật "giảm chuyển động".
// CSS chỉ tắt transition (motion-reduce:transition-none) nên trước khi sửa, ảnh vẫn
// NHẢY mỗi 4 giây — với người nhạy cảm chuyển động còn khó chịu hơn trượt mượt.
// Mũi tên ‹ › vẫn phải chuyển được: đó là chuyển động do người dùng chủ động.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import NeighborhoodSlider from "@/components/home/NeighborhoodSlider";
import { nb } from "./helpers";

// Từ 7/9 slider lấy khu theo `is_featured` (slot slide do admin xếp), không theo 4N nữa
const LIST = [
  nb({ id: "n1", name: "Xóm Lò Gốm", slug: "xom-lo-gom", is_featured: true }),
  nb({ id: "n2", name: "Xóm Đình", slug: "xom-dinh", is_featured: true }),
  nb({ id: "n3", name: "Xóm Chợ", slug: "xom-cho", is_featured: true }),
];

/** Giả lập matchMedia của jsdom (mặc định không có) */
function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** Vị trí track hiện tại — translate3d(-N%, 0, 0) */
function offset(container: HTMLElement): string {
  const track = container.querySelector('[style*="translate3d"]') as HTMLElement;
  return track.style.transform;
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("NeighborhoodSlider — giảm chuyển động (C3)", () => {
  it("BẬT giảm chuyển động → hết 4 giây ảnh vẫn đứng yên", () => {
    setReducedMotion(true);
    const { container } = render(<NeighborhoodSlider map={{ neighborhoods: LIST, pins: [] }} />);
    const before = offset(container);

    act(() => { vi.advanceTimersByTime(12_000); });
    expect(offset(container)).toBe(before);
  });

  it("BẬT giảm chuyển động → mũi tên ‹ › vẫn chuyển khu được", () => {
    setReducedMotion(true);
    const { container } = render(<NeighborhoodSlider map={{ neighborhoods: LIST, pins: [] }} />);
    const before = offset(container);

    fireEvent.click(screen.getByLabelText("Khu phố sau"));
    expect(offset(container)).not.toBe(before);
  });

  it("TẮT giảm chuyển động → vẫn tự trượt sau 4 giây (không làm hỏng hành vi cũ)", () => {
    setReducedMotion(false);
    const { container } = render(<NeighborhoodSlider map={{ neighborhoods: LIST, pins: [] }} />);
    const before = offset(container);

    act(() => { vi.advanceTimersByTime(4_100); });
    expect(offset(container)).not.toBe(before);
  });

  it("chỉ có 1 khu tiêu biểu → không có mũi tên, không có hẹn giờ", () => {
    setReducedMotion(false);
    render(
      <NeighborhoodSlider
        map={{ neighborhoods: [LIST[0], nb({ id: "n9", is_featured: false })], pins: [] }}
      />
    );
    expect(screen.queryByLabelText("Khu phố sau")).toBeNull();
  });
});
