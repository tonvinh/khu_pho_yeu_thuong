// @vitest-environment jsdom
// QC 2/9 · A2 — tab "Cây bút của khu phố" phải liệt kê NGƯỜI, không phải góc phố.
// Quyết định F3 (docs/21): "hàng = tên cây bút · khu phố · câu được thương nhất · điểm
// · nút chia sẻ ↗". Trước khi sửa, cả ba tab cùng dựng từ `issues` nên TOP 1 là
// "Trẻ con trong xóm · Hẻm 42 Lê Lợi" kèm nút "Bình chọn".
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
  issue({ id: "i1", location_text: "Hẻm 42 Lê Lợi", suggestion_count: 3, top_votes: 28 }),
  issue({ id: "i2", location_text: "Ngõ 7 Trần Phú", suggestion_count: 0, top_votes: 0 }),
  issue({ id: "i3", location_text: "Đường Số 5", status: "signed", suggestion_count: 2, top_votes: 9 }),
];

const AMBASSADORS = [
  ambassador({ user_id: "u1", display_name: "Cô Bảy", score: 82, votes_received: 45 }),
  ambassador({
    user_id: "u2", display_name: "Chú Tám", share_slug: "chu-tam-xyz",
    neighborhood_name: "Xóm Đình", score: 37, votes_received: 12,
    top_quote: "Xóm mình nhớ nhắc nhau khoá cổng.",
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
      {...over}
    />
  );
}

const openWriters = () => fireEvent.click(screen.getByText("Cây bút của khu phố"));

describe("IssueBoard — hai tab góc phố", () => {
  it("tab 'Mới nhất' bỏ góc phố đã treo biển, nút đổi theo số câu", () => {
    board();
    expect(screen.getByText(/Hẻm 42 Lê Lợi/)).toBeTruthy();
    expect(screen.getByText(/Ngõ 7 Trần Phú/)).toBeTruthy();
    expect(screen.queryByText(/Đường Số 5/)).toBeNull(); // status signed
    expect(screen.getByText("Bình chọn")).toBeTruthy(); // i1 đã có câu
    expect(screen.getByText("Gửi lời nhắc")).toBeTruthy(); // i2 chưa có câu
  });

  it("dòng góc phố KHÔNG còn huy hiệu hạng (hạng chỉ dành cho người)", () => {
    board();
    expect(screen.queryByText("Top")).toBeNull();
  });

  it("tab 'Chờ bạn bình chọn' chỉ giữ góc phố đã có câu", () => {
    board();
    fireEvent.click(screen.getByText("Chờ bạn bình chọn"));
    expect(screen.getByText(/Hẻm 42 Lê Lợi/)).toBeTruthy();
    expect(screen.queryByText(/Ngõ 7 Trần Phú/)).toBeNull();
  });
});

describe("IssueBoard — tab 'Cây bút của khu phố' (A2)", () => {
  it("liệt kê NGƯỜI kèm khu phố, lượt thương, điểm và câu được thương nhất", () => {
    board();
    openWriters();
    expect(screen.getByText("Cô Bảy")).toBeTruthy();
    expect(screen.getByText("Chú Tám")).toBeTruthy();
    expect(screen.getByText("45 lượt thương")).toBeTruthy();
    expect(screen.getByText("82đ")).toBeTruthy();
    expect(screen.getByText(/Đi chậm chút nha/)).toBeTruthy();
  });

  it("không còn dòng góc phố và không còn nút 'Bình chọn' trong tab này", () => {
    board();
    openWriters();
    expect(screen.queryByText(/Hẻm 42 Lê Lợi/)).toBeNull();
    expect(screen.queryByText("Bình chọn")).toBeNull();
    expect(screen.queryByText("Gửi lời nhắc")).toBeNull();
  });

  it("mỗi dòng có nút chia sẻ ↗ trỏ đúng /dai-su/{share_slug}", () => {
    board();
    openWriters();
    const links = screen.getAllByText("Chia sẻ ↗") as HTMLAnchorElement[];
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/dai-su/co-bay-abc");
    expect(links[1].getAttribute("href")).toBe("/dai-su/chu-tam-xyz");
  });

  it("huy hiệu hạng theo THỨ TỰ SERVER trả về, TOP 1 xanh dương / TOP 2 cam", () => {
    const { container } = board();
    openWriters();
    const badges = container.querySelectorAll(".rounded-\\[8px\\]");
    expect(badges).toHaveLength(2);
    expect(badges[0].className).toContain("bg-accent-blue");
    expect(badges[1].className).toContain("bg-brick");
    expect(within(badges[0] as HTMLElement).getByText("1")).toBeTruthy();
  });

  it("chip số trên tab đếm theo số cây bút, không theo số góc phố", () => {
    board();
    const tab = screen.getByText("Cây bút của khu phố").closest("button")!;
    expect(within(tab).getByText("2")).toBeTruthy();
  });

  it("phân trang 5 dòng/trang tính trên danh sách người", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      ambassador({ user_id: `u${i}`, display_name: `Cây bút ${i}`, share_slug: `s${i}` })
    );
    board({ ambassadors: many });
    openWriters();
    expect(screen.getByText("Trang 1/2")).toBeTruthy();
    expect(screen.getByText("Cây bút 0")).toBeTruthy();
    expect(screen.queryByText("Cây bút 5")).toBeNull();

    fireEvent.click(screen.getByText("›"));
    expect(screen.getByText("Cây bút 5")).toBeTruthy();
    // Hạng tiếp tục đếm sang trang 2 (dòng thứ 6 là hạng 6)
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("đổi tab thì quay về trang 1", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      ambassador({ user_id: `u${i}`, display_name: `Cây bút ${i}`, share_slug: `s${i}` })
    );
    board({ ambassadors: many });
    openWriters();
    fireEvent.click(screen.getByText("›"));
    expect(screen.getByText("Trang 2/2")).toBeTruthy();
    fireEvent.click(screen.getByText("Mới nhất"));
    openWriters();
    expect(screen.getByText("Trang 1/2")).toBeTruthy();
  });

  it("chưa có cây bút nào → dùng đúng câu rỗng của NGƯỜI, không nói về góc phố", () => {
    board({ ambassadors: [] });
    openWriters();
    expect(
      screen.getByText("Chưa có cây bút nào được vinh danh — viết câu đầu tiên cho xóm mình nhé!")
    ).toBeTruthy();
  });

  it("cây bút chưa gắn khu phố / chưa có câu nào thì vẫn render được", () => {
    board({
      ambassadors: [ambassador({ neighborhood_name: null, top_quote: null, votes_received: 0 })],
    });
    openWriters();
    expect(screen.getByText("Cô Bảy")).toBeTruthy();
    expect(screen.getByText("0 lượt thương")).toBeTruthy();
  });
});
