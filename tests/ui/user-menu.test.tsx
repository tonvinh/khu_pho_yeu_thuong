// @vitest-environment jsdom
// QC 2/9 · B4 — cư dân phải đăng xuất được. `POST /api/v1/auth/logout` đã chạy đúng
// nhưng trước đây avatar chỉ là <span>, bấm vào không có gì xảy ra; phiên kp_session
// sống 180 ngày nên máy dùng chung không đổi được tài khoản.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserMenu from "@/components/home/UserMenu";
import type { Me } from "@/components/home/types";

const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: vi.fn(),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

const ME: Me = {
  display_name: "Cô Bảy",
  share_slug: "co-bay-abc",
  neighborhood_id: "nb-1",
  neighborhood_name: "Xóm Lò Gốm",
  score: 82,
};

beforeEach(() => {
  apiSend.mockReset();
  apiSend.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("UserMenu — menu avatar", () => {
  it("avatar là NÚT bấm được (không phải <span> chết) và hiện chữ cái đầu", () => {
    render(<UserMenu me={ME} onLoggedOut={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /Tài khoản của Cô Bảy/ });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.textContent).toBe("C");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("bấm avatar mở menu có tên, điểm, khu phố và mục Đăng xuất", () => {
    render(<UserMenu me={ME} onLoggedOut={vi.fn()} />);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản của/ }));
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByText("Cô Bảy")).toBeTruthy();
    expect(screen.getByText(/82 điểm/)).toBeTruthy();
    expect(screen.getByText(/Xóm Lò Gốm/)).toBeTruthy();
    expect(screen.getByText("Đăng xuất")).toBeTruthy();
  });

  it("Đăng xuất gọi POST /api/v1/auth/logout rồi báo cho trang chủ", async () => {
    const onLoggedOut = vi.fn();
    render(<UserMenu me={ME} onLoggedOut={onLoggedOut} />);
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản của/ }));
    fireEvent.click(screen.getByText("Đăng xuất"));

    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
    expect(apiSend).toHaveBeenCalledWith("POST", "/api/v1/auth/logout");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("API lỗi thì phía giao diện vẫn coi như đã thoát (không kẹt trong menu)", async () => {
    const onLoggedOut = vi.fn();
    apiSend.mockRejectedValue(new Error("mạng hỏng"));
    render(<UserMenu me={ME} onLoggedOut={onLoggedOut} />);
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản của/ }));
    fireEvent.click(screen.getByText("Đăng xuất"));
    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
  });

  it("bấm ra ngoài hoặc bấm Esc thì đóng menu", () => {
    render(<UserMenu me={ME} onLoggedOut={vi.fn()} />);
    const avatar = screen.getByRole("button", { name: /Tài khoản của/ });

    fireEvent.click(avatar);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(avatar);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("chưa có điểm thì hiện 0 điểm, không hiện 'undefined'", () => {
    render(<UserMenu me={{ ...ME, score: undefined, neighborhood_name: null }} onLoggedOut={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tài khoản của/ }));
    expect(screen.getByText("0 điểm")).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });
});
