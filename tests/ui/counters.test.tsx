// @vitest-environment jsdom
// QC Figma mới 2/9 · B2 — dải 3 con số ở hero.
// Figma 7217:1990 đổi CẢ nhãn lẫn Ý NGHĨA của hai ô cuối:
//   ô 2 "Góc phố đang chờ" (issues_open) → "Khu phố"      (neighborhoods_joined)
//   ô 3 "Khu phố tham gia" (neighborhoods_joined) → "Câu đóng góp" (suggestions_total)
// `counters.ts` đã đếm sẵn cả hai chỉ số mới nên chỉ đổi mapping, không đụng SQL.
// Node ẩn "+300 Người đóng góp" (Frame 161) KHÔNG dựng.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Counters from "@/components/home/Counters";
import type { CounterData } from "@/components/home/types";

afterEach(cleanup);

const counters = (over: Partial<CounterData> = {}): CounterData => ({
  signs_installed: 65,
  neighborhoods_joined: 25,
  suggestions_total: 8,
  ...over,
});

describe("Counters · B2 — nhãn và nguồn số theo Figma bản 2/9", () => {
  it("ba nhãn đúng thứ tự: Biển đã treo · Khu phố · Câu đóng góp", () => {
    const { container } = render(<Counters counters={counters()} />);
    const labels = [...container.querySelectorAll("div > span:last-child")].map((n) => n.textContent);
    expect(labels).toEqual(["Biển đã treo", "Khu phố", "Câu đóng góp"]);
  });

  it("ô 2 lấy số KHU PHỐ, ô 3 lấy số CÂU ĐÓNG GÓP (không còn góc phố đang chờ)", () => {
    const { container } = render(
      <Counters counters={counters({ neighborhoods_joined: 25, suggestions_total: 8 })} />
    );
    const groups = [...container.firstElementChild!.children];
    expect(groups[0].textContent).toBe("65Biển đã treo");
    expect(groups[1].textContent).toBe("25Khu phố");
    expect(groups[2].textContent).toBe("08Câu đóng góp");
  });

  it("không còn nhãn cũ trên trang", () => {
    render(<Counters counters={counters()} />);
    expect(screen.queryByText("Góc phố đang chờ")).toBeNull();
    expect(screen.queryByText("Khu phố tham gia")).toBeNull();
  });

  it("biên: số < 10 đệm 0 như design ('08'), số ≥ 1000 có dấu phân cách", () => {
    render(<Counters counters={counters({ signs_installed: 9, neighborhoods_joined: 1234 })} />);
    expect(screen.getByText("09")).toBeTruthy();
    expect(screen.getByText("1.234")).toBeTruthy();
    expect(screen.getByText("08")).toBeTruthy(); // suggestions_total = 8
  });

  it("biên: tất cả bằng 0 vẫn render đủ 3 ô", () => {
    const { container } = render(
      <Counters counters={counters({ signs_installed: 0, neighborhoods_joined: 0, suggestions_total: 0 })} />
    );
    expect(container.firstElementChild!.children).toHaveLength(3);
    expect(screen.getAllByText("00")).toHaveLength(3);
  });

  it("KHÔNG dựng ô ẩn '+300 Người đóng góp' (Frame 161 visible=false)", () => {
    render(<Counters counters={counters()} />);
    expect(screen.queryByText(/Người đóng góp/)).toBeNull();
  });
});
