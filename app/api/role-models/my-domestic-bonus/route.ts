import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    // 刷新页面后，CAS 认证信息可能已在 session 中，但 isLoggedIn 尚未恢复；这里做一次兜底恢复。
    if (!session.isLoggedIn && session.isCasAuthenticated && session.userId && session.userHash) {
      session.isLoggedIn = true;
      session.lastActiveTime = Date.now();
      await session.save();
    }

    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(session.userId).trim();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [competitionRes, paperCountRes, patentCountRes] = await Promise.all([
      supabase
        .from("student_competition_records")
        .select("score")
        .eq("bupt_student_id", userId),
      supabase
        .from("student_papers")
        .select("id", { count: "exact", head: true })
        .eq("bupt_student_id", userId),
      supabase
        .from("student_patents")
        .select("id", { count: "exact", head: true })
        .eq("bupt_student_id", userId),
    ]);

    if (competitionRes.error) {
      throw new Error(`Failed to query student_competition_records: ${competitionRes.error.message}`);
    }
    if (paperCountRes.error) {
      throw new Error(`Failed to query student_papers: ${paperCountRes.error.message}`);
    }
    if (patentCountRes.error) {
      throw new Error(`Failed to query student_patents: ${patentCountRes.error.message}`);
    }

    const competitionRows = competitionRes.data ?? [];
    const competition = competitionRows.reduce((sum, row) => sum + toNumber(row.score), 0);
    const paper = Number(paperCountRes.count ?? 0);
    const patent = Number(patentCountRes.count ?? 0);
    const total = competition + paper + patent;

    return NextResponse.json({
      competition: Number(competition.toFixed(1)),
      paper,
      patent,
      total: Number(total.toFixed(1)),
    });
  } catch (error) {
    console.error("Failed to load my domestic bonus summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

