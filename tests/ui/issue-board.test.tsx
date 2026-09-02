// @vitest-environment jsdom
// Khối "Đóng góp một câu" — QC Figma bản 2/9 · B4.
//
// Bản 18/8 dựng ba tab GẦN GIỐNG NHAU (cùng meta phường · số câu · lượt thương, nút
// đổi theo số câu). Figma 7217:1990 tách hẳn ba tab thành ba cấu trúc dòng khác nhau:
//
//   tab 1 "Góc phố mới cần treo biển"  6 dòng · meta CHỈ "N câu đề xuất" · nút Gửi lời nhắc · KHÔNG có CTA đáy
//   tab 2 "Lời nhắc chờ bạn bình chọn" 5 dòng · meta phường · người · N Bình chọn · nút Xem câu nhắc · CTA "+ Viết câu nhắc của riêng bạn"
//   tab 3 "Cây bút của khu phố"        5 dòng · huy hiệu · meta N câu đóng góp · N Bình chọn · nút Bình chọn (xanh) · CTA "+ Đề xuất góc phố mới"
//
// A2 (quyết định F3) vẫn giữ: hai tab đầu là GÓC PHỐ, tab ba là NGƯỜI.
// Q7 (2/9): tab 3 bỏ nút "Chia sẻ ↗", thay bằng "Bình chọn" mở popup Cây bút khu phố.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import IssueBoard from "@/components/home/IssueBoard";
import { ambassador, issue } from "./helpers";

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
      ambassadors={AMBASSADORS}
      onWrite={vi.fn()}
      onVote={vi.fn()}
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

describe("IssueBoard · B4 — tab 2 'Lời nhắc chờ bạn bình chọn'", () => {
  it("chỉ giữ góc phố đã có câu", () => {
    board();
    openTab(TAB2);
    expect(screen.getByText(/Hẻm 42 Lê Lợi/)).toBeTruthy();
    expect(screen.queryByText(/Ngõ 7 Trần Phú/)).toBeNull();
  });

  it("meta ba mục đúng thứ tự: phường · người viết · số bình chọn", () => {
    board();
    openTab(TAB2);
    const row = screen.getByText(/Hẻm 42 Lê Lợi/).closest("[data-row]")! as HTMLElement;
    const metas = [...row.querySelectorAll("[data-meta]")].map((n) => n.textContent);
    expect(metas).toEqual(["Xóm Lò Gốm", "Bà Liên", "28 Bình chọn"]);
  });

  it("biên: chưa có tên người viết thì bỏ mục đó, không render dòng trống", () => {
    board({ issues: [issue({ id: "i9", suggestion_count: 2, top_votes: 5, top_author_name: null })] });
    openTab(TAB2);
    const row = screen.getByText(/Hẻm 42 Lê Lợi/).closest("[data-row]")! as HTMLElement;
    const metas = [...row.querySelectorAll("[data-meta]")].map((n) => n.textContent);
    expect(metas).toEqual(["Xóm Lò Gốm", "5 Bình chọn"]);
  });

  it("nút 'Xem câu nhắc' gọi onVote", () => {
    const onVote = vi.fn();
    board({ onVote });
    openTab(TAB2);
    fireEvent.click(screen.getByRole("button", { name: "Xem câu nhắc" }));
    expect(onVote).toHaveBeenCalledWith("i1");
  });

  it("CTA đáy là '+ Viết câu nhắc của riêng bạn'", () => {
    board();
    openTab(TAB2);
    expect(screen.getByText("+ Viết câu nhắc của riêng bạn")).toBeTruthy();
    expect(screen.queryByText("+ Đề xuất góc phố mới")).toBeNull();
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

  it("nút 'Bình chọn' mở popup cây bút, KHÔNG còn 'Chia sẻ ↗'", () => {
    const onOpenAmbassador = vi.fn();
    board({ onOpenAmbassador });
    openTab(TAB3);
    expect(screen.queryByText("Chia sẻ ↗")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Bình chọn" })[0]);
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
    board({ issues: [], ambassadors: [] });
    expect(screen.getByText(/Chưa có góc phố nào đang mở/)).toBeTruthy();
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
