// @vitest-environment jsdom
// Khối "Đóng góp một câu" — QC Figma bản 2/9 · B4.
//
// Bản 18/8 dựng ba tab GẦN GIỐNG NHAU (cùng meta phường · số câu · lượt thương, nút
// đổi theo số câu). Figma 7217:1990 tách hẳn ba tab thành ba cấu trúc dòng khác nhau:
//
//   tab 1 "Góc phố mới cần treo biển"  6 dòng · meta CHỈ "N câu đề xuất" · nút Gửi lời nhắc · KHÔNG có CTA đáy
//   tab 2 "Lời nhắc chờ bạn bình chọn" 5 dòng · hàng là CÂU NHẮC · meta phường · tác giả · N Bình chọn · nút Bình chọn/Đã bình chọn (xanh) · CTA "+ Viết câu nhắc của riêng bạn"
//   tab 3 "Cây bút của khu phố"        5 dòng · huy hiệu · meta N câu đóng góp · N Bình chọn · nút Xem lời nhắc (cam) · CTA "+ Đề xuất góc phố mới"
//
// Figma bản LIVE (4/9) đổi tiếp so với .fig 2/9: tab 2 hàng là CÂU NHẮC bấm bình chọn
// thẳng tại dòng (bỏ popup "Xem câu nhắc"), tab 3 nút đổi thành "Xem lời nhắc" viền cam.
// Bình chọn xong là chốt, không rút (Q6).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import IssueBoard from "@/components/home/IssueBoard";
import { ambassador, issue, note } from "./helpers";

vi.mock("@/components/client-api", () => ({
  apiGet: vi.fn(),
  apiSend: vi.fn(),
  BASE: "",
}));

afterEach(cleanup);

const ISSUES = [
  issue({
    id: "i1", location_text: "Hẻm 42 Lê Lợi", suggestion_count: 3, top_votes: 28,
    top_author_name: "Bà Liên",
  }),
  issue({ id: "i2", location_text: "Ngõ 7 Trần Phú", suggestion_count: 0, top_votes: 0 }),
  issue({ id: "i3", location_text: "Đường Số 5", status: "signed", suggestion_count: 2, top_votes: 9 }),
];

const NOTES = [
  note({ id: "n1", content: "Đường sạch, ngõ xinh - Xin đừng vứt rác", votes: 150 }),
  note({ id: "n2", content: "Đi chậm chút nha, có trẻ con đang chơi", author_name: "Bà Liên", votes: 28 }),
  note({ id: "n3", content: "Câu của chính mình", is_mine: true, votes: 3 }),
  note({ id: "n4", content: "Câu đã bình chọn rồi", voted: true, votes: 9 }),
];

const AMBASSADORS = [
  ambassador({ user_id: "u1", display_name: "Cô Bảy", suggestions_count: 10, votes_received: 150 }),
  ambassador({
    user_id: "u2", display_name: "Chú Tám", share_slug: "chu-tam-xyz",
    neighborhood_name: "Xóm Đình", suggestions_count: 4, votes_received: 12,
  }),
];

function board(over: Partial<Parameters<typeof IssueBoard>[0]> = {}) {
  return render(
    <IssueBoard
      title="Đóng góp một câu cho khu phố mình nhé"
      hint="Chọn một góc phố"
      issues={ISSUES}
      notes={NOTES}
      ambassadors={AMBASSADORS}
      onWrite={vi.fn()}
      onVoteNote={vi.fn()}
      onPickSpot={vi.fn()}
      onPropose={vi.fn()}
      onOpenAmbassador={vi.fn()}
      {...over}
    />
  );
}

const TAB1 = "Góc phố mới cần treo biển";
const TAB2 = "Lời nhắc chờ bạn bình chọn";
const TAB3 = "Cây bút của khu phố";
const openTab = (label: string) => fireEvent.click(screen.getByText(label));

describe("IssueBoard · B4 — nhãn ba tab theo Figma", () => {
  it("dùng ba nhãn mới, bỏ 'Mới nhất' và 'Chờ bạn bình chọn'", () => {
    board();
    expect(screen.getByText(TAB1)).toBeTruthy();
    expect(screen.getByText(TAB2)).toBeTruthy();
    expect(screen.getByText(TAB3)).toBeTruthy();
    expect(screen.queryByText("Mới nhất")).toBeNull();
    expect(screen.queryByText("Chờ bạn bình chọn")).toBeNull();
  });
});

describe("IssueBoard · B4 — tab 1 'Góc phố mới cần treo biển'", () => {
  it("bỏ góc phố đã treo biển", () => {
    board();
    expect(screen.getByText(/Hẻm 42 Lê Lợi/)).toBeTruthy();
    expect(screen.queryByText(/Đường Số 5/)).toBeNull();
  });

  it("meta CHỈ có số câu đề xuất — không phường, không lượt thương", () => {
    const { container } = board();
    const row = screen.getByText(/Hẻm 42 Lê Lợi/).closest("[data-row]")! as HTMLElement;
    expect(within(row).getByText("3 câu đề xuất")).toBeTruthy();
    expect(row.textContent).not.toContain("Xóm Lò Gốm");
    expect(row.textContent).not.toContain("lượt thương");
    expect(container.textContent).not.toContain("28 lượt thương");
  });

  it("góc phố chưa có câu nào hiện 'Chưa có câu đề xuất'", () => {
    board();
    const row = screen.getByText(/Ngõ 7 Trần Phú/).closest("[data-row]")! as HTMLElement;
    expect(within(row).getByText("Chưa có câu đề xuất")).toBeTruthy();
  });

  it("nút LUÔN là 'Gửi lời nhắc' kể cả khi đã có câu, gọi onWrite", () => {
    const onWrite = vi.fn();
    board({ onWrite });
    const buttons = screen.getAllByRole("button", { name: "Gửi lời nhắc" });
    expect(buttons).toHaveLength(2); // cả i1 (3 câu) lẫn i2 (0 câu)
    fireEvent.click(buttons[0]);
    expect(onWrite).toHaveBeenCalledWith("i1");
  });

  it("KHÔNG có CTA ở đáy card (design tab 1 bỏ hẳn)", () => {
    board();
    expect(screen.queryByText("+ Đề xuất góc phố mới")).toBeNull();
    expect(screen.queryByText("+ Viết câu nhắc của riêng bạn")).toBeNull();
  });

  it("phân trang 6 dòng/trang", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      issue({ id: `x${i}`, location_text: `Góc ${i}` })
    );
    board({ issues: many });
    expect(screen.getByText(/Góc 5/)).toBeTruthy();
    expect(screen.queryByText(/Góc 6/)).toBeNull();
    expect(screen.getByText("Trang 1/2")).toBeTruthy();
  });
});

describe("IssueBoard — tab 2 'Lời nhắc chờ bạn bình chọn' (Figma live 4/9)", () => {
  it("hàng là CÂU NHẮC, không phải góc phố", () => {
    board();
    openTab(TAB2);
    expect(screen.getByText("Đường sạch, ngõ xinh - Xin đừng vứt rác")).toBeTruthy();
    expect(screen.queryByText(/Hẻm 42 Lê Lợi/)).toBeNull();
  });

  it("meta ba mục đúng thứ tự: phường · tác giả · số bình chọn", () => {
    board();
    openTab(TAB2);
    const row = screen.getByText("Đường sạch, ngõ xinh - Xin đừng vứt rác").closest("[data-row]")! as HTMLElement;
    const metas = [...row.querySelectorAll("[data-meta]")].map((n) => n.textContent);
    expect(metas).toEqual(["Phường Bàn Cờ", "Trà FPT", "150 Bình chọn"]);
  });

  it("nút 'Bình chọn' gọi onVoteNote với id CÂU, không phải id góc phố", () => {
    const onVoteNote = vi.fn();
    board({ onVoteNote });
    openTab(TAB2);
    const row = screen.getByText("Đường sạch, ngõ xinh - Xin đừng vứt rác").closest("[data-row]")! as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Bình chọn" }));
    expect(onVoteNote).toHaveBeenCalledWith("n1");
  });

  it("câu đã bình chọn: nút đổi thành 'Đã bình chọn' và bị khoá (Q6 — không rút phiếu)", () => {
    const onVoteNote = vi.fn();
    board({ onVoteNote });
    openTab(TAB2);
    const btn = screen.getByRole("button", { name: "Đã bình chọn" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onVoteNote).not.toHaveBeenCalled();
  });

  it("câu của chính mình thì khoá nút (cấm tự thương)", () => {
    board();
    openTab(TAB2);
    const row = screen.getByText("Câu của chính mình").closest("[data-row]")! as HTMLElement;
    const btn = within(row).getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("KHÔNG còn nút 'Xem câu nhắc' của bản 2/9", () => {
    board();
    openTab(TAB2);
    expect(screen.queryByText("Xem câu nhắc")).toBeNull();
  });

  it("CTA đáy '+ Viết câu nhắc của riêng bạn' mở popup CHỌN GÓC PHỐ (chốt 4/9)", () => {
    const onPickSpot = vi.fn();
    const onWrite = vi.fn();
    board({ onPickSpot, onWrite });
    openTab(TAB2);
    expect(screen.queryByText("+ Đề xuất góc phố mới")).toBeNull();
    fireEvent.click(screen.getByText("+ Viết câu nhắc của riêng bạn"));
    expect(onPickSpot).toHaveBeenCalled();
    // KHÔNG được tự đoán góc phố đầu tiên như bản tạm trước đó
    expect(onWrite).not.toHaveBeenCalled();
  });

  it("phân trang 5 dòng/trang theo số CÂU", () => {
    const many = Array.from({ length: 7 }, (_, i) => note({ id: `n${i}`, content: `Câu ${i}` }));
    board({ notes: many });
    openTab(TAB2);
    expect(screen.getByText("Câu 4")).toBeTruthy();
    expect(screen.queryByText("Câu 5")).toBeNull();
    expect(screen.getByText("Trang 1/2")).toBeTruthy();
  });
});

describe("IssueBoard · B4/Q7 — tab 3 'Cây bút của khu phố'", () => {
  it("liệt kê NGƯỜI (A2), không phải góc phố", () => {
    board();
    openTab(TAB3);
    expect(screen.getByText("Cô Bảy")).toBeTruthy();
    expect(screen.queryByText(/Hẻm 42 Lê Lợi/)).toBeNull();
  });

  it("meta là 'N câu đóng góp' + 'N Bình chọn'; bỏ điểm và câu trích", () => {
    board();
    openTab(TAB3);
    const row = screen.getByText("Cô Bảy").closest("[data-row]")! as HTMLElement;
    const metas = [...row.querySelectorAll("[data-meta]")].map((n) => n.textContent);
    expect(metas).toEqual(["10 câu đóng góp", "150 Bình chọn"]);
    expect(row.textContent).not.toContain("82đ");
    expect(row.textContent).not.toContain("Đi chậm chút nha");
  });

  it("nút 'Xem lời nhắc' mở popup cây bút, KHÔNG còn 'Chia sẻ ↗' hay 'Bình chọn'", () => {
    const onOpenAmbassador = vi.fn();
    board({ onOpenAmbassador });
    openTab(TAB3);
    expect(screen.queryByText("Chia sẻ ↗")).toBeNull();
    expect(screen.queryByRole("button", { name: "Bình chọn" })).toBeNull();
    const btns = screen.getAllByRole("button", { name: "Xem lời nhắc" });
    // viền cam (kp-btn-primary), không còn xanh dương của bản 2/9
    expect(btns[0].className).toContain("kp-btn-primary");
    fireEvent.click(btns[0]);
    expect(onOpenAmbassador).toHaveBeenCalledWith("co-bay-abc");
  });

  it("huy hiệu hạng: TOP 1 xanh dương · TOP 2 cam, đếm tiếp sang trang sau", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      ambassador({ user_id: `u${i}`, display_name: `Cây bút ${i}`, share_slug: `s${i}` })
    );
    const { container } = board({ ambassadors: many });
    openTab(TAB3);
    const badges = container.querySelectorAll("[data-rank]");
    expect(badges).toHaveLength(5); // 5 dòng/trang
    expect(badges[0].className).toContain("bg-accent-blue");
    expect(badges[1].className).toContain("bg-brick");
    fireEvent.click(screen.getByText("›"));
    expect(screen.getByText("Cây bút 5")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("CTA đáy là '+ Đề xuất góc phố mới'", () => {
    const onPropose = vi.fn();
    board({ onPropose });
    openTab(TAB3);
    fireEvent.click(screen.getByText("+ Đề xuất góc phố mới"));
    expect(onPropose).toHaveBeenCalled();
  });
});

describe("IssueBoard · B4 — kẻ ngăn dòng và biên", () => {
  it("kẻ ngăn là NÉT ĐỨT (.kp-row-sep), không phải viền liền", () => {
    const { container } = board();
    const row = screen.getByText(/Hẻm 42 Lê Lợi/).closest("[data-row]")!;
    expect(row.className).toContain("kp-row-sep");
    expect(container.querySelector(".border-b.border-cream-dark")).toBeNull();
  });

  it("đổi tab thì quay về trang 1", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      ambassador({ user_id: `u${i}`, display_name: `Cây bút ${i}`, share_slug: `s${i}` })
    );
    board({ ambassadors: many });
    openTab(TAB3);
    fireEvent.click(screen.getByText("›"));
    expect(screen.getByText("Trang 2/2")).toBeTruthy();
    openTab(TAB1);
    openTab(TAB3);
    expect(screen.getByText("Trang 1/2")).toBeTruthy();
  });

  it("biên: mỗi tab rỗng dùng đúng câu rỗng của nó", () => {
    board({ issues: [], notes: [], ambassadors: [] });
    expect(screen.getByText(/Chưa có góc phố nào đang mở/)).toBeTruthy();
    openTab(TAB2);
    expect(screen.getByText(/Chưa có lời nhắc nào đang chờ bình chọn/)).toBeTruthy();
    openTab(TAB3);
    expect(screen.getByText(/Chưa có cây bút nào được vinh danh/)).toBeTruthy();
  });

  it("biên: cây bút chưa có câu / chưa có lượt thương vẫn render", () => {
    board({ ambassadors: [ambassador({ suggestions_count: 0, votes_received: 0 })] });
    openTab(TAB3);
    const row = screen.getByText("Cô Bảy").closest("[data-row]")! as HTMLElement;
    expect(within(row).getByText("0 câu đóng góp")).toBeTruthy();
    expect(within(row).getByText("0 Bình chọn")).toBeTruthy();
  });
});

describe("IssueBoard — nút trong dòng không xuống 2 dòng", () => {
  it("nút dòng mang .kp-btn-row và nhả lề ngang từ sm (khung rộng cố định)", () => {
    board();
    for (const [label, w] of [["Gửi lời nhắc", "sm:w-[120px]"]] as const) {
      const btn = screen.getAllByRole("button", { name: label })[0];
      expect(btn.className).toContain("kp-btn-row");
      expect(btn.className).toContain(w);
      expect(btn.className).toContain("sm:px-0");
      // cỡ chữ do .kp-btn-row quyết định, không để utility text-* (bị .kp-btn đè)
      expect(btn.className).not.toMatch(/text-\[13\.5px\]|sm:text-\[14px\]/);
    }
  });
});
