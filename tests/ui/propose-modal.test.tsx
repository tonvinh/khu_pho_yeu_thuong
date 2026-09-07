// @vitest-environment jsdom
// Popup "Đề xuất khu phố mới" — Figma 7458:40650 (bước 1/2) và 7458:41331 (bước 2/2).
// Quyết định 2/9: DESIGN THẮNG SPEC → bước 2 không còn hộp cảnh báo (docs/02 §62),
// không còn chip 4N và bộ đếm ký tự (docs/20).
// QC 7/9: bước 2 chỉ còn ĐÚNG 3 nhóm ô của .fig — tỉnh/phường lên đầu, ô tên khu phố và
// ô tên hẻm/ngõ gộp làm một, ô "Viết câu nhắc thương của bạn (nếu có)" bị bỏ.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProposeModal from "@/components/home/ProposeModal";
import { CATEGORY_CODES } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { nb, runNow } from "./helpers";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

function setup(over: Partial<React.ComponentProps<typeof ProposeModal>> = {}) {
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(
    <ProposeModal
      neighborhoods={[nb()]}
      defaultNeighborhoodId={null}
      requireIdentity={runNow}
      onClose={onClose}
      onDone={onDone}
      {...over}
    />
  );
  return { onDone, onClose };
}

const goStep2 = () => {
  fireEvent.click(screen.getByText("Trẻ con trong xóm"));
  fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đề xuất/ }));
};

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiGet.mockResolvedValue({ provinces: [{ code: "79", name: "Thành phố Hồ Chí Minh" }], wards: [] });
  apiSend.mockResolvedValue({});
});
afterEach(cleanup);

describe("ProposeModal — bước 1/2 chọn chủ đề", () => {
  it("hiện đúng 6 chủ đề của danh mục đóng", () => {
    setup();
    expect(CATEGORY_CODES).toHaveLength(6);
    for (const label of ["Khoẻ mỗi ngày", "Trẻ con trong xóm", "Lối sống văn minh, tử tế", "Giúp đỡ, san sẻ", "Xóm xanh, xóm sạch", "Sống vui, sống có ích"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText("1/2")).toBeTruthy();
  });

  it("chưa chọn chủ đề thì báo lỗi, không sang bước 2", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đề xuất/ }));
    expect(screen.getByText("Chọn chủ đề nhé")).toBeTruthy();
    expect(screen.queryByText("2/2")).toBeNull();
  });

  it("thẻ chủ đề đang chọn được đánh dấu aria-pressed", () => {
    setup();
    const card = screen.getByText("Trẻ con trong xóm").closest("button")!;
    expect(card.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(card);
    expect(screen.getByText("Trẻ con trong xóm").closest("button")!.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("ProposeModal — bước 2/2 thông tin khu phố", () => {
  it("hiện ĐÚNG 3 nhóm ô của design, đúng thứ tự", () => {
    setup();
    goStep2();
    expect(screen.getByText("2/2")).toBeTruthy();
    const labels = Array.from(document.querySelectorAll("label > span:first-child")).map(
      (n) => n.textContent
    );
    expect(labels).toEqual([
      "Tỉnh/thành phố",
      "Phường /Xã",
      "Tên khu phố/hẻm/ngõ muốn treo biển",
      "Điều dễ thương bạn muốn chia sẻ ở khu phố này",
    ]);
  });

  it("bỏ ô 'Tên khu phố' riêng và ô câu nhắc thương (design 2/9 gộp/gỡ)", () => {
    setup();
    goStep2();
    expect(screen.queryByText("Tên khu phố")).toBeNull();
    expect(screen.queryByText("Tên hẻm/ngõ muốn treo")).toBeNull();
    expect(screen.queryByText("Mô tả vấn đề tại khu phố")).toBeNull();
    expect(screen.queryByText("Viết câu nhắc thương của bạn (nếu có)")).toBeNull();
    expect(screen.queryByPlaceholderText(COPY.suggestionPlaceholder)).toBeNull();
  });

  it("KHÔNG còn hộp cảnh báo, chip 4N và bộ đếm ký tự (design 18/8 bỏ)", () => {
    setup();
    goStep2();
    expect(screen.queryByText(COPY.proposeWarning)).toBeNull();
    expect(screen.queryByText("Nhắc")).toBeNull();
    expect(screen.queryByText("Nhẹ")).toBeNull();
    expect(screen.queryByText("0/120")).toBeNull();
  });

  it("chưa chọn tỉnh/thành thì chặn gửi", () => {
    setup();
    goStep2();
    fireEvent.change(screen.getByPlaceholderText("Nhập tên hẻm ngõ nơi bạn sinh sống"), {
      target: { value: "Hẻm 12 Nguyễn Du" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi đề xuất/ }));
    expect(screen.getByText("Chọn tỉnh/thành của khu phố nhé")).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it("thiếu tên khu phố/hẻm/ngõ thì chặn gửi", () => {
    setup({ defaultNeighborhoodId: "nb-1" });
    goStep2();
    fireEvent.change(screen.getByPlaceholderText("Nhập tên hẻm ngõ nơi bạn sinh sống"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi đề xuất/ }));
    expect(screen.getByText("Nhập tên khu phố/hẻm/ngõ muốn treo biển nhé")).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it("đủ thông tin thì POST /api/v1/issues đúng payload, KHÔNG gửi suggested_content", async () => {
    const { onDone } = setup({ neighborhoods: [nb()], defaultNeighborhoodId: "nb-1" });
    goStep2();
    fireEvent.change(screen.getByPlaceholderText("Nhập tên hẻm ngõ nơi bạn sinh sống"), {
      target: { value: "Hẻm 12 Nguyễn Du" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi đề xuất/ }));

    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    const [method, path, body] = apiSend.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe("POST");
    expect(path).toBe("/api/v1/issues");
    expect(body.category).toBe("tre_con_trong_xom");
    // Ô gộp đi vào CẢ location_text lẫn tên khu phố tự nhập
    expect(body.location_text).toBe("Hẻm 12 Nguyễn Du");
    expect(body.neighborhood_id).toBe(null);
    expect(body.neighborhood_text).toBe("Hẻm 12 Nguyễn Du");
    expect("suggested_content" in body).toBe(false);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("chọn khu phố có sẵn thì gửi neighborhood_id, không sinh khu phố trùng", async () => {
    setup({ neighborhoods: [nb()], defaultNeighborhoodId: "nb-1" });
    goStep2();
    fireEvent.click(screen.getByRole("button", { name: /Gửi đề xuất/ }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    const body = apiSend.mock.calls[0][2] as Record<string, unknown>;
    expect(body.neighborhood_id).toBe("nb-1");
    expect(body.neighborhood_text).toBe(null);
  });

  it("API lỗi thì hiện message của server, không crash", async () => {
    apiSend.mockRejectedValue(new Error("Bạn đã gửi quá 3 đề xuất trong tuần"));
    setup({ neighborhoods: [nb()], defaultNeighborhoodId: "nb-1" });
    goStep2();
    fireEvent.change(screen.getByPlaceholderText("Nhập tên hẻm ngõ nơi bạn sinh sống"), {
      target: { value: "Hẻm 12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi đề xuất/ }));
    await waitFor(() => expect(screen.getByText("Bạn đã gửi quá 3 đề xuất trong tuần")).toBeTruthy());
  });
});
