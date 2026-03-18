import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type MajorCode = "tewm" | "iot" | "eie" | "ist";

const TABLE_MAP: Record<MajorCode, string> = {
  tewm: "tewm_domestic_bonus",
  iot: "iot_domestic_bonus",
  eie: "eie_domestic_bonus",
  ist: "ist_domestic_bonus",
};

type BonusRow = {
  year: number | string;
  subclass: string;
  subclass_number: number | string;
  average_bonus: number | string;
  total_number: number | string;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    if (!session?.isLoggedIn || !session?.userHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const major = searchParams.get("major") as MajorCode | null;

    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: "Invalid year. Use 2020-2025 style year." }, { status: 400 });
    }
    if (!major || !TABLE_MAP[major]) {
      return NextResponse.json({ error: "Invalid major. Use tewm|iot|eie|ist." }, { status: 400 });
    }

    const targetTable = TABLE_MAP[major];
    const { data, error } = await supabase
      .from(targetTable)
      .select("year,subclass,subclass_number,average_bonus,total_number")
      .eq("year", Number(year));

    if (error) {
      throw new Error(`Failed to query ${targetTable}: ${error.message}`);
    }

    const rows = (data ?? []) as BonusRow[];
    const bySubclass = {
      competition: 0,
      paper: 0,
      patent: 0,
    };

    let totalNumber = 0;
    let competitionAverageBonus = 0;
    rows.forEach((row) => {
      const subclass = String(row.subclass ?? "").trim();
      const subclassNumber = toNumber(row.subclass_number);
      const averageBonus = toNumber(row.average_bonus);
      const total = toNumber(row.total_number);
      if (total > 0) totalNumber = total;

      if (subclass === "竞赛") {
        bySubclass.competition = subclassNumber;
        competitionAverageBonus = averageBonus;
      }
      if (subclass === "论文") bySubclass.paper = subclassNumber;
      if (subclass === "专利") bySubclass.patent = subclassNumber;
    });

    return NextResponse.json({
      year: Number(year),
      major,
      totalNumber,
      competitionAverageBonus,
      ...bySubclass,
    });
  } catch (error) {
    console.error("Failed to load domestic bonus overview:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

