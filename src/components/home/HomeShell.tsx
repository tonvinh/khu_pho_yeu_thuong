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
import { categoryLabel } from "@/lib/taxonomy";
import Counters from "./Counters";
import NeighborhoodSlider from "./NeighborhoodSlider";
import HeroLookup from "./HeroLookup";
import IssueBoard from "./IssueBoard";
import SignGallery from "./SignGallery";
import LeadSection from "./LeadSection";
import IdentifyModal from "./IdentifyModal";
import ProposeModal from "./ProposeModal";
import SuggestModal from "./SuggestModal";
import LeadPromptModal from "./LeadPromptModal";
import NeighborhoodModal from "./NeighborhoodModal";
import AmbassadorModal from "./AmbassadorModal";
import BackToTop from "./BackToTop";
import UserMenu from "./UserMenu";

/** .fig in ĐẬM số tổng đài trong dòng hỗ trợ chân trang. Text do admin sửa được nên
 *  không khớp mẫu thì trả nguyên văn. */
function boldHotline(line: string) {
  const parts = line.split(/(\d{4}[.\s]\d{4})/);
  if (parts.length === 1) return line;
  return parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p));
}

export default function HomeShell({ initial }: { initial: HomeData }) {
  const [data, setData] = useState<HomeData>(initial);
  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [suggestIssueId, setSuggestIssueId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [leadPromptOpen, setLeadPromptOpen] = useState(false);
  // Hồ sơ khu phố mở dạng POPUP (18/8) thay vì rời trang sang /khu-pho/[slug]
  const [nbSlug, setNbSlug] = useState<string | null>(null);
  // Popup "Cây bút khu phố" mở từ nút Bình chọn ở tab 3 (Figma 2/9 · B10)
  const [ambassadorSlug, setAmbassadorSlug] = useState<string | null>(null);

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
      const [counters, issuesRes, notesRes, mapRes, boardRes] = await Promise.all([
        apiGet<HomeData["counters"]>("/api/v1/counters"),
        apiGet<{ issues: HomeData["issues"] }>("/api/v1/issues"),
        // Tab 2 là danh sách CÂU NHẮC chờ bình chọn (Figma live 4/9) — cùng nguồn
        // với SSR `getVotingNotes()`; quên một bên là dòng nhảy chữ sau 20s.
        apiGet<{ notes: HomeData["notes"] }>("/api/v1/notes"),
        apiGet<HomeData["map"]>("/api/v1/map"),
        // Tab "Cây bút" đổi theo lượt thương nên polling luôn cho tươi (A2)
        apiGet<{ ambassadors: HomeData["ambassadors"] }>("/api/v1/leaderboard"),
      ]);
      // content + biển đã duyệt chỉ SSR lúc đầu — polling giữ nguyên bản đang có
      setData((prev) => ({
        counters,
        issues: issuesRes.issues,
        notes: notesRes.notes,
        map: mapRes,
        ambassadors: boardRes.ambassadors,
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

  // Deep-link `/?khu-pho=<slug>`: link chia sẻ khu phố mở thẳng popup trên trang chủ.
  // Dọn luôn query khỏi URL (replaceState) để F5 không mở lại popup ngoài ý muốn.
  useEffect(() => {
    const url = new URL(window.location.href);
    const slug = url.searchParams.get("khu-pho");
    if (!slug) return;
    setNbSlug(slug);
    url.searchParams.delete("khu-pho");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
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

  /**
   * Bình chọn một câu nhắc ngay tại dòng của tab 2 (Figma live 4/9 — trước đây phải
   * mở popup VoteModal). Optimistic UI, lỗi thì trả lại số cũ; đã bình chọn là CHỐT
   * (Q6) nên nút khoá luôn sau khi bấm.
   */
  const voteNote = useCallback(
    (id: string) =>
      requireIdentity(async () => {
        const before = data.notes.find((n) => n.id === id);
        if (!before || before.voted || before.is_mine) return;
        setData((prev) => ({
          ...prev,
          notes: prev.notes.map((n) => (n.id === id ? { ...n, voted: true, votes: n.votes + 1 } : n)),
        }));
        try {
          await apiSend("POST", `/api/v1/suggestions/${id}/vote`);
          maybeShowLeadPrompt();
          refresh();
        } catch (e) {
          setData((prev) => ({
            ...prev,
            notes: prev.notes.map((n) =>
              n.id === id ? { ...n, voted: before.voted, votes: before.votes } : n
            ),
          }));
          if (e instanceof Error) showToast(e.message);
        }
      }),
    [data.notes, maybeShowLeadPrompt, refresh, requireIdentity, showToast]
  );

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // Nút đề xuất mở THẲNG form đề xuất; định danh chỉ hỏi ở bước bấm Gửi —
  // trước đây gọi requireIdentity trước nên hiện modal "Để FPT gửi ưu đãi…",
  // team review đọc thành "click vào đang ra ô offer ưu đãi" (email 18/8).
  const openPropose = () => setProposeOpen(true);

  // Góc phố đang mở form viết câu — dùng để truyền sẵn tên/phường cho SuggestModal (C4)
  const suggestIssue = data.issues.find((it) => it.id === suggestIssueId) ?? null;

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
           lên (y=17 so với thanh y=39).
           Figma bản 2/9 (B1): chữ trái bắt đầu x=159 trên khối từ x=82 → lề trái
           77px (bản 18/8 là 107px vì nhãn cũ ngắn hơn); lề phải vẫn 14px. ===== */}
      <div className="relative px-4 pt-4 sm:px-6 sm:pt-[39px]">
        <div className="relative mx-auto flex h-[60px] max-w-[1276px] items-center px-3 sm:pl-[77px] sm:pr-[14px]">
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

          {/* QC 2/9 · A3: bố cục này lấy số đo Figma khổ 1440 nhưng trước đây bật ngay từ
              sm=640 → từ 640 đến ~1170px hai cụm chữ chồng lên pill logo 192px ở giữa.
              Đo thực: hai link nav an toàn từ 1200 (xl), nhãn CTA đầy đủ từ 1000 (lg). */}
          {/* Figma bản 2/9 · B1 + quyết định Q1: CTA bên phải đổi sang "Ưu đãi dành cho
              cư dân" nên nó KHÔNG còn mở form đề xuất nữa — cửa vào luồng đề xuất
              chuyển hẳn sang LINK 2 dưới đây. */}
          <div className="relative hidden min-w-0 items-center gap-14 xl:flex">
            <button
              onClick={() => scrollTo("goc-xom")}
              className="cursor-pointer whitespace-nowrap text-[16px] text-white"
            >
              Đóng góp lời nhắc
            </button>
            <button
              onClick={openPropose}
              className="cursor-pointer whitespace-nowrap text-[16px] text-white"
            >
              Đề xuất khu phố cần treo biển
            </button>
          </div>

          {/* Logo lockup Frame 166: pill trắng 192×96 (r hết cỡ) + pill trong viền #FF7B00
              1.4px + hình logo 132.9×71.2 (docs/lp/logo.svg → public/brand). */}
          <div className="pointer-events-none absolute -top-[22px] left-1/2 z-10 flex -translate-x-1/2 justify-center">
            <span className="pointer-events-auto grid h-[62px] w-[136px] place-items-center rounded-full bg-white sm:h-[96px] sm:w-[192px]">
              <span className="grid h-[55px] w-[129px] place-items-center rounded-full border-[1.4px] border-[#FF7B00] bg-white sm:h-[87px] sm:w-[183px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo-khu-pho.svg"
                  alt="Khu phố biết thương"
                  width={133}
                  height={71}
                  className="h-auto w-[94px] sm:w-[133px]"
                />
              </span>
            </span>
          </div>

          <div className="relative ml-auto flex items-center gap-4">
            <button
              onClick={() => scrollTo("uu-dai")}
              aria-label="Ưu đãi dành cho cư dân"
              /* Mobile (quy chuẩn 2/9): nhãn rút gọn — khổ 375px không đủ chỗ cho pill
                 logo + nhãn đầy đủ nên nút bị logo đè lên. Desktop giữ nguyên .fig
                 (Frame 171 w=273, lề phải 95.4 ⇒ padding-right 14 của thanh). */
              className="tap tap-sm-auto h-[44px] cursor-pointer whitespace-nowrap rounded-full border-[1.5px] border-white px-3.5 text-[13px] text-white transition hover:bg-white hover:text-brick sm:h-[35px] sm:px-[22px] sm:text-[15px]"
            >
              <span className="lg:hidden">Ưu đãi</span>
              <span className="hidden lg:inline">Ưu đãi dành cho cư dân</span>
            </button>
            {meLoaded && me && (
              <UserMenu
                me={me}
                onLoggedOut={() => {
                  setMe(null);
                  setNotifs([]);
                  showToast("Bạn đã đăng xuất khỏi thiết bị này.");
                  refresh();
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Banner báo tin in-web (thay SMS — Q1): biển đã treo + duyệt/từ chối */}
      {/* `relative` BẮT BUỘC (QC 2/9 · A1): nền hero ở trên là `absolute` nên trong cùng
          stacking context nó vẽ đè lên mọi con `static`, bất kể thứ tự DOM — banner bị
          phủ kín, không đọc và không bấm được. Thanh nav phía trên có `relative` nên
          thoát bẫy này. */}
      {notifs.length > 0 && (
        <div className="relative bg-[var(--kp-hero-from)] px-4 pt-4 sm:px-6">
          <div className="mx-auto max-w-[1312px]">
            {notifs.map((n) => {
              const rejected = n.type === "issue_rejected" || n.type === "suggestion_rejected";
              const detail = n.payload.content
                ? `“${n.payload.content}”`
                : n.payload.location_text || null;
              return (
                <div key={n.id} className="mb-3 rounded-2xl bg-white p-4 shadow-kp-s">
                  <p className="m-0 font-bold">
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

        <NeighborhoodSlider map={data.map} onOpen={(slug) => setNbSlug(slug)} />

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

        </header>

        {/* Ô tra cứu để NGOÀI <header>: header phải overflow-hidden cho skyline/cung nét
            đứt/KV tràn viền, mà ô tra cứu nằm sát đáy header nên danh sách gợi ý xổ xuống
            bị cắt mất — gõ vào tưởng như search hỏng. */}
        <div className="relative z-10 bg-cream">
          <HeroLookup
            neighborhoods={data.map.neighborhoods}
            placeholder={data.content.hero_search_placeholder}
            onPropose={openPropose}
            onOpenNeighborhood={(slug) => setNbSlug(slug)}
          />
        </div>
      </div>

      {/* ===== 3 CON SỐ ===== */}
      <Counters counters={data.counters} />

      {/* ===== ĐÓNG GÓP MỘT CÂU (danh sách góc phố + bảng cây bút) ===== */}
      <IssueBoard
        title={data.content.board_title}
        hint={data.content.board_hint}
        issues={data.issues}
        notes={data.notes}
        ambassadors={data.ambassadors}
        onWrite={(id) => setSuggestIssueId(id)}
        onVoteNote={voteNote}
        onPropose={openPropose}
        onOpenAmbassador={(slug) => setAmbassadorSlug(slug)}
      />

      {/* ===== BIỂN MỚI CỦA KHU PHỐ ===== */}
      <SignGallery signs={data.approvedSigns} content={data.content} />

      {/* ===== ƯU ĐÃI CƯ DÂN ===== */}
      {/* Rectangle 47 trong .fig chạy hết bề ngang trang (x=0 w=1440) nên section này
          KHÔNG có lề ngang ở desktop; cách khối biển 80px. */}
      <section id="uu-dai" className="px-4 py-8 sm:px-0 sm:pb-12 sm:pt-[32px]">
        <LeadSection me={me} content={data.content} requireIdentity={requireIdentity} showToast={showToast} />
      </section>

      {/* ===== FOOTER — chỉ còn KHỐI CHỮ (QC Figma mới 2/9 · mục A) =====
           Bản .fig upload 2/9 để `Frame 202` (ảnh KV 1244×570 + logo 286.5×153.2)
           ở `visible=false`: web render tiếp là dư ~887px so với frame chuẩn 3780.
           Gỡ luôn ảnh KV cũng dứt điểm C1 — ảnh đó không khai width/height nên đẩy
           cả trang xuống ~673px khi tải xong (CLS). Logo GIỮ ở top bar.
           .fig: form ưu đãi → footer gap 64px, khối chữ w=697 canh giữa, 16px, #000,
           đáy trang chừa 71px. */}
      <footer className="overflow-hidden pt-8 sm:pt-[64px]">
        <div className="mx-auto max-w-[697px] px-5 pb-10 text-center text-[14px] leading-relaxed text-black sm:pb-[71px] sm:text-[16px]">
          <div>{data.content.footer_line1}</div>
          <div>{data.content.footer_line2}</div>
          <div>{boldHotline(data.content.footer_support)}</div>
          <div className="mt-1">
            <a href={`${BASE}/chinh-sach-du-lieu`} className="underline hover:text-brick-dark">
              Chính sách dữ liệu
            </a>
            {" · "}
            {data.content.footer_tagline}
          </div>
        </div>
      </footer>

      {ambassadorSlug && (
        <AmbassadorModal
          slug={ambassadorSlug}
          onClose={() => setAmbassadorSlug(null)}
          showToast={showToast}
          onChanged={refresh}
        />
      )}

      {/* Nút nổi "Lên đầu trang" (Figma 2/9 · B7) — chỉ hiện khi đã cuộn quá 1 màn hình */}
      <BackToTop />

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
          /* QC 2/9 · C4 — tên chủ đề + phường đã có sẵn trong `data.issues` nên
             truyền thẳng xuống, khỏi loé "Đang tải…" trong lúc chờ fetch. Góc phố
             mở từ deep-link không nằm trong danh sách → rơi về "Đang tải…". */
          initialTitle={suggestIssue ? categoryLabel(suggestIssue.category) : undefined}
          initialWard={suggestIssue?.neighborhood_name}
        />
      )}
      {nbSlug && (
        <NeighborhoodModal
          slug={nbSlug}
          content={data.content}
          onClose={() => setNbSlug(null)}
          onWrite={() => { setNbSlug(null); scrollTo("goc-xom"); }}
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
