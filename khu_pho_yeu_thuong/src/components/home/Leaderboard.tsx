"use client";
// Cột phải mục "Đang chờ bạn sáng tạo": bảng "Cây bút của khu phố" (prototype .board,
// header gradient ô liu) + biển chứng nhận 4N + tra cứu khu phố (02 §5, §6)
import { useState } from "react";
import type { Ambassador, MapNeighborhood, NeighborhoodOfMonth } from "./types";
import { COPY } from "@/lib/copy";
import { BASE } from "../client-api";

const RANK_STYLE = [
  "bg-fpt text-white",
  "bg-[#D9C8A6] text-[#5b4a2a]",
  "bg-[#E7D9BE] text-[#6b5836]",
];

export default function Leaderboard({
  ambassadors,
  neighborhoodOfMonth,
  neighborhoods,
}: {
  ambassadors: Ambassador[];
  neighborhoodOfMonth: NeighborhoodOfMonth | null;
  neighborhoods: MapNeighborhood[];
}) {
  const [lookupId, setLookupId] = useState("");
  const lookup = neighborhoods.find((n) => n.id === lookupId) ?? null;
  const certified = neighborhoods.find((n) => n.certified_4n) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Bảng xếp hạng */}
      <div className="kp-card overflow-hidden rounded-[18px]">
        <div className="bg-gradient-to-r from-olive to-olive-dark px-[17px] py-[15px] text-white">
          <div className="font-display text-base font-bold">{COPY.leaderboardTitle}</div>
          <div className="mt-0.5 text-xs opacity-90">{COPY.leaderboardSub}</div>
        </div>
        {ambassadors.slice(0, 5).map((a, i) => (
          <div key={a.user_id} className="flex items-center gap-3 border-t border-cream-dark px-[17px] py-3">
            <span
              className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full font-display text-[13px] font-bold ${
                RANK_STYLE[i] ?? "bg-[#F3ECE0] text-ink-soft"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {a.display_name}
                {a.neighborhood_name && (
                  <span className="font-normal text-ink-soft"> · {a.neighborhood_name}</span>
                )}
              </div>
              <div className="text-[11.5px] text-ink-soft">
                {a.signs_installed} câu được treo · {a.votes_received} lượt thương
              </div>
            </div>
            <span className="font-display font-bold text-olive-dark">{a.score}đ</span>
            <a
              href={`${BASE}/dai-su/${a.share_slug}`}
              title="Chia sẻ thành tích"
              className="grid h-8 w-8 flex-none place-items-center rounded-full border border-cream-dark bg-cream-panel text-xs text-ink-soft hover:text-brick"
            >
              ↗
            </a>
          </div>
        ))}
        {ambassadors.length === 0 && (
          <p className="m-0 border-t border-cream-dark px-[17px] py-5 text-center text-sm text-ink-soft">
            Chưa có ai lên bảng — viết câu nhắc đầu tiên cho xóm bạn nhé!
          </p>
        )}
        {neighborhoodOfMonth && (
          <div className="border-t border-cream-dark px-[17px] py-3.5 text-[13px] text-ink-soft">
            Khu phố tử tế nhất tháng: <b className="text-ink">{neighborhoodOfMonth.name}</b> —{" "}
            {neighborhoodOfMonth.new_signs} biển mới, {neighborhoodOfMonth.votes} lượt thương.
          </div>
        )}
      </div>

      {/* Biển chứng nhận 4N */}
      <div className="rounded-[18px] border border-[#CFE2D5] bg-[#E9F1EB] p-5 text-center">
        <div className="text-[12.5px] text-ink-soft">Chứng nhận “Khu phố biết thương” chuẩn 4N</div>
        <div className="mt-2.5 inline-block -rotate-[1.5deg] rounded-xl border-[1.5px] border-olive bg-white px-[18px] py-[13px] font-display text-[17px] font-semibold shadow-kp-s">
          {certified ? certified.name : "Xóm của bạn?"}
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {["Nhắc", "Nhở", "Nhỏ", "Nhẹ"].map((n) => (
            <span
              key={n}
              className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-olive-dark"
            >
              {n}
            </span>
          ))}
        </div>
        <p className="m-0 mt-2.5 text-xs text-ink-soft">
          Khu phố treo đủ 100% biển của các góc xóm sẽ được gắn chứng nhận “Khu phố biết thương” chuẩn 4N.
        </p>
        {certified && (
          <a
            href={`${BASE}/khu-pho/${certified.slug}`}
            className="kp-btn kp-btn-primary tap mt-3 px-5 py-1.5 text-sm"
          >
            Chia sẻ 💛
          </a>
        )}
      </div>

      {/* Tra cứu chứng nhận */}
      <div className="kp-card flex flex-col gap-2.5 p-4">
        <label htmlFor="cert-lookup" className="text-[13px] font-semibold">
          Tra cứu: xóm bạn được chứng nhận chưa?
        </label>
        <select
          id="cert-lookup"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          className="kp-input tap cursor-pointer"
        >
          <option value="">— Chọn khu phố của bạn —</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        {lookup && (
          <div
            className={`rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold ${
              lookup.certified_4n
                ? "bg-status-signed-bg text-status-signed"
                : "bg-status-voting-bg text-status-voting"
            }`}
          >
            {lookup.certified_4n
              ? `${lookup.name} đã đạt “Khu phố biết thương” chuẩn 4N${
                  lookup.certified_at
                    ? ` — ${new Date(lookup.certified_at).toLocaleDateString("vi-VN")}`
                    : ""
                }.`
              : `${lookup.name} chưa đạt chứng nhận — còn thiếu biển, rủ xóm viết thêm câu nhắc nha.`}
          </div>
        )}
      </div>
    </div>
  );
}
