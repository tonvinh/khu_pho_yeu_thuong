import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { getCounters } from "@/lib/counters";

export const dynamic = "force-dynamic";

// Dashboard tổng quan (04 §1)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const [counters, ops, leads, daily] = await Promise.all([
    getCounters(),
    one(`SELECT
      (SELECT count(*)::int FROM issues WHERE status='pending_review') AS issues_pending,
      (SELECT count(*)::int FROM suggestions WHERE status='submitted') AS suggestions_pending,
      (SELECT count(*)::int FROM suggestions WHERE status='selected') AS selected_not_produced,
      (SELECT count(*)::int FROM suggestions WHERE status='produced') AS producing`),
    one(`SELECT
      (SELECT count(*)::int FROM leads WHERE opted_in AND source='soft_drawer') AS tier1,
      (SELECT count(*)::int FROM leads WHERE opted_in AND source='active_section') AS tier2,
      (SELECT count(*)::int FROM leads WHERE opted_in AND status='new') AS new,
      (SELECT count(*)::int FROM leads WHERE opted_in AND status='contacted') AS contacted,
      (SELECT count(*)::int FROM leads WHERE opted_in AND status='converted') AS converted`),
    q(`SELECT d::date AS day,
         (SELECT count(*)::int FROM suggestions s WHERE s.created_at::date = d::date) AS suggestions,
         (SELECT count(*)::int FROM votes v WHERE v.created_at::date = d::date) AS votes,
         (SELECT count(*)::int FROM leads l WHERE l.opted_in AND l.created_at::date = d::date) AS leads
       FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') d
       ORDER BY d`),
  ]);

  return NextResponse.json({ counters, ops, leads, daily });
}
