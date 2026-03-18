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

const REQUIRED_COLUMNS = ["year", "subclass", "subclass_number", "average_bonus", "total_number"] as const;

type RawRow = Record<string, unknown>;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export async function POST(request: NextRequest) {
  try {
    // 管理员鉴权：沿用现有 admin API 的 cookie 检查方式
    const adminSessionCookie = request.cookies.get("admin-session");
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const major = String(formData.get("major") || "").trim().toLowerCase() as MajorCode;

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "请上传 Excel 文件" }, { status: 400 });
    }
    if (!TABLE_MAP[major]) {
      return NextResponse.json({ success: false, error: "专业参数无效，请选择 tewm/iot/eie/ist" }, { status: 400 });
    }
    if (!isExcelFile(file.name)) {
      return NextResponse.json({ success: false, error: "仅支持 .xlsx / .xls 文件" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ success: false, error: "Excel 中未检测到可用 sheet" }, { status: 400 });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: null });
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ success: false, error: "Excel 中没有可导入数据" }, { status: 400 });
    }

    // 列名兼容处理：按小写匹配，要求必须包含固定列
    const firstRowKeys = Object.keys(rawRows[0] || {});
    const keyMap = new Map<string, string>();
    firstRowKeys.forEach((key) => keyMap.set(normalizeKey(key), key));

    const missingColumns = REQUIRED_COLUMNS.filter((col) => !keyMap.has(col));
    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Excel 列名不符合要求",
          details: [
            `缺失列: ${missingColumns.join(", ")}`,
            `实际列: ${firstRowKeys.join(", ")}`,
            "必须包含列: year, subclass, subclass_number, average_bonus, total_number",
          ],
        },
        { status: 400 }
      );
    }

    const parsedRows: Array<{
      year: number;
      subclass: string;
      subclass_number: number;
      average_bonus: number;
      total_number: number;
    }> = [];
    const parseErrors: string[] = [];

    rawRows.forEach((row, idx) => {
      const rowNo = idx + 2; // sheet 第1行通常是表头，数据从第2行开始
      const year = Math.trunc(toNumber(row[keyMap.get("year") as string]));
      const subclass = String(row[keyMap.get("subclass") as string] ?? "").trim();
      const subclassNumber = Math.trunc(toNumber(row[keyMap.get("subclass_number") as string]));
      const averageBonus = toNumber(row[keyMap.get("average_bonus") as string]);
      const totalNumber = Math.trunc(toNumber(row[keyMap.get("total_number") as string]));

      if (!Number.isFinite(year)) {
        parseErrors.push(`第 ${rowNo} 行 year 不是有效数字`);
        return;
      }
      if (!subclass) {
        parseErrors.push(`第 ${rowNo} 行 subclass 为空`);
        return;
      }
      if (!Number.isFinite(subclassNumber)) {
        parseErrors.push(`第 ${rowNo} 行 subclass_number 不是有效数字`);
        return;
      }
      if (!Number.isFinite(averageBonus)) {
        parseErrors.push(`第 ${rowNo} 行 average_bonus 不是有效数字`);
        return;
      }
      if (!Number.isFinite(totalNumber)) {
        parseErrors.push(`第 ${rowNo} 行 total_number 不是有效数字`);
        return;
      }

      parsedRows.push({
        year,
        subclass,
        subclass_number: subclassNumber,
        average_bonus: averageBonus,
        total_number: totalNumber,
      });
    });

    if (parseErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Excel 数据校验失败",
          details: parseErrors.slice(0, 20),
        },
        { status: 400 }
      );
    }

    const targetTable = TABLE_MAP[major];

    // 覆盖导入：先清空目标表（按你的需求）
    // 注：这里通过 year 条件删除实现全表清空，默认 year 为非空数值列
    const { error: deleteError } = await supabase
      .from(targetTable)
      .delete()
      .gte("year", 0);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `清空目标表失败: ${deleteError.message}` },
        { status: 500 }
      );
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
      const batch = parsedRows.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from(targetTable).insert(batch);
      if (insertError) {
        return NextResponse.json(
          { success: false, error: `写入数据库失败: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "导入成功（已覆盖原表数据）",
      tableName: targetTable,
      importedRows: parsedRows.length,
      sheetName: firstSheetName,
    });
  } catch (error) {
    console.error("国内加分导入失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "服务器错误",
      },
      { status: 500 }
    );
  }
}

