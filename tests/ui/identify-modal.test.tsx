// @vitest-environment jsdom
// Popup "Để FPT gửi ưu đãi đến bạn" — Figma 7502:831.
// Quy tắc cứng: KHÔNG OTP, SĐT gửi thẳng server 1 lần; tự nhập khu phố thì BẮT BUỘC tỉnh/thành.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import IdentifyModal from "@/components/home/IdentifyModal";
import { nb } from "./helpers";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

function setup() {
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(<IdentifyModal neighborhoods={[nb()]} onClose={onClose} onDone={onDone} />);
  return { onDone, onClose };
}

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiGet.mockResolvedValue({ provinces: [{ code: "79", name: "Thành phố Hồ Chí Minh" }] });
  apiSend.mockResolvedValue({ me: { display_name: "Trà", share_slug: "tra", neighborhood_id: "nb-1" } });
});
afterEach(cleanup);

describe("IdentifyModal", () => {
  it("hiện đủ 4 ô của design", () => {
    setup();
    expect(screen.getByText("Để FPT gửi ưu đãi đến bạn")).toBeTruthy();
    expect(screen.getByText("Số điện thoại")).toBeTruthy();
    expect(screen.getByText("Tên người dùng")).toBeTruthy();
    expect(screen.getByText("Địa chỉ khu phố")).toBeTruthy();
    expect(screen.getByText("Tỉnh/thành phố")).toBeTruthy();
  });

  it("tự nhập tên khu phố mà chưa chọn tỉnh thì chặn gửi", async () => {
    setup();
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText("Tìm kiếm hoặc tự nhập tên phường"), {
      target: { value: "Xóm chưa có trong danh mục" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu thôi/ }));
    expect(screen.getByText("Chọn tỉnh/thành của khu phố bạn nhé")).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it("đủ thông tin thì POST /api/v1/auth/identify và trả me về cho cha", async () => {
    const { onDone } = setup();
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText("VD: 0988 123 xxx"), { target: { value: "0988123456" } });
    fireEvent.change(screen.getByPlaceholderText("Nhập tên hiển thị cho khu phố"), { target: { value: "Trà" } });
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu thôi/ }));

    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    const [method, path, body] = apiSend.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe("POST");
    expect(path).toBe("/api/v1/auth/identify");
    expect(body.phone).toBe("0988123456");
    expect(body.display_name).toBe("Trà");
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("server từ chối thì hiện message, không đóng modal", async () => {
    apiSend.mockRejectedValue(new Error("Số điện thoại không hợp lệ"));
    const { onDone } = setup();
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText("VD: 0988 123 xxx"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu thôi/ }));
    await waitFor(() => expect(screen.getByText("Số điện thoại không hợp lệ")).toBeTruthy());
    expect(onDone).not.toHaveBeenCalled();
  });
});
