// @vitest-environment jsdom
// QC 8/9 — /admin/noi-dung có khối sửa 3 con số ở hero: placeholder là số đang tự đếm,
// bỏ trống = tự đếm, và giá trị đi kèm PATCH trong nhóm `counters`.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SiteContentPage from "@/app/admin/(panel)/noi-dung/page";
import { SITE_CONTENT_DEFAULTS, SITE_TEXT_KEYS } from "@/lib/site-content-defaults";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  apiUpload: vi.fn().mockResolvedValue({}),
  BASE: "",
}));

const payload = (counterOver: Record<string, string> = {}) => ({
  defaults: SITE_CONTENT_DEFAULTS,
  overrides: Object.fromEntries(SITE_TEXT_KEYS.map((k) => [k, ""])),
  counters: {
    real: { signs_installed: 3, neighborhoods_joined: 10, suggestions_total: 14 },
    overrides: {
      signs_installed: "", neighborhoods_joined: "", suggestions_total: "", ...counterOver,
    },
  },
});

async function show(over?: Record<string, string>) {
  const data = payload(over);
  apiGet.mockResolvedValue(data);
  apiSend.mockResolvedValue(data);
  const out = render(<SiteContentPage />);
  await waitFor(() => expect(screen.getByText("Dải 3 con số dưới ô tra cứu")).toBeTruthy());
  return out;
}

const numInput = (label: string) =>
  screen.getByText(label, { selector: "span" }).closest("label")!.querySelector("input")!;

beforeEach(() => { cleanup(); apiGet.mockReset(); apiSend.mockReset(); });

describe("/admin/noi-dung · dải 3 con số", () => {
  it("có đủ 3 ô, placeholder là số đang tự đếm", async () => {
    await show();
    expect(numInput("Biển đã treo").placeholder).toBe("3");
    expect(numInput("Khu phố").placeholder).toBe("10");
    expect(numInput("Câu đóng góp").placeholder).toBe("14");
    // Bỏ trống = tự đếm nên chưa có ghi đè thì ô rỗng
    expect(numInput("Biển đã treo").value).toBe("");
  });

  it("ô đang ghi đè hiện giá trị + nhãn “đã ghi đè” + nút về số tự đếm", async () => {
    await show({ signs_installed: "120" });
    expect(numInput("Biển đã treo").value).toBe("120");
    expect(screen.getAllByText("đã ghi đè").length).toBe(1);
    fireEvent.click(screen.getByText("↩ Về số tự đếm"));
    expect(numInput("Biển đã treo").value).toBe("");
  });

  it("chỉ nhận chữ số", async () => {
    await show();
    const inp = numInput("Khu phố");
    fireEvent.change(inp, { target: { value: "1a2,5" } });
    expect(inp.value).toBe("125");
  });

  it("Lưu gửi 3 con số trong nhóm `counters` của PATCH", async () => {
    await show();
    fireEvent.change(numInput("Biển đã treo"), { target: { value: "120" } });
    fireEvent.click(screen.getAllByText("💾 Lưu tất cả")[0]);
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    const [method, path, body] = apiSend.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe("PATCH");
    expect(path).toBe("/api/admin/site-content");
    expect(body.counters).toEqual({
      signs_installed: "120", neighborhoods_joined: "", suggestions_total: "",
    });
  });
});
