// @vitest-environment jsdom
// Khung modal theo Figma (page 7217:1989 — 4 frame popup 1440×1024):
// bề ngang 700, viền 2px #FF8206, tiêu đề 25px Regular, nút ‹/× 35×35,
// dải sọc cam 12px NẰM TRONG modal sát mép bo dưới.
import { afterEach, describe, expect, it, vi } from "vitest";
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
