"use client";
// Orchestrator trang chủ: state chung, polling 20s, modal định danh/đề xuất/drawer, toast
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeData, Me, NotificationItem } from "./types";
import { apiGet, apiSend, BASE } from "../client-api";
import { COPY } from "@/lib/copy";
import Counters from "./Counters";
import MapSection from "./MapSection";
import IssueList from "./IssueList";
import Leaderboard from "./Leaderboard";
import LeadSection from "./LeadSection";
import IdentifyModal from "./IdentifyModal";
import ProposeModal from "./ProposeModal";
import IssueDrawer from "./IssueDrawer";

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
      setData({
        counters,
        issues: issuesRes.issues,
        map: mapRes,
        ambassadors: lb.ambassadors,
        neighborhoodOfMonth: lb.neighborhood_of_month,
      });
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

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 lg:max-w-5xl">
      {/* Header */}
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brick text-xl text-white">💛</span>
          <div>
            <div className="text-lg font-extrabold leading-tight text-brick">Khu Phố Của Tôi</div>
            <div className="text-xs text-ink-soft">Cùng xây khu phố biết thương</div>
          </div>
        </div>
        {meLoaded && me && (
          <div className="rounded-full bg-cream-dark px-3 py-1.5 text-sm font-medium">
            Chào {me.display_name} 👋
          </div>
        )}
      </header>

      {/* Banner báo tin vui in-web (thay SMS — Q1) */}
      {notifs.map((n) => (
        <div key={n.id} className="slide-up mb-3 rounded-2xl border-2 border-status-signed bg-white p-4 shadow-sm">
          <p className="font-semibold">{COPY.bannerGoodNews(n.payload.location_text || "xóm mình")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={`${BASE}/bien/${n.ref_id}`}
              className="tap rounded-full bg-brick px-4 py-2 text-sm font-semibold text-white"
            >
              Chia sẻ
            </a>
            <button
              onClick={() => { scrollTo("ban-do"); }}
              className="tap rounded-full border border-brick px-4 py-2 text-sm font-semibold text-brick"
            >
              Xem trên bản đồ
            </button>
            <button onClick={() => dismissNotif(n.id)} className="tap px-3 py-2 text-sm text-ink-soft">
              Đóng
            </button>
          </div>
        </div>
      ))}

      {/* Hero */}
      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold leading-snug sm:text-3xl">
          {COPY.heroTitle1} <span className="text-brick">{COPY.heroTitle2}</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{COPY.heroBody}</p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <button
            onClick={() => scrollTo("goc-xom")}
            className="tap rounded-full bg-brick px-6 py-3 text-center font-bold text-white shadow hover:bg-brick-dark"
          >
            {COPY.ctaMain}
          </button>
          <button
            onClick={() => scrollTo("goc-xom")}
            className="tap rounded-full border-2 border-brick px-6 py-3 text-center font-semibold text-brick"
          >
            {COPY.ctaSecondary}
          </button>
          <button
            onClick={() => scrollTo("uu-dai")}
            className="tap rounded-full border border-cream-dark bg-cream px-6 py-3 text-center font-semibold text-ink"
          >
            {COPY.ctaTertiary}
          </button>
        </div>
      </section>

      <Counters counters={data.counters} />

      <div id="ban-do">
        <MapSection map={data.map} onOpenIssue={(id) => setDrawerIssueId(id)} />
      </div>

      <div id="goc-xom">
        <IssueList
          issues={data.issues}
          onOpenIssue={(id) => setDrawerIssueId(id)}
          onPropose={() => requireIdentity(() => setProposeOpen(true))}
        />
      </div>

      <Leaderboard ambassadors={data.ambassadors} neighborhoodOfMonth={data.neighborhoodOfMonth} />

      <div id="uu-dai">
        <LeadSection me={me} requireIdentity={requireIdentity} showToast={showToast} />
      </div>

      {/* Footer */}
      <footer className="mt-10 border-t border-cream-dark pt-6 text-center text-sm text-ink-soft">
        <p>{COPY.footerSupport}</p>
        <p className="mt-2">
          <a href={`${BASE}/chinh-sach-du-lieu`} className="underline">Chính sách dữ liệu</a>
          {" · "}Chiến dịch “Khu phố biết thương” — FPT Telecom
        </p>
        <p className="mt-2 font-medium text-brick">{COPY.ctaCampaign}</p>
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
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md">
          <div className="slide-up rounded-2xl bg-ink px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
