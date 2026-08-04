"use client";
// Cột phải mục "Đang chờ bạn sáng tạo": bảng "Cây bút của khu phố" (prototype .board,
// header gradient ô liu) + biển chứng nhận 4N + tra cứu khu phố (02 §5, §6).
// Bảng cây bút: hạng 1 spotlight kèm câu được thương nhất, hàng 2-5 hiện câu thay số liệu,
// tab "Từ đầu mùa / Tuần này", mũi tên đổi hạng so với tuần trước (tính từ week_points),
// 🔥 người tăng điểm mạnh nhất tuần, hàng "Bạn đang ở hạng #N" khi đã định danh.
import { useState } from "react";
import type { Ambassador, MapNeighborhood, NeighborhoodOfMonth, ViewerRank } from "./types";
import { COPY } from "@/lib/copy";
import { BASE } from "../client-api";
import NeighborhoodPicker from "./NeighborhoodPicker";

const RANK_STYLE = [
  "bg-fpt text-white",
  "bg-[#D9C8A6] text-[#5b4a2a]",
  "bg-[#E7D9BE] text-[#6b5836]",
];

/** Mũi tên đổi hạng so với tuần trước (delta > 0 = lên hạng) */
function RankDelta({ delta }: { delta: number }) {
  if (delta === 0) return null;
  return delta > 0 ? (
    <span title={`Lên ${delta} hạng so với tuần trước`} className="text-[10.5px] font-bold text-status-signed">
      ▲{delta}
    </span>
  ) : (
    <span title={`Xuống ${-delta} hạng so với tuần trước`} className="text-[10.5px] font-bold text-ink-soft/70">
      ▼{-delta}
    </span>
  );
}

function ShareArrow({ slug }: { slug: string }) {
  return (
    <a
      href={`${BASE}/dai-su/${slug}`}
      title="Chia sẻ thành tích"
      className="grid h-9 w-9 flex-none place-items-center rounded-full border border-cream-dark bg-cream-panel text-xs text-ink-soft hover:text-brick sm:h-8 sm:w-8"
    >
      ↗
    </a>
  );
}

export default function Leaderboard({
  ambassadors,
  neighborhoodOfMonth,
  neighborhoods,
  viewerRank,
  identified,
}: {
  ambassadors: Ambassador[];
  neighborhoodOfMonth: NeighborhoodOfMonth | null;
  neighborhoods: MapNeighborhood[];
  viewerRank: ViewerRank | null;
  identified: boolean;
}) {
  const [range, setRange] = useState<"all" | "week">("all");
  const [lookupId, setLookupId] = useState<string | null>(null);
  const [lookupText, setLookupText] = useState("");
  const [certIdx, setCertIdx] = useState(0);
  const lookup = neighborhoods.find((n) => n.id === lookupId) ?? null;
  const lookupMiss = !lookup && lookupText.trim().length > 0 &&
    !neighborhoods.some((n) => n.name.toLowerCase().includes(lookupText.trim().toLowerCase()));
  const certified = neighborhoods.find((n) => n.certified_4n) ?? null;
  // Slideshow ảnh chứng nhận: các khu đã có ảnh (admin upload) — bấm ảnh để chuyển khu kế
  const certNbs = neighborhoods.filter((n) => n.certificate_url);
  const cert = certNbs.length > 0 ? certNbs[certIdx % certNbs.length] : null;

  // Hạng tuần trước = xếp theo (điểm hiện tại − điểm 7 ngày) — không cần bảng snapshot
  const prevRank = new Map(
    [...ambassadors]
      .sort((a, b) => (b.score - b.week_points) - (a.score - a.week_points))
      .map((a, i) => [a.user_id, i])
  );
  const week = ambassadors
    .filter((a) => a.week_points > 0)
    .sort((a, b) => b.week_points - a.week_points);
  // 🔥 cây bút tăng điểm mạnh nhất 7 ngày
  const risingId = week[0]?.user_id ?? null;

  const list = (range === "week" ? week : ambassadors).slice(0, 5);
  const [top, ...rest] = list;
  const points = (a: Ambassador) =>
    range === "week" ? `+${a.week_points}đ` : `${a.score}đ`;
  const delta = (a: Ambassador, idx: number) =>
    range === "all" ? (prevRank.get(a.user_id) ?? idx) - idx : 0;
  const name = (a: Ambassador) => (
    <>
      {a.display_name}
      {a.user_id === risingId && (
        <span title="Đang lên nhanh tuần này" className="ml-1">🔥</span>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Bảng xếp hạng */}
      <div className="kp-card overflow-hidden rounded-[18px]">
        <div className="bg-gradient-to-r from-olive to-olive-dark px-4 py-3.5 text-white sm:px-[17px] sm:py-[15px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display text-base font-bold">{COPY.leaderboardTitle}</div>
            <div className="flex flex-none gap-1">
              {([["all", "Từ đầu mùa"], ["week", "Tuần này"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setRange(k)}
                  className={`tap cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    range === k ? "bg-white/90 text-olive-dark" : "bg-white/15 text-white/85 hover:bg-white/25"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-0.5 text-xs opacity-90">{COPY.leaderboardSub}</div>
        </div>

        {/* Hạng 1: spotlight kèm câu được thương nhất */}
        {top && (
          <div className="border-t border-cream-dark bg-[#FBF7EF] px-4 py-3.5 sm:px-[17px]">
            <div className="flex items-center gap-3">
              <span className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-full font-display text-[14px] font-bold ${RANK_STYLE[0]}`}>
                1
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[15px] font-semibold leading-snug">
                  {name(top)}
                  {top.neighborhood_name && (
                    <span className="font-normal text-ink-soft"> · {top.neighborhood_name}</span>
                  )}
                </div>
              </div>
              <RankDelta delta={delta(top, 0)} />
              <span className="font-display text-lg font-bold text-olive-dark">{points(top)}</span>
              <ShareArrow slug={top.share_slug} />
            </div>
            {top.top_quote && (
              <div className="mt-2.5 rounded-[10px] border border-cream-dark bg-white px-3 py-2">
                <div className="font-display text-[13.5px] font-semibold leading-snug text-brick-dark">
                  “{top.top_quote}”
                </div>
                {top.top_quote_spot && (
                  <div className="mt-1 text-[11px] text-ink-soft">
                    {top.top_quote_installed ? "đang treo ở" : "viết cho"} {top.top_quote_spot}
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 flex gap-1.5 text-[10.5px] text-ink-soft">
              <span className="rounded-full bg-[#F3ECE0] px-2 py-0.5">{top.signs_installed} câu được treo</span>
              <span className="rounded-full bg-[#F3ECE0] px-2 py-0.5">🧡 {top.votes_received} lượt thương</span>
            </div>
          </div>
        )}

        {/* Hạng 2-5: câu được thương nhất thay cho dòng số liệu */}
        {/* Lưới 3 cột: hạng · tên+điểm · câu nhắc trải hết bề ngang hàng dưới —
            trên mobile xếp một dòng ngang thì câu nhắc chỉ còn vài chữ rồi cụt */}
        {rest.map((a, i) => (
          <div
            key={a.user_id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 border-t border-cream-dark px-4 py-3 sm:px-[17px]"
          >
            <span
              className={`row-span-2 grid h-[26px] w-[26px] flex-none place-items-center self-start rounded-full font-display text-[13px] font-bold ${
                RANK_STYLE[i + 1] ?? "bg-[#F3ECE0] text-ink-soft"
              }`}
            >
              {i + 2}
            </span>
            <div className="truncate text-sm font-semibold">
              {name(a)}
              {a.neighborhood_name && (
                <span className="font-normal text-ink-soft"> · {a.neighborhood_name}</span>
              )}
            </div>
            <div className="flex flex-none items-center gap-2">
              <RankDelta delta={delta(a, i + 1)} />
              <span className="font-display font-bold text-olive-dark">{points(a)}</span>
              <ShareArrow slug={a.share_slug} />
            </div>
            <div className="col-span-2 truncate text-[11.5px] text-ink-soft">
              {a.top_quote
                ? <>“{a.top_quote}”</>
                : <>{a.signs_installed} câu được treo · {a.votes_received} lượt thương</>}
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <p className="m-0 border-t border-cream-dark px-4 py-5 text-center text-sm text-ink-soft sm:px-[17px]">
            {range === "week"
              ? "Tuần này chưa có điểm mới — bạn viết câu nhắc mở hàng tuần nhé!"
              : "Chưa có ai lên bảng — viết câu nhắc đầu tiên cho xóm bạn nhé!"}
          </p>
        )}

        {/* Hàng của người xem — chỉ hiện khi đã định danh */}
        {identified && (
          <div className="border-t border-cream-dark bg-cream-panel px-4 py-3 sm:px-[17px] text-[12.5px]">
            {viewerRank ? (
              <>
                <b>Bạn đang ở hạng #{viewerRank.rank}</b>{" "}
                <span className="text-ink-soft">
                  · {viewerRank.score}đ
                  {viewerRank.rank === 1
                    ? " — bạn đang dẫn đầu bảng 🧡"
                    : viewerRank.above_name && viewerRank.above_score != null
                      ? ` — còn ${viewerRank.above_score - viewerRank.score + 1} lượt thương nữa là vượt ${viewerRank.above_name}`
                      : ""}
                </span>
              </>
            ) : (
              <span className="text-ink-soft">
                Bạn chưa có điểm — viết một câu nhắc để lên bảng nhé!
              </span>
            )}
          </div>
        )}

        {neighborhoodOfMonth && (
          <div className="border-t border-cream-dark px-4 py-3.5 sm:px-[17px] text-[13px] text-ink-soft">
            Khu phố dễ thương nhất tháng này: <b className="text-ink">{neighborhoodOfMonth.name}</b> —{" "}
            {neighborhoodOfMonth.new_signs} biển mới, {neighborhoodOfMonth.votes} lượt thương.
          </div>
        )}
      </div>

      {/* Biển chứng nhận 4N — có ảnh: slideshow bấm để chuyển khu; chưa có: biển placeholder */}
      <div className="rounded-[18px] border border-[#CFE2D5] bg-[#E9F1EB] p-4 text-center sm:p-5">
        <div className="text-[12.5px] text-ink-soft">Chứng nhận “Khu phố biết thương” chuẩn 4N</div>
        {cert ? (
          <>
            <button
              onClick={() => setCertIdx((i) => (i + 1) % certNbs.length)}
              title={certNbs.length > 1 ? "Bấm để xem khu phố tiếp theo" : cert.name}
              className="tap mt-2.5 block w-full cursor-pointer overflow-hidden rounded-xl border-[1.5px] border-olive bg-white shadow-kp-s transition hover:-translate-y-0.5 hover:shadow-kp"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cert.certificate_url!}
                alt={`Chứng nhận 4N — ${cert.name}`}
                className="h-44 w-full object-cover"
              />
            </button>
            <div className="mt-2.5 font-display text-[15px] font-semibold">{cert.name}</div>
            {certNbs.length > 1 && (
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {certNbs.map((n, i) => (
                  <span
                    key={n.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === certIdx % certNbs.length ? "w-4 bg-olive" : "w-1.5 bg-[#CFE2D5]"
                    }`}
                  />
                ))}
              </div>
            )}
            {certNbs.length > 1 && (
              <p className="m-0 mt-1.5 text-[11.5px] text-ink-soft">Bấm vào ảnh để xem khu phố tiếp theo</p>
            )}
            <a
              href={`${BASE}/khu-pho/${cert.slug}`}
              className="kp-btn kp-btn-primary tap mt-3 px-5 py-1.5 text-sm"
            >
              Chia sẻ ngay 💛
            </a>
          </>
        ) : (
          <>
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
              Khi 100% lời nhắc đã hiện diện khắp các ngõ ngách, khu phố sẽ được gắn chứng nhận “Khu phố biết thương” chuẩn 4N.
            </p>
            {certified && (
              <a
                href={`${BASE}/khu-pho/${certified.slug}`}
                className="kp-btn kp-btn-primary tap mt-3 px-5 py-1.5 text-sm"
              >
                Chia sẻ ngay 💛
              </a>
            )}
          </>
        )}
      </div>

      {/* Tra cứu chứng nhận */}
      <div className="kp-card flex flex-col gap-2.5 p-4">
        <label className="text-[13px] font-semibold">
          Tra cứu: Xóm mình đã đạt chuẩn 4N chưa?
        </label>
        {/* #11: search + thanh trượt + tự nhập tên phường */}
        <NeighborhoodPicker
          neighborhoods={neighborhoods}
          valueId={lookupId}
          valueText={lookupText}
          onChange={(id, text) => { setLookupId(id); setLookupText(text); }}
          placeholder="Gõ tên phường/khu phố để tra cứu…"
          allowFreeText={false}
        />
        {lookupMiss && (
          <div className="rounded-[10px] bg-cream px-3.5 py-2.5 text-[13px] text-ink-soft">
            Chưa tìm thấy “{lookupText.trim()}” — khu phố này chưa tham gia. Bạn đề xuất góc phố mới cho xóm mình nhé!
          </div>
        )}
        {lookup && (
          <div
            className={`rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold ${
              lookup.certified_4n
                ? "bg-status-signed-bg text-status-signed"
                : "bg-status-voting-bg text-status-voting"
            }`}
          >
            {lookup.certified_4n
              ? `${lookup.name} đã chính thức trở thành “Khu phố biết thương” chuẩn 4N${
                  lookup.certified_at
                    ? ` từ ngày ${new Date(lookup.certified_at).toLocaleDateString("vi-VN")}`
                    : ""
                }.`
              : `${lookup.name} còn thiếu biển để đạt chuẩn 4N. Hãy cùng góp thêm câu nhắc cho xóm mình!`}
          </div>
        )}
      </div>
    </div>
  );
}
