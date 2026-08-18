"use client";
// Orchestrator trang chủ — bố cục theo SKIN MỚI (docs/lp/lp1.png, lp2.png, 18/8):
//   top bar cam (logo tròn ở giữa) → hero cam (tiêu đề, slider khu phố tiêu biểu,
//   KV khu phố, ô tra cứu 4N) → dải 3 con số → khối "Đóng góp một câu" (3 tab, gồm cả
//   bảng xếp hạng) → "Biển mới của khu phố" → khối ưu đãi → footer.
//
// So với bản cũ: bỏ bản đồ/khối TVC/khối chứng nhận ở cột phải, drawer góc xóm tách
// thành 2 modal (viết câu / bình chọn), 3 CTA hero gom về nút trên top bar.
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeData, Me, NotificationItem } from "./types";
import { apiGet, apiSend, BASE } from "../client-api";
import { COPY } from "@/lib/copy";
import Counters from "./Counters";
import NeighborhoodSlider from "./NeighborhoodSlider";
import HeroLookup from "./HeroLookup";
import IssueBoard from "./IssueBoard";
import SignGallery from "./SignGallery";
import LeadSection from "./LeadSection";
import IdentifyModal from "./IdentifyModal";
import ProposeModal from "./ProposeModal";
import SuggestModal from "./SuggestModal";
import VoteModal from "./VoteModal";
import LeadPromptModal from "./LeadPromptModal";

export default function HomeShell({ initial }: { initial: HomeData }) {
  const [data, setData] = useState<HomeData>(initial);
  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [suggestIssueId, setSuggestIssueId] = useState<string | null>(null);
  const [voteIssueId, setVoteIssueId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [leadPromptOpen, setLeadPromptOpen] = useState(false);

  // Popup "Tôi muốn nhận ưu đãi" sau các luồng tương tác — tối đa 1 lần/thiết bị
  const maybeShowLeadPrompt = useCallback(() => {
    try {
      if (window.localStorage.getItem("kp_lead_prompted")) return;
      window.localStorage.setItem("kp_lead_prompted", "1");
    } catch { /* private mode → vẫn hiện */ }
    window.setTimeout(() => setLeadPromptOpen(true), 600);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [counters, issuesRes, mapRes] = await Promise.all([
        apiGet<HomeData["counters"]>("/api/v1/counters"),
        apiGet<{ issues: HomeData["issues"] }>("/api/v1/issues"),
        apiGet<HomeData["map"]>("/api/v1/map"),
      ]);
      // content + biển đã duyệt chỉ SSR lúc đầu — polling giữ nguyên bản đang có
      setData((prev) => ({
        counters,
        issues: issuesRes.issues,
        map: mapRes,
        approvedSigns: prev.approvedSigns,
        content: prev.content,
      }));
    } catch {
      /* giữ dữ liệu cũ khi lỗi mạng */
    }
  }, []);

  // Polling 20s (07 §1: realtime ≤30s, không cần WebSocket)
  useEffect(() => {
    const t = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(t);
  }, [refresh]);

  // Nhận diện qua cookie + banner báo tin vui in-web (Q1)
  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ me: Me }>("/api/v1/me");
        setMe(res.me);
        const n = await apiGet<{ notifications: NotificationItem[] }>("/api/v1/me/notifications");
        setNotifs(n.notifications);
      } catch {
        setMe(null);
      } finally {
        setMeLoaded(true);
      }
    })();
  }, []);

  /** Chạy hành động cần định danh; chưa có → mở modal, xong tự chạy tiếp */
  const requireIdentity = useCallback(
    (fn: () => void) => {
      if (me) fn();
      else {
        pendingAction.current = fn;
        setIdentifyOpen(true);
      }
    },
    [me]
  );

  const onIdentified = useCallback((newMe: Me) => {
    setMe(newMe);
    setIdentifyOpen(false);
    const fn = pendingAction.current;
    pendingAction.current = null;
    if (fn) window.setTimeout(fn, 50);
  }, []);

  const dismissNotif = useCallback(async (id: string) => {
    setNotifs((ns) => ns.filter((n) => n.id !== id));
    try {
      await apiSend("PATCH", `/api/v1/me/notifications/${id}`);
    } catch { /* bỏ qua */ }
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // Nút đề xuất mở THẲNG form đề xuất; định danh chỉ hỏi ở bước bấm Gửi —
  // trước đây gọi requireIdentity trước nên hiện modal "Để FPT gửi ưu đãi…",
  // team review đọc thành "click vào đang ra ô offer ưu đãi" (email 18/8).
  const openPropose = () => setProposeOpen(true);

  return (
    <div>
      {/* Rectangle 1 — nền hero: gradient dọc #FF7B00 → #FFEFE6, cao ĐÚNG 900px tính từ
          mép trên trang (bao trùm cả top bar), phần dưới là nền kem #FFF7F2 của trang. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[620px] bg-gradient-to-b from-[var(--kp-hero-from)] to-[var(--kp-hero-to)] sm:h-[900px]"
        />
      {/* ===== TOP BAR — Subtract trong .fig là HAI mảnh 543×60 ở y=39 (gộp lại là
           1276×60 từ x=82), nền trắng 10%, viền #FFEBB8 mờ dần về hai đầu, bị khoét
           một cung r=60 quanh pill logo; logo Frame 166 192×96 canh GIỮA thanh và nhô
           lên (y=17 so với thanh y=39). Chữ trái bắt đầu ở x=189 → lề trái 107px,
           lề phải 14px (nhóm nút x=1091.6…1343.6). ===== */}
      <div className="relative px-4 pt-4 sm:px-6 sm:pt-[39px]">
        <div className="relative mx-auto flex h-[60px] max-w-[1276px] items-center px-3 sm:pl-[107px] sm:pr-[14px]">
          {/* nền trắng 10% — mask khoét cung tròn hai bên logo */}
          <span aria-hidden className="kp-nav-cut absolute inset-0 rounded-full bg-white/10" />
          {/* viền #FFEBB8: mask khoét cung + mờ dần về hai đầu bo tròn */}
          <span
            aria-hidden
            className="kp-nav-line absolute inset-0 rounded-full border-[1.5px] border-[var(--kp-nav-border)]"
          />
          {/* nét cung sát logo — mask đã cắt mất viền ở chỗ khoét nên vẽ bù bằng 2 vòng
              tròn r=60 (phần thừa nằm dưới pill logo hoặc bị overflow cắt) */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-full sm:block"
          >
            <span className="absolute -top-[34px] left-[calc(50%-108px)] h-[120px] w-[120px] rounded-full border-[1.5px] border-[var(--kp-nav-border)]" />
            <span className="absolute -top-[34px] left-[calc(50%-12px)] h-[120px] w-[120px] rounded-full border-[1.5px] border-[var(--kp-nav-border)]" />
          </span>

          <div className="relative hidden min-w-0 items-center gap-14 sm:flex">
            <button
              onClick={() => scrollTo("goc-xom")}
              className="cursor-pointer whitespace-nowrap text-[16px] text-white"
            >
              Góc phố đang chờ
            </button>
            <button
              onClick={() => scrollTo("uu-dai")}
              className="cursor-pointer whitespace-nowrap text-[16px] text-white"
            >
              Quà dành cho cư dân
            </button>
          </div>

          {/* Logo lockup Frame 166: pill trắng 192×96 (r hết cỡ) + pill trong viền #FF7B00
              1.4px + hình logo 132.9×71.2 (docs/lp/logo.svg → public/brand). */}
          <div className="pointer-events-none absolute -top-[22px] left-1/2 z-10 flex -translate-x-1/2 justify-center">
            <span className="pointer-events-auto grid h-[76px] w-[168px] place-items-center rounded-full bg-white sm:h-[96px] sm:w-[192px]">
              <span className="grid h-[68px] w-[160px] place-items-center rounded-full border-[1.4px] border-[#FF7B00] bg-white sm:h-[87px] sm:w-[183px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo-khu-pho.svg"
                  alt="Khu phố biết thương"
                  width={133}
                  height={71}
                  className="h-auto w-[116px] sm:w-[133px]"
                />
              </span>
            </span>
          </div>

          <div className="relative ml-auto flex items-center gap-4">
            <button
              onClick={openPropose}
              className="tap tap-sm-auto h-[44px] cursor-pointer whitespace-nowrap rounded-full border-[1.5px] border-white px-4 sm:h-[35px] text-[13px] text-white transition hover:bg-white hover:text-brick sm:px-[22px] sm:text-[15px]"
            >
              + Đề xuất góc phố mới
            </button>
            {meLoaded && me && (
              <span
                title={`Chào ${me.display_name}`}
                className="grid h-[35px] w-[35px] flex-none place-items-center rounded-full border-[1.5px] border-white bg-white/20 font-display text-[14px] font-bold text-white"
              >
                {me.display_name.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Banner báo tin in-web (thay SMS — Q1): biển đã treo + duyệt/từ chối */}
      {notifs.length > 0 && (
        <div className="bg-[var(--kp-hero-from)] px-4 pt-4 sm:px-6">
          <div className="mx-auto max-w-[1312px]">
            {notifs.map((n) => {
              const rejected = n.type === "issue_rejected" || n.type === "suggestion_rejected";
              const detail = n.payload.content
                ? `“${n.payload.content}”`
                : n.payload.location_text || null;
              return (
                <div key={n.id} className="mb-3 rounded-2xl bg-white p-4 shadow-kp-s">
                  <p className="m-0 font-semibold">
                    {n.type === "sign_installed"
                      ? COPY.bannerGoodNews(n.payload.location_text || "xóm mình")
                      : rejected
                        ? COPY.notifRejected
                        : COPY.notifApproved}
                  </p>
                  {n.type !== "sign_installed" && detail && (
                    <p className="m-0 mt-0.5 text-[13px] text-ink-soft">{detail}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.type === "sign_installed" && (
                      <a href={`${BASE}/bien/${n.ref_id}`} className="kp-btn kp-btn-primary tap px-4 py-1.5 text-sm">
                        Chia sẻ
                      </a>
                    )}
                    {rejected && (
                      <button
                        onClick={() => { dismissNotif(n.id); openPropose(); }}
                        className="kp-btn kp-btn-outline tap px-4 py-1.5 text-sm"
                      >
                        Đề xuất lại
                      </button>
                    )}
                    <button onClick={() => dismissNotif(n.id)} className="tap cursor-pointer px-3 py-2 text-sm text-ink-soft">
                      Đóng
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== HERO — toạ độ lấy nguyên từ .fig (khổ 1440):
           nền gradient #FF7B00→#FFEFE6 cao 900 · skyline y=201 · sàn gạch y=704 ·
           cung nét đứt y=689 · khối chữ 929 ở y=149 · slider 840×430 ở y=293 ·
           KV 1034×558 ở y=580 (ĐÈ LÊN đáy slider) ===== */}
      <header className="relative overflow-hidden pb-0 pt-8 sm:pt-[50px]">
        {/* Artboard 2 1 — bóng skyline mờ, y=201 so với đỉnh trang (~102 so với header) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/skyline.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[60px] w-full opacity-30 sm:top-[102px]"
        />

        <div className="relative mx-auto max-w-[929px] px-4 text-center sm:px-0">
          {/* lh trong .fig là 56px (khối chữ 929×56 ở y=149) — để 1.15 thì cả khối
              hero bị đội lên 10px so với design */}
          <h1 className="kp-h2 kp-hero-title m-0 text-[clamp(24px,5.4vw,40px)] uppercase tracking-[-0.03em] text-white text-balance">
            {data.content.hero_title}
          </h1>
          <p className="mx-auto mt-2 font-light text-[14px] leading-[1.5] tracking-[-0.02em] text-white/95 sm:text-[16px]">
            {data.content.hero_body}
          </p>
        </div>

        <NeighborhoodSlider map={data.map} />

        {/* KV khu phố đứng trên sàn gạch; -mt kéo KV đè lên đáy slider đúng như design */}
        <div className="relative -mt-10 sm:-mt-[143px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/plaza.webp"
            alt=""
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[58%] w-full object-cover object-top"
          />
          {/* Frame 151 1 — cung nét đứt cam vắt ngang sau KV */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero-arc.webp"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-x-[-4%] top-[18%] w-[108%]"
          />
          {/* Khối KV + 3 hình rời quanh nó — toạ độ .fig (khổ 1440, KV "Khu phố 2 1"
              x=203 y=580 w=1034): biển "Ngõ Xóm" 06 2 (1135.2, 646, 176.8×308.6),
              ông cháu quét sân 02 2 (1238.2, 708, 160.5×187.5), gánh hàng rong 01 1
              (10, 739, 236×171). Cả ba nằm DƯỚI KV đúng thứ tự lớp trong .fig. */}
          <div className="relative mx-auto w-full max-w-[1440px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/signpost.webp"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[78.833%] top-[11.826%] hidden w-[12.278%] sm:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/sweepers.webp"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[85.986%] top-[22.936%] hidden w-[11.146%] sm:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/cart.webp"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[0.694%] top-[28.491%] hidden w-[16.389%] sm:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/kv-khu-pho.webp"
              alt="Khu phố biết thương"
              fetchPriority="high"
              className="relative mx-auto block w-[94%] max-w-[1034px] sm:w-[71.806%]"
            />
          </div>
          {/* Rectangle 11 — dải kem loang che chân sàn gạch */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-b from-transparent to-cream" />
        </div>

        <div className="relative bg-cream">
          <HeroLookup
            neighborhoods={data.map.neighborhoods}
            placeholder={data.content.hero_search_placeholder}
            onPropose={openPropose}
          />
        </div>
        </header>
      </div>

      {/* ===== 3 CON SỐ ===== */}
      <Counters counters={data.counters} />

      {/* ===== ĐÓNG GÓP MỘT CÂU (danh sách góc phố + bảng cây bút) ===== */}
      <IssueBoard
        title={data.content.board_title}
        hint={data.content.board_hint}
        issues={data.issues}
        onWrite={(id) => setSuggestIssueId(id)}
        onVote={(id) => setVoteIssueId(id)}
        onPropose={openPropose}
      />

      {/* ===== BIỂN MỚI CỦA KHU PHỐ ===== */}
      <SignGallery signs={data.approvedSigns} content={data.content} />

      {/* ===== ƯU ĐÃI CƯ DÂN ===== */}
      {/* Rectangle 47 trong .fig chạy hết bề ngang trang (x=0 w=1440) nên section này
          KHÔNG có lề ngang ở desktop; cách khối biển 80px. */}
      <section id="uu-dai" className="px-4 py-8 sm:px-0 sm:pb-12 sm:pt-[32px]">
        <LeadSection me={me} content={data.content} requireIdentity={requireIdentity} showToast={showToast} />
      </section>

      {/* ===== FOOTER: KV + logo + các dòng chân trang ===== */}
      <footer className="overflow-hidden pt-6">
        {/* KV 1244 rộng, logo 286.5×153.2 đè lên đáy KV (thò xuống 39.2px) — quy ra %
            theo bề ngang khối để co giãn đúng tỷ lệ như trong .fig. */}
        <div className="mx-auto w-[88%] max-w-[1244px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/kv-khu-pho-sm.webp"
            alt=""
            aria-hidden
            loading="lazy"
            className="block w-full"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-khu-pho.svg"
            alt="Khu phố biết thương"
            width={287}
            height={153}
            loading="lazy"
            className="mx-auto block h-auto w-[23%] min-w-[120px]"
            style={{ marginTop: "-9.16%" }}
          />
        </div>
        <div className="mx-auto max-w-[697px] px-5 pb-10 pt-6 text-center text-[14px] leading-relaxed text-ink sm:text-[16px]">
          <div>{data.content.footer_line1}</div>
          <div>{data.content.footer_line2}</div>
          <div>{data.content.footer_support}</div>
          <div className="mt-1">
            <a href={`${BASE}/chinh-sach-du-lieu`} className="underline hover:text-brick-dark">
              Chính sách dữ liệu
            </a>
            {" · "}
            {data.content.footer_tagline}
          </div>
        </div>
      </footer>

      {/* ===== Modals ===== */}
      {identifyOpen && (
        <IdentifyModal
          neighborhoods={data.map.neighborhoods}
          onClose={() => { setIdentifyOpen(false); pendingAction.current = null; }}
          onDone={onIdentified}
        />
      )}
      {proposeOpen && (
        <ProposeModal
          neighborhoods={data.map.neighborhoods}
          defaultNeighborhoodId={me?.neighborhood_id ?? null}
          requireIdentity={requireIdentity}
          onClose={() => setProposeOpen(false)}
          onDone={() => {
            setProposeOpen(false);
            showToast("Đề xuất của bạn đã vào danh sách chờ duyệt — cảm ơn bạn 💛");
            refresh();
            maybeShowLeadPrompt();
          }}
        />
      )}
      {suggestIssueId && (
        <SuggestModal
          issueId={suggestIssueId}
          me={me}
          requireIdentity={requireIdentity}
          onClose={() => setSuggestIssueId(null)}
          showToast={showToast}
          onChanged={refresh}
          onEngaged={maybeShowLeadPrompt}
        />
      )}
      {voteIssueId && (
        <VoteModal
          issueId={voteIssueId}
          requireIdentity={requireIdentity}
          onClose={() => setVoteIssueId(null)}
          showToast={showToast}
          onChanged={refresh}
          onEngaged={maybeShowLeadPrompt}
          onWrite={(id) => setSuggestIssueId(id)}
        />
      )}
      {leadPromptOpen && (
        <LeadPromptModal
          me={me}
          content={data.content}
          onClose={() => setLeadPromptOpen(false)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-center text-sm text-white shadow-kp">
          {toast}
        </div>
      )}
    </div>
  );
}
