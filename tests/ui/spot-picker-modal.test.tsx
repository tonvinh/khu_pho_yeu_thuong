// @vitest-environment jsdom
// Popup "Chọn góc phố" — bước trước form viết câu, mở từ CTA đáy tab 2.
// Chốt 4/9: dòng tab 2 là CÂU NHẮC nên CTA không còn ngữ cảnh góc phố → PHẢI cho chọn,
// không được tự lấy góc phố mở đầu tiên như bản tạm.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SpotPickerModal from "@/components/home/SpotPickerModal";
import { issue } from "./helpers";

afterEach(cleanup);

const ISSUES = [
  issue({ id: "i1", location_text: "Hẻm 42 Lê Lợi", suggestion_count: 3 }),
  issue({ id: "i2", location_text: "Ngõ 7 Trần Phú", neighborhood_name: "Xóm Đình" }),
];

function picker(over: Partial<Parameters<typeof SpotPickerModal>[0]> = {}) {
  return render(
    <SpotPickerModal
      issues={ISSUES}
      onPick={vi.fn()}
      onPropose={vi.fn()}
      onClose={vi.fn()}
      {...over}
    />
  );
}

describe("SpotPickerModal — chọn góc phố trước khi viết câu", () => {
  it("liệt kê góc phố kèm khu phố và số câu đề xuất", () => {
    picker();
    const row = screen.getByText(/Hẻm 42 Lê Lợi/).closest("[data-spot]")! as HTMLElement;
    expect(within(row).getByText("Xóm Lò Gốm")).toBeTruthy();
    expect(within(row).getByText("3 câu đề xuất")).toBeTruthy();
    expect(screen.getByText(/Ngõ 7 Trần Phú/)).toBeTruthy();
  });

  it("bấm 'Gửi lời nhắc' trả đúng id góc phố được chọn", () => {
    const onPick = vi.fn();
    picker({ onPick });
    const row = screen.getByText(/Ngõ 7 Trần Phú/).closest("[data-spot]")! as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Gửi lời nhắc" }));
    expect(onPick).toHaveBeenCalledWith("i2");
  });

  it("tìm kiếm lọc theo tên góc phố, bỏ dấu vẫn ra", () => {
    picker();
    fireEvent.change(screen.getByLabelText("Tìm góc phố"), { target: { value: "hem 42" } });
    // tiêu đề dòng bị <mark> cắt thành nhiều node → so bằng textContent của dòng
    const rows = [...document.querySelectorAll("[data-spot]")].map((r) => r.textContent || "");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("Hẻm 42 Lê Lợi");
  });

  it("tìm theo tên khu phố cũng ra", () => {
    picker();
    fireEvent.change(screen.getByLabelText("Tìm góc phố"), { target: { value: "xóm đình" } });
    const rows = [...document.querySelectorAll("[data-spot]")].map((r) => r.textContent || "");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("Ngõ 7 Trần Phú");
  });

  it("không khớp gì thì mời đề xuất góc phố mới", () => {
    const onPropose = vi.fn();
    picker({ onPropose });
    fireEvent.change(screen.getByLabelText("Tìm góc phố"), { target: { value: "zzz" } });
    expect(screen.getByText(/Không thấy góc phố nào khớp/)).toBeTruthy();
    fireEvent.click(screen.getByText("+ Đề xuất góc phố mới"));
    expect(onPropose).toHaveBeenCalled();
  });

  it("danh sách rỗng vẫn còn lối đề xuất góc phố mới", () => {
    picker({ issues: [] });
    expect(screen.getByText("+ Đề xuất góc phố mới")).toBeTruthy();
    expect(screen.getByText(/Chưa có góc phố nào đang mở/)).toBeTruthy();
  });
});

describe("SpotPickerModal — thiết kế tự dựng (chốt 5/9)", () => {
  it("góc phố CÙNG khu phố của người dùng xếp lên nhóm đầu", () => {
    picker({ myNeighborhood: "Xóm Đình" });
    const groups = [...document.querySelectorAll("[data-group]")].map((g) => g.textContent);
    expect(groups[0]).toContain("Góc phố ở Xóm Đình");
    expect(groups[1]).toContain("khu phố khác");
    // dòng đầu tiên phải là góc phố của Xóm Đình (i2), không phải i1
    const rows = [...document.querySelectorAll("[data-spot]")];
    expect(rows[0].textContent).toContain("Ngõ 7 Trần Phú");
  });

  it("chưa định danh thì KHÔNG hiện tiêu đề nhóm", () => {
    picker();
    expect(document.querySelectorAll("[data-group]")).toHaveLength(0);
  });

  it("đếm số góc phố, đổi theo từ khoá", () => {
    picker();
    expect(screen.getByText("2 góc phố đang chờ lời nhắc")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm góc phố"), { target: { value: "hem 42" } });
    expect(screen.getByText(/1 góc phố khớp/)).toBeTruthy();
  });

  it("tô đậm đúng đoạn khớp (bỏ dấu vẫn khớp đúng vị trí)", () => {
    picker();
    fireEvent.change(screen.getByLabelText("Tìm góc phố"), { target: { value: "hem 42" } });
    const mark = document.querySelector("mark");
    expect(mark?.textContent).toBe("Hẻm 42");
  });

  it("Enter chọn góc phố đầu tiên đang hiện", () => {
    const onPick = vi.fn();
    picker({ onPick, myNeighborhood: "Xóm Đình" });
    fireEvent.keyDown(screen.getByLabelText("Tìm góc phố"), { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith("i2"); // góc phố của xóm mình
  });

  it("không khớp gì thì mời đổi từ khoá / đề xuất góc mới", () => {
    picker();
    fireEvent.change(screen.getByLabelText("Tìm góc phố"), { target: { value: "zzz" } });
    expect(screen.getByText(/Không thấy góc phố nào khớp/)).toBeTruthy();
    expect(screen.getByText("+ Đề xuất góc phố mới")).toBeTruthy();
  });
});
