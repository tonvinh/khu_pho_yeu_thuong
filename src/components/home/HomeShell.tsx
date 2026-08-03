"use client";
// Orchestrator trang chủ: state chung, polling 20s, modal định danh/đề xuất/drawer, toast.
// Bố cục theo design "docs/KhuPhoCuaToi-prototype-v4.html": top bar sticky mờ,
// hero trái chữ + phải bản đồ, mục ví dụ minh hoạ, mục "Cùng đóng góp một câu…" 2 cột,
// khối ưu đãi gradient, footer gọn giữa trang.
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeData, IssueCard, Me, NotificationItem } from "./types";
import { apiGet, apiSend, BASE } from "../client-api";
import { COPY } from "@/lib/copy";
import { EXAMPLE_SIGNS } from "@/lib/examples";
import Counters from "./Counters";
import NeighborhoodSlider from "./NeighborhoodSlider";
import CampaignMedia from "./CampaignMedia";
import IssueList from "./IssueList";
import Leaderboard from "./Leaderboard";
import LeadSection from "./LeadSection";
import IdentifyModal from "./IdentifyModal";
import ProposeModal from "./ProposeModal";
import LeadPromptModal from "./LeadPromptModal";
import IssueDrawer from "./IssueDrawer";
import { Eyebrow, HangSign, SectionHead } from "./ui";

export default function HomeShell({ initial }: { initial: HomeData }) {
  const [data, setData] = useState<HomeData>(initial);
  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [drawerIssueId, setDrawerIssueId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [leadPromptOpen, setLeadPromptOpen] = useState(false);

  // #8: popup "Tôi muốn nhận ưu đãi" sau các luồng tương tác — tối đa 1 lần/thiết bị
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
      const [counters, issuesRes, mapRes, lb] = await Promise.all([
        apiGet<HomeData["counters"]>("/api/v1/counters"),
        apiGet<{ issues: HomeData["issues"] }>("/api/v1/issues"),
        apiGet<HomeData["map"]>("/api/v1/map"),
        apiGet<{ ambassadors: HomeData["ambassadors"]; neighborhood_of_month: HomeData["neighborhoodOfMonth"] }>(
          "/api/v1/leaderboard"
        ),
      ]);
      // content (nội dung admin sửa) chỉ SSR lúc đầu — polling giữ nguyên bản đang có
      setData((prev) => ({
        counters,
        issues: issuesRes.issues,
        map: mapRes,
        ambassadors: lb.ambassadors,
        neighborhoodOfMonth: lb.neighborhood_of_month,
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

  /** Thương nhanh từ card (không mở drawer): toggle ngay trên UI, lỗi thì revert */
  const toggleIssueVote = useCallback(
    (it: IssueCard) =>
      requireIdentity(async () => {
        setData((prev) => ({
          ...prev,
          issues: prev.issues.map((x) => (x.id === it.id ? { ...x, voted: !it.voted } : x)),
        }));
        try {
          const res = await apiSend<{ voted: boolean }>("POST", `/api/v1/issues/${it.id}/vote`);
          refresh();
          if (res.voted) maybeShowLeadPrompt();
        } catch (e) {
          setData((prev) => ({
            ...prev,
            issues: prev.issues.map((x) => (x.id === it.id ? { ...x, voted: it.voted } : x)),
          }));
          if (e instanceof Error && e.message !== "api") showToast(e.message);
        }
      }),
    [requireIdentity, refresh, maybeShowLeadPrompt, showToast]
  );

  const dismissNotif = useCallback(async (id: string) => {
    setNotifs((ns) => ns.filter((n) => n.id !== id));
    try {
      await apiSend("PATCH", `/api/v1/me/notifications/${id}`);
    } catch { /* bỏ qua */ }
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // Câu đang được thương nhất trong các góc xóm đang mở — ví dụ "sống" đầu dãy biển mẫu
  const featured = data.issues
    .filter((it) => it.top_quote && it.status !== "signed")
    .sort((a, b) => b.top_votes - a.top_votes)[0];

  return (
    <div>
      {/* ===== TOP BAR (prototype .top: sticky, nền mờ) ===== */}
      <div className="sticky top-0 z-30 border-b border-cream-dark bg-cream/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3.5 px-5">
          <div className="flex items-center gap-2.5 font-display text-[19px] font-extrabold">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-brick text-[15px] text-white shadow-kp-s">
              ♥
            </span>
            Khu Phố Của Tôi
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={() => scrollTo("goc-xom")}
              className="hidden cursor-pointer text-sm font-semibold text-ink-soft hover:text-brick-dark sm:inline"
            >
              Góc phố đang chờ
            </button>
            <button
              onClick={() => scrollTo("uu-dai")}
              className="hidden cursor-pointer text-sm font-semibold text-ink-soft hover:text-brick-dark sm:inline"
            >
              Quà dành cho cư dân
            </button>
            {meLoaded && me ? (
              <span className="rounded-full border border-cream-dark bg-white px-3 py-1.5 text-[12.5px] text-ink-soft">
                Chào {me.display_name} 👋
              </span>
            ) : (
              <span className="hidden rounded-full border border-cream-dark bg-white px-3 py-1.5 text-[12.5px] text-ink-soft md:inline">
                FPT đồng hành cùng khu phố
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Banner báo tin in-web (thay SMS — Q1): biển đã treo + duyệt/từ chối (#15) */}
      {notifs.length > 0 && (
        <div className="mx-auto max-w-[1120px] px-5 pt-4">
          {notifs.map((n) => {
            const rejected = n.type === "issue_rejected" || n.type === "suggestion_rejected";
            const detail = n.payload.content
              ? `“${n.payload.content}”`
              : n.payload.location_text || null;
            return (
              <div
                key={n.id}
                className={`kp-card slide-up mb-3 p-4 ${
                  rejected ? "border-[#EAD3CB] bg-[#FBEFE9]" : "border-[#CFE2D5] bg-[#E9F1EB]"
                }`}
              >
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
                      onClick={() => { dismissNotif(n.id); requireIdentity(() => setProposeOpen(true)); }}
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
      )}

      {/* ===== HERO: chữ trái + slide ảnh khu phố phải (#1 thay bản đồ) =====
          minmax(0,…) để cột không nở quá viewport trên mobile (#13, #14) */}
      <header className="mx-auto grid max-w-[1120px] items-center gap-8 px-5 pb-7 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col items-start">
          <Eyebrow>● Cùng xây khu phố biết thương</Eyebrow>
          <h1 className="m-0 mt-4 font-display text-[clamp(30px,4.4vw,46px)] font-extrabold leading-[1.15] tracking-[-0.01em]">
            {data.content.hero_title_1} <span className="text-brick">{data.content.hero_title_2}</span>
          </h1>
          <p className="m-0 mt-3 max-w-[30em] text-[16.5px] text-ink-soft">{data.content.hero_body}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => requireIdentity(() => setProposeOpen(true))}
              className="kp-btn kp-btn-primary tap px-5 py-3"
            >
              {COPY.ctaMain}
            </button>
            <button onClick={() => scrollTo("goc-xom")} className="kp-btn kp-btn-outline tap px-5 py-3">
              {COPY.ctaSecondary}
            </button>
            <button onClick={() => scrollTo("uu-dai")} className="kp-btn kp-btn-outline tap px-5 py-3">
              {COPY.ctaTertiary}
            </button>
          </div>
          <Counters counters={data.counters} />
        </div>

        <NeighborhoodSlider
          map={data.map}
          onPropose={() => requireIdentity(() => setProposeOpen(true))}
        />
      </header>

      {/* ===== TVC / KV CHIẾN DỊCH (#19) — nội dung sửa ở /admin/noi-dung ===== */}
      <CampaignMedia content={data.content} />

      {/* ===== VÍ DỤ MINH HOẠ: biển treo mẫu ===== */}
      <section className="mx-auto max-w-[1120px] px-5 py-7">
        <SectionHead title="Lời nhắc khi lên biển trông như thế nào?" />
        <div className="grid grid-cols-1 items-start gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured && (
            <HangSign
              quote={`“${featured.top_quote}”`}
              by="Được “Thương” nhiều nhất tuần này 🧡"
              spot={featured.location_text}
              tilt={1.5}
            />
          )}
          {EXAMPLE_SIGNS.filter((s) => s.quote !== featured?.top_quote)
            .slice(0, featured ? 5 : 6)
            .map((s, i) => (
            <HangSign key={s.quote} quote={`“${s.quote}”`} by={s.by} spot={s.spot} tilt={i % 2 ? 1.5 : -1.5} />
          ))}
        </div>
      </section>

      {/* ===== ĐANG CHỜ BẠN SÁNG TẠO: danh sách + bảng xếp hạng (prototype .two) ===== */}
      <section id="goc-xom" className="mx-auto max-w-[1120px] px-5 py-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHead
            title="Cùng đóng góp một câu cho khu phố của mình!"
            hint="chọn một góc phố, để lại lời nhắn dễ thương và bình chọn cho lời thương ấm áp nhất"
          />
          <button
            onClick={() => requireIdentity(() => setProposeOpen(true))}
            className="kp-btn kp-btn-primary tap px-5 py-3"
          >
            {COPY.ctaMain}
          </button>
        </div>
        <div className="mt-2 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <IssueList
            issues={data.issues}
            onOpenIssue={(id) => setDrawerIssueId(id)}
            onPropose={() => requireIdentity(() => setProposeOpen(true))}
            onToggleVote={toggleIssueVote}
          />
          <Leaderboard
            ambassadors={data.ambassadors}
            neighborhoodOfMonth={data.neighborhoodOfMonth}
            neighborhoods={data.map.neighborhoods}
          />
        </div>
      </section>

      {/* ===== ƯU ĐÃI CƯ DÂN ===== */}
      <section id="uu-dai" className="mx-auto max-w-[1120px] px-5 py-7">
        <LeadSection me={me} content={data.content} requireIdentity={requireIdentity} showToast={showToast} />
      </section>

      {/* ===== FOOTER (prototype: gọn, giữa trang) ===== */}
      <footer className="mt-3 border-t border-cream-dark">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-7 text-center text-[12.5px] text-ink-soft">
          <div className="font-display text-base font-extrabold text-ink">Khu Phố Của Tôi</div>
          <div className="mt-1">Một hoạt động thuộc chiến dịch “Khu phố biết thương” của FPT Telecom</div>
          <div>Nhắc · Nhở · Nhỏ · Nhẹ</div>
          <div className="mt-1">{COPY.footerSupport}</div>
          <div className="mt-1">
            <a href={`${BASE}/chinh-sach-du-lieu`} className="underline hover:text-brick-dark">
              Chính sách dữ liệu
            </a>
            {" · "}
            {COPY.ctaCampaign}
          </div>
        </div>
      </footer>

      {/* Modals & Drawer */}
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
          onClose={() => setProposeOpen(false)}
          onDone={() => {
            setProposeOpen(false);
            showToast("Đề xuất của bạn đã vào danh sách chờ duyệt — cảm ơn bạn 💛");
            refresh();
            maybeShowLeadPrompt();
          }}
        />
      )}
      {drawerIssueId && (
        <IssueDrawer
          issueId={drawerIssueId}
          me={me}
          requireIdentity={requireIdentity}
          onClose={() => setDrawerIssueId(null)}
          showToast={showToast}
          onChanged={refresh}
          onEngaged={maybeShowLeadPrompt}
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

      {/* Toast (prototype .toast: nền ink, đáy giữa) — trên cả modal z-50 */}
      {toast && (
        <div className="fixed inset-x-4 bottom-6 z-[60] mx-auto max-w-md">
          <div className="slide-up rounded-xl bg-ink px-5 py-3 text-center text-sm text-white shadow-kp">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
