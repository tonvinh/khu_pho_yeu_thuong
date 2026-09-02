"use client";
// Dải 3 con số theo skin mới (docs/lp): nằm NGOÀI hero, nền kem, một hàng ngang —
// số cam cỡ lớn (đệm 0 cho số < 10 như design "08") + nhãn xám bên phải.
import type { CounterData } from "./types";
import { COPY } from "@/lib/copy";

export default function Counters({ counters }: { counters: CounterData }) {
  const items = [
    { value: counters.signs_installed, label: COPY.counterLabels[0] },
    { value: counters.issues_open, label: COPY.counterLabels[1] },
    { value: counters.neighborhoods_joined, label: COPY.counterLabels[2] },
  ];
  // .fig Frame 163: khối 800px canh giữa (x=320…1120), 3 nhóm rộng bằng nhau (250.7px)
  // cách nhau 24px, mỗi nhóm: số 60px/lh78 + nhãn 20px/lh26, cách nhau 16px.
  // Mobile (quy chuẩn 2/9): GIỮ 1 HÀNG 3 CỘT, số trên — nhãn dưới; bản cũ dùng
  // flex-wrap nên vỡ thành 2 dòng lệch tâm ở khổ 390px.
  return (
    <div /* .fig: khối 800px canh giữa. Dùng max-w chứ KHÔNG ghim w-[800px]: khổ
          tablet 768 hẹp hơn 800 nên bản cũ đẩy cả trang tràn ngang. */
      className="mx-auto grid w-full max-w-[1312px] grid-cols-3 items-center gap-x-3 px-4 pb-8 pt-6 sm:max-w-[800px] sm:gap-x-6 sm:px-0 sm:pb-[22px] sm:pt-[25px]">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-center sm:gap-4 sm:text-left"
        >
          <span className="font-display text-[32px] font-bold leading-none tracking-[-0.02em] text-brick sm:text-[60px] sm:leading-[78px]">
            {it.value < 10 ? `0${it.value}` : it.value.toLocaleString("vi-VN")}
          </span>
          <span className="font-light text-[13px] leading-snug tracking-[-0.02em] text-ink sm:text-[20px] sm:leading-[26px]">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
