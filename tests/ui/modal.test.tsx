// @vitest-environment jsdom
// Khung modal theo Figma (page 7217:1989 — 4 frame popup 1440×1024):
// bề ngang 700, viền 2px #FF8206, tiêu đề 25px Regular, nút ‹/× 35×35,
// dải sọc cam 12px NẰM TRONG modal sát mép bo dưới.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "@/components/home/ui";

afterEach(cleanup);

describe("Modal — khung popup theo design", () => {
  it("dựng đủ khung: dialog, tiêu đề, nút đóng, dải sọc đáy; chưa có nút quay lại", () => {
    const { container } = render(
      <Modal title="Đề xuất góc phố mới" onClose={() => {}}>
        <p>nội dung</p>
      </Modal>
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Đề xuất góc phố mới")).toBeTruthy();
    expect(screen.getByLabelText("Đóng")).toBeTruthy();
    expect(screen.queryByLabelText("Quay lại bước trước")).toBeNull();
    // Frame 155 trong .fig: dải sọc cao 12px là con CUỐI của modal, không phải
    // lớp absolute lơ lửng ngoài mép như bản cũ.
    expect(container.querySelector(".kp-stripe-b")).toBeTruthy();
  });

  it("bề ngang 700px và viền 2px cam đặc như .fig", () => {
    render(
      <Modal title="X" onClose={() => {}}>
        <p>nội dung</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("sm:max-w-[700px]");

    const card = dialog.querySelector<HTMLElement>(".kp-modal-card");
    expect(card).toBeTruthy();
    expect(card!.className).toContain("border-2");
    expect(card!.className).toContain("border-brick");
  });

  it("tiêu đề 25px Regular (design không dùng Bold ở thanh tiêu đề)", () => {
    render(
      <Modal title="Gửi câu nhắc" onClose={() => {}}>
        <p>nội dung</p>
      </Modal>
    );
    const title = screen.getByText("Gửi câu nhắc");
    expect(title.className).toContain("text-[25px]");
    expect(title.className).not.toContain("font-bold");
  });

  it("có nút quay lại khi truyền onBack và gọi đúng callback", () => {
    const onBack = vi.fn();
    render(
      <Modal title="X" onClose={() => {}} onBack={onBack}>
        <p>nội dung</p>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText("Quay lại bước trước"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("đóng bằng phím Escape và bằng click ra nền", () => {
    const onCloseEsc = vi.fn();
    const { unmount } = render(
      <Modal title="X" onClose={onCloseEsc}>
        <p>nội dung</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseEsc).toHaveBeenCalledTimes(1);
    unmount();

    const onCloseScrim = vi.fn();
    const { container } = render(
      <Modal title="X" onClose={onCloseScrim}>
        <p>nội dung</p>
      </Modal>
    );
    fireEvent.click(container.firstElementChild!);
    expect(onCloseScrim).toHaveBeenCalledTimes(1);
  });
});

// ── QC 2/9 · C2 + C3 ────────────────────────────────────────────────────────
// C2: mở popup rồi window.scrollTo(0,1600) thì TRANG NỀN cuộn theo, popup trôi —
//     `getComputedStyle(document.body).overflow` chỉ là "clip visible" (chặn ngang).
// C3: sau chuỗi popup (đề xuất → định danh → ưu đãi), window.scrollTo(0,0) dừng ở
//     y=88 / 172.5. Nghi phần khôi phục scroll khi đóng modal → sửa chung ở đây.
describe("Modal · C2/C3 — khoá cuộn trang nền", () => {
  const scrollTo = vi.fn();

  beforeEach(() => {
    scrollTo.mockReset();
    Object.defineProperty(window, "scrollTo", { value: scrollTo, writable: true });
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    document.body.removeAttribute("style");
  });

  const at = (y: number) => Object.defineProperty(window, "scrollY", { value: y, writable: true });

  it("mở modal → body bị ghim tại chỗ (position:fixed, top = -scrollY)", () => {
    at(1600);
    render(<Modal title="X" onClose={() => {}}><p>nội dung</p></Modal>);
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-1600px");
    expect(document.body.style.width).toBe("100%");
  });

  it("đóng modal → nhả khoá và cuộn TRẢ ĐÚNG vị trí cũ (C3)", () => {
    at(1600);
    const { unmount } = render(<Modal title="X" onClose={() => {}}><p>nội dung</p></Modal>);
    unmount();
    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 1600);
  });

  it("hai modal chồng nhau: đóng cái TRÊN chưa được nhả khoá", () => {
    at(500);
    const a = render(<Modal title="A" onClose={() => {}}><p>a</p></Modal>);
    const b = render(<Modal title="B" onClose={() => {}} topmost><p>b</p></Modal>);
    expect(document.body.style.position).toBe("fixed");
    b.unmount();
    expect(document.body.style.position).toBe("fixed"); // A còn mở
    a.unmount();
    expect(document.body.style.position).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 500);
  });

  it("biên: mở ở đầu trang (scrollY=0) thì đóng lại vẫn ở đầu trang", () => {
    at(0);
    const { unmount } = render(<Modal title="X" onClose={() => {}}><p>nội dung</p></Modal>);
    expect(document.body.style.top).toBe("0px"); // trình duyệt chuẩn hoá "-0px"
    unmount();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
