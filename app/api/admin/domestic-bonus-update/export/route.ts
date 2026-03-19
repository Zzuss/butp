import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type MajorCode = "tewm" | "iot" | "eie" | "ist";

const TABLE_MAP: Record<MajorCode, string> = {
  tewm: "tewm_domestic_bonus",
  iot: "iot_domestic_bonus",
  eie: "eie_domestic_bonus",
  ist: "ist_domestic_bonus",
};

type BonusRow = {
  year: number | string | null;
  subclass: string | null;
  subclass_number: number | string | null;
  average_bonus: number | string | null;
  total_number: number | string | null;
};

export async function GET(request: NextRequest) {
  try {
    // 管理员鉴权：沿用导入接口的 cookie 检查方式
    const adminSessionCookie = request.cookies.get("admin-session");
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const major = String(searchParams.get("major") || "").trim().toLowerCase() as MajorCode;
    if (!TABLE_MAP[major]) {
      return NextResponse.json({ error: "专业参数无效，请选择 tewm/iot/eie/ist" }, { status: 400 });
    }

    const targetTable = TABLE_MAP[major];
    const { data, error } = await supabase
      .from(targetTable)
      .select("year,subclass,subclass_number,average_bonus,total_number")
      .order("year", { ascending: true })
      .order("subclass", { ascending: true });

    if (error) {
      return NextResponse.json({ error: `读取数据失败: ${error.message}` }, { status: 500 });
    }

    const rows = (data ?? []) as BonusRow[];
    const excelData = rows.map((row) => ({
      year: row.year ?? "",
      subclass: row.subclass ?? "",
      subclass_number: row.subclass_number ?? "",
      average_bonus: row.average_bonus ?? "",
      total_number: row.total_number ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData, {
      header: ["year", "subclass", "subclass_number", "average_bonus", "total_number"],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${major}_domestic_bonus`);
    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
    ];

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `${targetTable}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error("导出国内加分数据失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}

