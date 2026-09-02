// @vitest-environment jsdom
// Nút "Lên đầu trang" — QC Figma bản 2/9 · B7 (MỚI, web chưa có).
// .fig Frame 259/260: icon tròn 55×55 nền cam + nhãn 12px bên dưới, lề phải 38px
// (x=1313 trên khổ 1440), cùng một component xuất hiện ở hai vị trí trên trang.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import BackToTop from "@/components/home/BackToTop";

const scrollTo = vi.fn();

beforeEach(() => {
  scrollTo.mockReset();
  Object.defineProperty(window, "scrollTo", { value: scrollTo, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, writable: true });
  Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

/** Giả lập cuộn trang tới vị trí y rồi bắn sự kiện scroll */
function scrollPageTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, writable: true });
  act(() => { window.dispatchEvent(new Event("scroll")); });
}

describe("BackToTop · B7", () => {
  it("ở đầu trang thì KHÔNG hiện nút", () => {
    render(<BackToTop />);
    expect(screen.queryByRole("button", { name: /Lên đầu trang/ })).toBeNull();
  });

  it("cuộn quá một màn hình thì hiện nút kèm nhãn 'Lên đầu trang'", () => {
    render(<BackToTop />);
    scrollPageTo(900);
    expect(screen.getByRole("button", { name: /Lên đầu trang/ })).toBeTruthy();
    expect(screen.getByText("Lên đầu trang")).toBeTruthy();
  });

  it("cuộn ngược lại lên đầu thì nút ẩn đi", () => {
    render(<BackToTop />);
    scrollPageTo(900);
    expect(screen.getByRole("button", { name: /Lên đầu trang/ })).toBeTruthy();
    scrollPageTo(10);
    expect(screen.queryByRole("button", { name: /Lên đầu trang/ })).toBeNull();
  });

  it("bấm nút thì cuộn về đỉnh, mượt", () => {
    render(<BackToTop />);
    scrollPageTo(900);
    fireEvent.click(screen.getByRole("button", { name: /Lên đầu trang/ }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("bật giảm chuyển động thì cuộn tức thời, không dùng smooth", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    render(<BackToTop />);
    scrollPageTo(900);
    fireEvent.click(screen.getByRole("button", { name: /Lên đầu trang/ }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("biên: đúng ngưỡng một màn hình thì chưa hiện (phải VƯỢT qua)", () => {
    render(<BackToTop />);
    scrollPageTo(800);
    expect(screen.queryByRole("button", { name: /Lên đầu trang/ })).toBeNull();
    scrollPageTo(801);
    expect(screen.getByRole("button", { name: /Lên đầu trang/ })).toBeTruthy();
  });

  it("gỡ listener khi unmount, không rò", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BackToTop />);
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
