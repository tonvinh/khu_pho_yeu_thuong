// @vitest-environment jsdom
// Ô tra cứu 4N ở hero — QC Figma bản 2/9 · B3.
// Bản .fig có ba frame riêng cho ba trạng thái của dropdown `Frame 261`:
//   (a) 7745:2107 nhiều kết quả — mỗi dòng có PILL xanh "Đạt chuẩn 4N" (web đang xài emoji 🏅)
//   (b) 7458:38738 đúng 1 kết quả — card nền #FFF7EA + dòng mời + nút "Xem khu phố" (web CHƯA có)
//   (c) 7745:1345 rỗng — pin + "Chưa tìm thấy khu phố này" (web đang ghi câu khác)
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import HeroLookup from "@/components/home/HeroLookup";
import { nb } from "./helpers";

afterEach(cleanup);

const NBS = [
  nb({ id: "n1", name: "Xóm Lò Gốm", slug: "xom-lo-gom", certified_4n: true }),
  nb({ id: "n2", name: "Xóm Đình", slug: "xom-dinh", ward: "Phường Bàn Cờ", certified_4n: false }),
];

function lookup(over: Partial<Parameters<typeof HeroLookup>[0]> = {}) {
  return render(
    <HeroLookup
      neighborhoods={NBS}
      placeholder="Xóm mình đã đạt chuẩn 4N chưa?"
      onPropose={vi.fn()}
      onOpenNeighborhood={vi.fn()}
      {...over}
    />
  );
}

const type = (text: string) =>
  fireEvent.change(screen.getByRole("combobox"), { target: { value: text } });

describe("HeroLookup · B3(a) — nhiều kết quả", () => {
  it("khu đạt chuẩn hiện PILL 'Đạt chuẩn 4N', không còn emoji 🏅", () => {
    lookup();
    type("xóm");
    const list = screen.getByRole("listbox");
    expect(within(list).getByText("Đạt chuẩn 4N")).toBeTruthy();
    expect(list.textContent).not.toContain("🏅");
  });

  it("khu chưa đạt chuẩn thì KHÔNG có pill", () => {
    lookup();
    type("xóm");
    const row = screen.getByText("Xóm Đình").closest("[role=option]")! as HTMLElement;
    expect(within(row).queryByText("Đạt chuẩn 4N")).toBeNull();
  });

  it("mỗi dòng có dòng địa chỉ phường - tỉnh bên dưới tên", () => {
    lookup();
    type("xóm");
    const row = screen.getByText("Xóm Đình").closest("[role=option]")! as HTMLElement;
    // wardAddress: giữ nguyên tên phường, viết tắt tỉnh — đúng dạng .fig vẽ
    expect(row.textContent).toContain("Phường Bàn Cờ, TP. Hồ Chí Minh");
  });
});

describe("HeroLookup · B3(b) — đúng 1 kết quả", () => {
  it("chỉ còn 1 khu khớp → hiện thẳng card kết quả, không cần bấm chọn", () => {
    lookup();
    type("Lò Gốm");
    expect(screen.getByTestId("lookup-single")).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("card có dòng mời viết câu và nút 'Xem khu phố'", () => {
    const onOpenNeighborhood = vi.fn();
    lookup({ onOpenNeighborhood });
    type("Lò Gốm");
    expect(screen.getByText(/bạn viết câu đầu tiên nhé/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xem khu phố" }));
    expect(onOpenNeighborhood).toHaveBeenCalledWith("xom-lo-gom");
  });

  it("card dùng nền #FFF7EA theo .fig (Frame 274)", () => {
    lookup();
    type("Lò Gốm");
    expect(screen.getByTestId("lookup-single").className).toContain("bg-[#FFF7EA]");
  });
});

describe("HeroLookup · B3(c) — không có kết quả", () => {
  it("dùng đúng câu của design, bỏ câu cũ có nháy kép", () => {
    lookup();
    type("zzzz");
    expect(screen.getByText("Chưa tìm thấy khu phố này")).toBeTruthy();
    expect(screen.queryByText(/chưa tham gia/)).toBeNull();
  });

  it("có icon pin đứng trước và nút '+ Đề xuất góc phố mới'", () => {
    const onPropose = vi.fn();
    lookup({ onPropose });
    type("zzzz");
    const box = screen.getByTestId("lookup-empty");
    expect(box.querySelector("svg")).toBeTruthy();
    fireEvent.click(within(box).getByRole("button", { name: "+ Đề xuất góc phố mới" }));
    expect(onPropose).toHaveBeenCalled();
  });

  it("biên: 1 ký tự thì chưa báo rỗng (tránh loé khi vừa gõ)", () => {
    lookup();
    type("z");
    expect(screen.queryByTestId("lookup-empty")).toBeNull();
  });

  it("biên: xoá trắng ô thì không còn khối kết quả nào", () => {
    lookup();
    type("zzzz");
    type("");
    expect(screen.queryByTestId("lookup-empty")).toBeNull();
    expect(screen.queryByTestId("lookup-single")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("biên: danh sách khu phố rỗng vẫn báo đúng, không crash", () => {
    lookup({ neighborhoods: [] });
    type("Xóm");
    expect(screen.getByText("Chưa tìm thấy khu phố này")).toBeTruthy();
  });
});
