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

describe("HeroLookup — câu mời ở ô 1 kết quả đổi theo số lời nhắc (chốt 4/9)", () => {
  const single = (notes_count: number) =>
    lookup({ neighborhoods: [nb({ name: "Hẻm 51 Cao Thắng", notes_count, certified_4n: notes_count > 0 })] });

  it("khu ĐÃ có lời nhắc: 'Hãy cùng góp thêm lời nhắc cho khu phố nhé!'", () => {
    single(12);
    type("Hẻm 51 Cao Thắng");
    expect(screen.getByText("Hãy cùng góp thêm lời nhắc cho khu phố nhé!")).toBeTruthy();
    expect(screen.queryByText(/viết câu đầu tiên/)).toBeNull();
  });

  it("khu CHƯA có lời nhắc: giữ câu mời viết câu đầu tiên", () => {
    single(0);
    type("Hẻm 51 Cao Thắng");
    expect(screen.getByText(/Khu phố mình chưa có lời nhắc, bạn viết câu đầu tiên nhé\?/)).toBeTruthy();
  });
});

// Bản .fig vẽ CẢ BA trạng thái trong cùng `Frame 261` 816×… r=16 nền trắng, là dropdown
// NỔI đè lên dải 3 con số. Trước đây (b) và (c) nằm trong luồng (`mt-3`) nên trang tụt
// xuống và sai nhịp dọc — khoá lại bằng class dùng chung.
describe("HeroLookup — cả 3 trạng thái dùng chung khung dropdown nổi (Frame 261)", () => {
  it("(a) danh sách nằm trong panel .kp-lookup-panel", () => {
    lookup();
    type("xóm");
    expect(screen.getByRole("listbox").className).toContain("kp-lookup-panel");
  });

  it("(b) card 1 kết quả nằm TRONG panel trắng, không phải khối rời trong luồng", () => {
    lookup();
    type("Lò Gốm");
    const panel = screen.getByTestId("lookup-single").parentElement!;
    expect(panel.className).toContain("kp-lookup-panel");
  });

  it("(c) khối rỗng chính là panel", () => {
    lookup();
    type("zzzz");
    expect(screen.getByTestId("lookup-empty").className).toContain("kp-lookup-panel");
  });

  it("(b) dòng mời là chữ CAM Bold 16px theo .fig (fill #FF8206), không phải chữ đậm nhạt", () => {
    lookup();
    type("Lò Gốm");
    const line = screen.getByText(/bạn viết câu đầu tiên nhé/);
    expect(line.className).toContain("text-brick");
    expect(line.className).toContain("font-bold");
  });
});

// QC 7/9: thanh tra cứu KHÔNG có nút tròn cam "+" bên phải. Node `Button` (30×30 r=800
// fill #FF8206 + icon vuesax/linear/add) có trong component `Searchbox` nhưng instance ở
// frame landing `7458:39755` override `visible=false`, và ảnh export cũng không vẽ nó.
// dump.py không resolve override của INSTANCE nên bản 2/9 dựng nhầm.
describe("HeroLookup — thanh tra cứu chỉ có kính lúp + ô nhập", () => {
  it("không có nút nào bên trong thanh tra cứu khi chưa gõ gì", () => {
    lookup();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("thanh tra cứu là cha trực tiếp của ô nhập và không chứa <button>", () => {
    lookup();
    const bar = screen.getByRole("combobox").parentElement!;
    expect(bar.querySelector("button")).toBeNull();
    expect(bar.querySelector("svg")).toBeTruthy(); // kính lúp 18px vẫn còn
  });
});
