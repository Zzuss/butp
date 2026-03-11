import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type Destination = "domestic" | "abroad" | "employment";

const VALID_DESTINATIONS: Destination[] = ["domestic", "abroad", "employment"];
const ABILITY_COLS = Array.from({ length: 18 }, (_, i) => `C${i + 1}`);

interface CentroidRow {
  destination: Destination;
  destination_subclass: string;
  sample_size: number;
  stats_version: string;
  computation_time: string;
  [key: string]: string | number;
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    if (!session?.isLoggedIn || !session?.userHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination") as Destination | null;

    if (!destination || !VALID_DESTINATIONS.includes(destination)) {
      return NextResponse.json(
        { error: "Invalid destination. Use domestic|abroad|employment" },
        { status: 400 }
      );
    }

    // Supabase 未加双引号建表时会自动转小写，这里用小写表名读取。
    const { data: rows, error } = await supabase
      .from("career_subclass_C18_centroids")
      .select(
        "destination,destination_subclass,sample_size,stats_version,computation_time,C1,C2,C3,C4,C5,C6,C7,C8,C9,C10,C11,C12,C13,C14,C15,C16,C17,C18"
      )
      .eq("destination", destination)
      .order("sample_size", { ascending: false })
      .order("destination_subclass", { ascending: true });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    const typedRows = (rows ?? []) as CentroidRow[];
    const subclasses = typedRows.map((row) => {
      const abilities: Record<string, number> = {};
      ABILITY_COLS.forEach((col) => {
        abilities[col] = Number(row[col] ?? 0);
      });

      return {
        subclass: row.destination_subclass,
        sampleSize: Number(row.sample_size ?? 0),
        abilities,
      };
    });

    const first = typedRows[0];
    return NextResponse.json({
      destination,
      statsVersion: first?.stats_version ?? null,
      computationTime: first?.computation_time ?? null,
      abilities: ABILITY_COLS,
      subclasses,
    });
  } catch (error) {
    console.error("Failed to load C18 centroids:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

