// @vitest-environment jsdom
// Chốt 7/9 — slider hero là 10 SLOT do admin xếp ở /admin/khu-pho.
//
// Ảnh QC khoanh đỏ cột "Vị trí tiêu biểu": admin xếp vị trí 1, 2 mà trang chủ không đổi
// gì. Nguyên nhân: slider lọc theo `certified_4n` nên cả `is_featured` lẫn
// `featured_position` đều vô nghĩa. Nay: khu lên slider là khu bật "Khu phố tiêu biểu",
// thứ tự do server sắp (ORDER BY featured_position NULLS LAST, name) và cắt còn 10 slot.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import NeighborhoodSlider from "@/components/home/NeighborhoodSlider";
import { FEATURED_SLOTS } from "@/lib/featured";
import { nb } from "./helpers";

afterEach(cleanup);

const show = (neighborhoods: ReturnType<typeof nb>[]) =>
  render(<NeighborhoodSlider map={{ neighborhoods, pins: [] }} />);

describe("NeighborhoodSlider — 10 slot tiêu biểu", () => {
  it("lấy khu theo is_featured, KHÔNG theo đạt chuẩn 4N", () => {
    show([
      nb({ id: "a", name: "Khu Tiêu Biểu", slug: "a", is_featured: true, certified_4n: false }),
      nb({ id: "b", name: "Khu Đạt 4N", slug: "b", is_featured: false, certified_4n: true }),
    ]);
    expect(screen.getAllByText(/Khu Tiêu Biểu/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Khu Đạt 4N/)).toBeNull();
  });

  it(`cắt đúng ${FEATURED_SLOTS} slot dù admin bật tiêu biểu nhiều hơn`, () => {
    show(
      Array.from({ length: FEATURED_SLOTS + 3 }, (_, i) =>
        nb({ id: `n${i}`, name: `Khu số ${i + 1}`, slug: `n${i}`, is_featured: true })
      )
    );
    // Ảnh + pill địa chỉ nên mỗi khu xuất hiện vài lần (kể cả slide clone) — chỉ cần
    // biết khu số 10 CÓ và khu số 11 KHÔNG.
    expect(screen.getAllByText(/Khu số 10\b/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Khu số 11\b/)).toHaveLength(0);
  });

  it("giữ NGUYÊN thứ tự server trả về (đã ORDER BY featured_position)", () => {
    const { container } = show([
      nb({ id: "x", name: "Khu slot 1", slug: "x", is_featured: true }),
      nb({ id: "y", name: "Khu slot 2", slug: "y", is_featured: true }),
    ]);
    // Track có kèm slide clone ở hai đầu (khu 2 · khu 1 · khu 2 · khu 1) — hai phần tử
    // GIỮA là hai slide thật, phải đúng thứ tự server trả về.
    const want = ["Khu slot 1", "Khu slot 2"];
    const names = [...container.querySelectorAll("*")]
      .filter((el) => el.children.length === 0 && want.includes(el.textContent || ""))
      .map((el) => el.textContent);
    expect(names.slice(1, 3)).toEqual(want);
  });
});
