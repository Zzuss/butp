import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type Destination = "domestic" | "abroad" | "employment";

const VALID_DESTINATIONS: Destination[] = ["domestic", "abroad", "employment"];
const ABILITY_COLS = Array.from({ length: 18 }, (_, i) => `C${i + 1}`);

type AnyRow = Record<string, unknown>;

function round8(value: number): number {
  return Number(value.toFixed(8));
}

function pick(row: AnyRow, candidates: string[]): unknown {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

// 成绩映射规则
const GRADE_TEXT_MAPPING: Record<string, number> = {
  优: 95,
  良: 85,
  中: 75,
  及格: 60,
  不及格: 50,
};

function normalizeGrade(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;

  const direct = toNumber(text);
  if (Number.isFinite(direct)) return direct;

  if (GRADE_TEXT_MAPPING[text] !== undefined) return GRADE_TEXT_MAPPING[text];
  return null;
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

    const userHash = session.userHash.trim();

    // 1) 读取当前学生所有课程记录，再按 Course_Attribute=必修 过滤
    const { data: academicRows, error: academicError } = await supabase
      .from("academic_results")
      .select("SNH,Current_Major,Course_ID,Grade,Course_Attribute,Credit,year")
      .eq("SNH", userHash);

    if (academicError) {
      throw new Error(`Failed to query academic_results: ${academicError.message}`);
    }

    // 过滤出必修课程的整行数据
    const requiredCourses = (academicRows ?? []).filter((row) => {
      const attr = String((row as AnyRow).Course_Attribute ?? "").trim();
      return attr === "必修";
    }) as AnyRow[];

    if (requiredCourses.length === 0) {
      return NextResponse.json({
        destination,
        abilities: ABILITY_COLS,
        rawAbilities: Object.fromEntries(ABILITY_COLS.map((c) => [c, 0])),
        zAbilities: Object.fromEntries(ABILITY_COLS.map((c) => [c, 0])),
        debug: {
          totalCourses: (academicRows ?? []).length,
          requiredCourses: 0,
          matchedCourses: 0,
          validCourses: 0,
          totalCredit: 0,
          ignoredReason: "No required courses",
        },
      });
    }

    // 2) 读取 Courses_Rada 用于 major + year + course_id 精确匹配
    const majors = Array.from(
      new Set(requiredCourses.map((r) => String(pick(r, ["Current_Major", "current_major"]) ?? "").trim()).filter(Boolean))
    );  //去重去空
    const years = Array.from(
      new Set(requiredCourses.map((r) => String(pick(r, ["year", "Year"]) ?? "").trim()).filter(Boolean))
    );
    const courseIds = Array.from(
      new Set(requiredCourses.map((r) => String(pick(r, ["Course_ID", "course_id"]) ?? "").trim()).filter(Boolean))
    );

    const { data: radaRows, error: radaError } = await supabase
      .from("Courses_Rada")
      .select("*")
      .in("major", majors)
      .in("year", years)
      .in("course_id", courseIds);

    if (radaError) {
      throw new Error(`Failed to query Courses_Rada: ${radaError.message}`);
    }

    const radaMap = new Map<string, AnyRow>();
    (radaRows ?? []).forEach((row) => {
      const major = String(pick(row as AnyRow, ["major", "Major"]) ?? "").trim();
      const year = String(pick(row as AnyRow, ["year", "Year"]) ?? "").trim();
      const courseId = String(pick(row as AnyRow, ["course_id", "Course_ID"]) ?? "").trim();
      if (major && year && courseId) {
        radaMap.set(`${major}__${year}__${courseId}`, row as AnyRow);
      }
    });

    // 3) 计算原始 C18：sum(成绩*学分*权重) / 有效总学分
    const weightedSums = Object.fromEntries(ABILITY_COLS.map((c) => [c, 0])) as Record<string, number>;
    let totalCredit = 0;
    let matchedCourses = 0;
    let validCourses = 0;
    // [DEBUG-ONLY] 调试使用：统计“必修但未命中 Courses_Rada”的课程信息，上线时应删除
    const requiredButNotInRadaCourseIds: string[] = [];

    for (const course of requiredCourses) {
      const major = String(pick(course, ["Current_Major", "current_major"]) ?? "").trim();
      const year = String(pick(course, ["year", "Year"]) ?? "").trim();
      const courseId = String(pick(course, ["Course_ID", "course_id"]) ?? "").trim();
      const grade = normalizeGrade(pick(course, ["Grade", "grade"]));
      const credit = toNumber(pick(course, ["Credit", "credit"]));

      if (!major || !year || !courseId) continue;
      if (grade === null || !Number.isFinite(credit) || credit <= 0) continue;

      const rada = radaMap.get(`${major}__${year}__${courseId}`);
      if (!rada) {
        // [DEBUG-ONLY] 调试使用：记录未命中课程ID，上线时应删除
        requiredButNotInRadaCourseIds.push(courseId);
        continue;
      }
      matchedCourses += 1;

      // 课程有效：至少存在一个可用权重
      let hasAtLeastOneWeight = false;
      // 遍历、取每一维能力权重，计算加权总分
      for (const ability of ABILITY_COLS) {
        const weight = toNumber(pick(rada, [ability, ability.toLowerCase()]));
        if (Number.isFinite(weight)) {
          weightedSums[ability] += grade * credit * weight;  // 计算每一维加权总分
          hasAtLeastOneWeight = true;
        }
      }
      if (!hasAtLeastOneWeight) continue;

      totalCredit += credit;
      validCourses += 1;
    }

    // [DEBUG-ONLY] 调试使用：输出未命中 Courses_Rada 的课程统计，上线时应删除
    console.log("[DEBUG role-models/my-c18] required-but-not-in-Courses_Rada", {
      userHash: `${userHash.slice(0, 8)}...`,
      count: requiredButNotInRadaCourseIds.length,
      firstThreeCourseIds: requiredButNotInRadaCourseIds.slice(0, 3),
    });

    const rawAbilities: Record<string, number> = {};
    ABILITY_COLS.forEach((ability) => {
      const raw = totalCredit > 0 ? weightedSums[ability] / totalCredit : 0;
      rawAbilities[ability] = round8(raw);
    });

    // 4) 读取当前去向 mean/std，并计算 z-score
    const { data: meanRows, error: meanError } = await supabase
      .from("career_direction_C18_mean")
      .select("*")
      .eq("destination", destination)
      .limit(1);
    if (meanError) {
      throw new Error(`Failed to query career_direction_C18_mean: ${meanError.message}`);
    }

    const { data: stdRows, error: stdError } = await supabase
      .from("career_direction_C18_std")
      .select("*")
      .eq("destination", destination)
      .limit(1);
    if (stdError) {
      throw new Error(`Failed to query career_direction_C18_std: ${stdError.message}`);
    }

    const meanRow = (meanRows?.[0] ?? {}) as AnyRow;
    const stdRow = (stdRows?.[0] ?? {}) as AnyRow;

    const zAbilities: Record<string, number> = {};
    ABILITY_COLS.forEach((ability) => {
      // 读取当前库里的命名：mean_C* / std_C*

      const mean = toNumber(
        pick(meanRow, [`mean_${ability}`])
      );
      const std = toNumber(
        pick(stdRow, [`std_${ability}`])
      );
      const raw = rawAbilities[ability];

      // 如果 mean 或 std 为 NaN 或 0，则 z-score 为 0
      if (!Number.isFinite(mean) || !Number.isFinite(std) || std === 0) {
        zAbilities[ability] = 0;
        return;
      }

      zAbilities[ability] = round8((raw - mean) / std);  // 计算 z-score
    });

    return NextResponse.json({
      destination,
      abilities: ABILITY_COLS,
      rawAbilities,
      zAbilities,
      debug: {
        totalCourses: (academicRows ?? []).length,
        requiredCourses: requiredCourses.length,
        matchedCourses,
        validCourses,
        totalCredit: round8(totalCredit),
      },
    });
  } catch (error) {
    console.error("Failed to generate user C18 radar:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: process.env.NODE_ENV === "development" ? detail : undefined,
      },
      { status: 500 }
    );
  }
}
