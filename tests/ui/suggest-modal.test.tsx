// @vitest-environment jsdom
// Popup "Gửi câu nhắc" — Figma 7458:41901.
// Quyết định 2/9: DESIGN THẮNG SPEC → bỏ ghi chú đạo đức (docs/02 §72) và dòng
// "Bạn sẽ được hỏi số điện thoại một lần…"; GIỮ ghi chú 4N (design có vẽ).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SuggestModal from "@/components/home/SuggestModal";
import { COPY } from "@/lib/copy";
import { runNow } from "./helpers";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

const ISSUE = {
  id: "iss-1",
  category: "tre_con_trong_xom",
  location_text: "Ngách 12/3 Nguyễn Du",
  description: null,
  status: "voting",
  photo_url: null,
  neighborhood_id: "nb-1",
  neighborhood_name: "Phường Bàn Cờ",
};

function setup() {
  const onClose = vi.fn();
  const showToast = vi.fn();
  const onChanged = vi.fn();
  render(
    <SuggestModal
      issueId="iss-1"
      me={null}
      requireIdentity={runNow}
      onClose={onClose}
      showToast={showToast}
      onChanged={onChanged}
    />
  );
  return { onClose, showToast, onChanged };
}

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiGet.mockResolvedValue({ issue: ISSUE });
  apiSend.mockResolvedValue({});
});
afterEach(cleanup);

describe("SuggestModal — nội dung theo design", () => {
  it("hiện tên chủ đề, địa chỉ và ghi chú 4N", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("Trẻ con trong xóm")).toBeTruthy());
    expect(screen.getByText(/Phường Bàn Cờ/)).toBeTruthy();
    expect(screen.getByText(COPY.note4N)).toBeTruthy();
  });

  it("KHÔNG còn ghi chú đạo đức và dòng nhắc định danh (design 18/8 bỏ)", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("Trẻ con trong xóm")).toBeTruthy());
    expect(screen.queryByText(COPY.noteEthics)).toBeNull();
    expect(screen.queryByText(/Bạn sẽ được hỏi số điện thoại một lần/)).toBeNull();
  });

  it("đủ 4 chip 4N và cùng một lớp bề ngang (Frame 243: 4 × 147px)", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("Trẻ con trong xóm")).toBeTruthy());
    const chips = Array.from(document.querySelectorAll(".kp-n4chip"));
    expect(chips.map((c) => c.textContent)).toEqual(["Nhắc", "Nhở", "Nhỏ", "Nhẹ"]);
    // 4 chip dùng chung một class → cùng bề ngang, không co theo độ dài chữ như bản cũ
    expect(new Set(chips.map((c) => c.className)).size).toBe(1);
  });
});

describe("SuggestModal — luật nghiệp vụ", () => {
  it("câu rỗng thì chặn gửi", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("Trẻ con trong xóm")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /^Gửi câu nhắc$/ }));
    expect(screen.getByText("Bạn chưa viết câu nhắc")).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it("cắt câu nhắc ở 120 ký tự", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("Trẻ con trong xóm")).toBeTruthy());
    const box = screen.getByPlaceholderText(COPY.suggestionPlaceholder) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "a".repeat(200) } });
    expect(box.value).toHaveLength(120);
  });

  it("tick nhận ưu đãi thì hiện ô SĐT và bắt buộc điền", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("Trẻ con trong xóm")).toBeTruthy());
    expect(screen.queryByText("Số điện thoại")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText("Số điện thoại")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(COPY.suggestionPlaceholder), {
      target: { value: "Đi chậm chút nha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Gửi câu nhắc$/ }));
    expect(screen.getByText("Nhập số điện thoại để FPT gửi ưu đãi nhé")).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it("gửi thành công thì POST đúng endpoint và báo toast", async () => {
    const { showToast, onClose } = setup();
    await waitFor(() => expect(screen.getByText("Trẻ con trong xóm")).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(COPY.suggestionPlaceholder), {
      target: { value: "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Gửi câu nhắc$/ }));

    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    const [method, path, body] = apiSend.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe("POST");
    expect(path).toBe("/api/v1/issues/iss-1/suggestions");
    expect(body.content).toBe("Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.");
    expect(body.lead_opt_in).toBe(false);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(COPY.toastSuggestionSent));
    expect(onClose).toHaveBeenCalled();
  });
});
