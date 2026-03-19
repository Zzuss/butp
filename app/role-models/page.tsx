"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/language-context";
import { GraduationCap, Globe, Briefcase, RefreshCcw, X } from "lucide-react";
import { getStudentInfo } from "@/lib/dashboard-data";

type Destination = "domestic" | "abroad" | "employment";

interface CentroidResponse {
  destination: Destination;
  statsVersion: string | null;
  computationTime: string | null;
  abilities: string[];
  subclasses: Array<{
    subclass: string;
    sampleSize: number;
    abilities: Record<string, number>;
  }>;
}

interface MyC18Response {
  destination: Destination;
  abilities: string[];
  rawAbilities: Record<string, number>;
  zAbilities: Record<string, number>;
  debug?: {
    totalCourses: number;
    requiredCourses: number;
    matchedCourses: number;
    validCourses: number;
    totalCredit: number;
    ignoredReason?: string;
  };
}

type UserProfilesByDestination = Partial<Record<Destination, MyC18Response>>;
type UserProfileVisibilityByDestination = Partial<Record<Destination, boolean>>;
type DomesticMajorCode = "tewm" | "iot" | "eie" | "ist";

interface DomesticBonusSummary {
  competition: number;
  paper: number;
  patent: number;
  total: number;
}

interface DomesticBonusOverview {
  year: number;
  major: DomesticMajorCode;
  totalNumber: number;
  competitionAverageBonus: number;
  competition: number;
  paper: number;
  patent: number;
}

const OVERVIEW_YEAR_OPTIONS = ["2022", "2023", "2024", "2025"] as const;
const OVERVIEW_MAJOR_OPTIONS: Array<{ value: DomesticMajorCode; label: string }> = [
  { value: "eie", label: "电子信息工程" },
  { value: "ist", label: "智能科学与技术" },
  { value: "iot", label: "物联网工程" },
  { value: "tewm", label: "电信工程及管理" },
];

const destinationMetaByLanguage: Record<
  "zh" | "en",
  Record<Destination, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }>
> = {
  zh: {
    domestic: {
      label: "国内升学",
      description: "展示国内升学各小类的 C1~C18 能力值中心向量（z-score 后）",
      icon: GraduationCap,
    },
    abroad: {
      label: "出国留学",
      description: "展示出国留学各小类的 C1~C18 能力值中心向量（z-score 后）",
      icon: Globe,
    },
    employment: {
      label: "本科就业",
      description: "展示本科就业各小类的 C1~C18 能力值中心向量（z-score 后）",
      icon: Briefcase,
    },
  },
  en: {
    domestic: {
      label: "Domestic Graduate",
      description: "Compare C1~C18 subclass centroids for domestic graduate direction (z-score).",
      icon: GraduationCap,
    },
    abroad: {
      label: "Study Abroad",
      description: "Compare C1~C18 subclass centroids for study abroad direction (z-score).",
      icon: Globe,
    },
    employment: {
      label: "Undergraduate Employment",
      description: "Compare C1~C18 subclass centroids for undergraduate employment direction (z-score).",
      icon: Briefcase,
    },
  },
};

const radarColors = [
  "#07C4ED", // 蓝色
  "#E85656", // 红色
  "#f59e0b", // 黄色
  "#54DE52", // 绿色
  "#A354EB", // 紫色
  "#1732AD", // 蓝色
  "#db2777", // 粉色
  "#ea580c", // 橙色
];

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

function formatRadiusTickValue(value: number | string): string {
  const text = String(value);
  // 用 Unicode 负号提升可读性
  return text.replace(/-/g, "−");
}

function RadiusTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: number | string };
  index?: number;
}) {
  const { x = 0, y = 0, payload, index = 0 } = props;
  // 隐藏最中心那一圈度量值
  if (index === 0) return null;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      pointerEvents="none"
      fill="#111827"
      fontSize={12}
      fontWeight={700}
    >
      {formatRadiusTickValue(payload?.value ?? "")}
    </text>
  );
}

function SortedRadarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const sorted = [...payload].sort(
    (a, b) => Number(b.value ?? Number.NEGATIVE_INFINITY) - Number(a.value ?? Number.NEGATIVE_INFINITY)
  );

  return (
    <div className="rounded-md border bg-background/95 px-4 py-3 shadow-md">
      <div className="mb-2 text-base font-semibold text-foreground">{label}</div>
      <div className="space-y-1">
        {sorted.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color || "#64748b" }}
              />
              <span className="text-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{Number(entry.value ?? 0).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildRadarData(data: CentroidResponse | null, userProfile: MyC18Response | null) {
  if (!data) return [];
  return data.abilities.map((ability) => {
    const row: Record<string, string | number> = { ability };
    data.subclasses.forEach((item) => {
      row[item.subclass] = Number(item.abilities[ability] ?? 0);
    });
    // 用户画像使用 z-score 值，和各小类中心同量纲可直接同图比较
    if (userProfile?.zAbilities) {
      row["我的画像"] = Number(userProfile.zAbilities[ability] ?? 0);
    }
    return row;
  });
}

function mapMajorLabelToCode(major: string): DomesticMajorCode | null {
  if (major.includes("电子信息工程")) return "eie";
  if (major.includes("智能科学与技术")) return "ist";
  if (major.includes("物联网工程")) return "iot";
  if (major.includes("电信工程及管理")) return "tewm";
  return null;
}

export default function RoleModelsPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [destination, setDestination] = useState<Destination>("domestic");
  const [data, setData] = useState<CentroidResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGeneratePrompt, setShowGeneratePrompt] = useState(false);
  const [userProfilesByDestination, setUserProfilesByDestination] = useState<UserProfilesByDestination>({});
  const [userProfileVisibilityByDestination, setUserProfileVisibilityByDestination] =
    useState<UserProfileVisibilityByDestination>({});
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [domesticBonus, setDomesticBonus] = useState<DomesticBonusSummary>({
    competition: 0,
    paper: 0,
    patent: 0,
    total: 0,
  });
  const [myBonusLoading, setMyBonusLoading] = useState(false);
  const [overviewYear, setOverviewYear] = useState<string>("2024");
  const [overviewMajor, setOverviewMajor] = useState<DomesticMajorCode>("eie");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewData, setOverviewData] = useState<DomesticBonusOverview>({
    year: 2024,
    major: "eie",
    totalNumber: 0,
    competitionAverageBonus: 0,
    competition: 0,
    paper: 0,
    patent: 0,
  });
  const [studentInfoText, setStudentInfoText] = useState<string>("");
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(false);
  const [showZScoreInfo, setShowZScoreInfo] = useState(false);
  const requestAbortRef = useRef<AbortController | null>(null);

  const isEn = language === "en";
  const text = isEn
    ? {
        authRequiredTitle: "Login Required",
        authRequiredDesc: "Please log in to view the career analysis radar chart.",
        goLogin: "Go to Login",
        pageTitle: "Career Analysis",
        loadingStudentInfo: "Loading student info...",
        studentInfoLoadFailed: "Failed to load student info",
        whatIsZScore: "What is z-score?",
        tabDomestic: "Domestic Graduate",
        tabAbroad: "Study Abroad",
        tabEmployment: "Undergraduate Employment",
        dataVersion: "Data Version",
        computationTime: "Computation Time",
        refresh: "Refresh",
        loadingRadar: "Loading radar data...",
        noData: "No data to display",
        myProfile: "My Profile",
        hideMyProfile: "Hide My Profile",
        generateMyProfile: "Generate My Profile",
        overviewTitle: "Past Bonus Overview",
        grade: "Year",
        major: "Major",
        overviewHintSuffix: "means: students with competition bonus / total students recommended for postgraduate.",
        loadingOverview: "Loading overview data...",
        avgBonus: "Avg Bonus",
        myBonusTitle: "My Bonus",
        myBonusHint: "*Competition bonus is cumulative and may not match school cap rules.",
        loadingMyBonus: "Loading my bonus...",
        competition: "Competition",
        paper: "Paper",
        patent: "Patent",
        closePromptAria: "Close prompt",
        promptText: "Filling in more personal info (papers, competition awards, etc.) helps generate a better profile.",
        generating: "Generating...",
        generateDirectly: "Generate Now",
        goFill: "Go Fill",
        closeZScoreAria: "Close z-score description",
        zScoreDesc:
          "z-score means how far you are from the average of students in the same destination.\nz-score > 0 means above average, < 0 means below average.",
        loginExpiredView: "Session expired. Please log in again.",
        loginExpiredGenerate: "Session expired. Please log in again before generating profile.",
        requestFailed: "Request failed",
        loadFailed: "Load failed",
        generateFailed: "Generate failed",
      }
    : {
        authRequiredTitle: "需要先登录",
        authRequiredDesc: "请先登录后查看职业分析雷达图。",
        goLogin: "去登录",
        pageTitle: "职业分析",
        loadingStudentInfo: "正在加载学生信息",
        studentInfoLoadFailed: "学生信息加载失败",
        whatIsZScore: "什么是z-score？",
        tabDomestic: "国内升学",
        tabAbroad: "出国留学",
        tabEmployment: "本科就业",
        dataVersion: "数据版本",
        computationTime: "计算时间",
        refresh: "刷新",
        loadingRadar: "正在加载雷达图数据...",
        noData: "暂无可展示数据",
        myProfile: "我的画像",
        hideMyProfile: "隐藏我的画像",
        generateMyProfile: "生成我的画像",
        overviewTitle: "往届加分总览",
        grade: "年级",
        major: "专业",
        overviewHintSuffix: "表示：获竞赛加分的人数/总保研人数",
        loadingOverview: "往届数据加载中...",
        avgBonus: "加分均分",
        myBonusTitle: "我的加分",
        myBonusHint: "*竞赛加分只做累加，不一定符合学校上限要求",
        loadingMyBonus: "我的加分加载中...",
        competition: "竞赛",
        paper: "论文",
        patent: "专利",
        closePromptAria: "关闭提示卡片",
        promptText: "填写更多个人信息（如论文发表、竞赛获奖等）有利于画像生成",
        generating: "生成中...",
        generateDirectly: "直接生成",
        goFill: "去填写",
        closeZScoreAria: "关闭z-score说明",
        zScoreDesc:
          "z-score 的值可以理解为：和同去向同学平均水平相比，你高了多少或低了多少\nz-score > 0 说明高于平均， < 0 说明低于平均",
        loginExpiredView: "登录状态失效，请重新登录后查看职业分析。",
        loginExpiredGenerate: "登录状态失效，请重新登录后生成画像。",
        requestFailed: "请求失败",
        loadFailed: "加载失败",
        generateFailed: "生成失败",
      };
  const meta = destinationMetaByLanguage[isEn ? "en" : "zh"][destination];
  const hasCurrentDestinationProfile = Boolean(userProfilesByDestination[destination]);
  const isCurrentDestinationProfileVisible =
    Boolean(userProfileVisibilityByDestination[destination]) && hasCurrentDestinationProfile;
  const currentUserProfile = isCurrentDestinationProfileVisible ? (userProfilesByDestination[destination] ?? null) : null;
  const chartData = useMemo(() => buildRadarData(data, currentUserProfile), [data, currentUserProfile]);

  const fetchCentroids = async (target: Destination) => {
    // 取消前一个未完成请求，避免旧响应覆盖新状态
    if (requestAbortRef.current) {
      requestAbortRef.current.abort();
    }
    const controller = new AbortController();
    requestAbortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/role-models/c18-centroids?destination=${target}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (res.status === 401) {
        setError(text.loginExpiredView);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `${text.requestFailed} (${res.status})`);
      }

      const body = (await res.json()) as CentroidResponse;
      if (controller.signal.aborted) return;
      setData(body);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const message = e instanceof Error ? e.message : text.loadFailed;
      setError(message);
    } finally {
      // 仅由当前请求关闭 loading，避免被旧请求 finally 干扰
      if (requestAbortRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;
    // 刷新页面时，登录态字段可能分步就绪；等到 userHash 可用再请求，避免首屏误判为空数据
    if (!user?.isLoggedIn || !user?.userHash) return;
    fetchCentroids(destination);
  }, [destination, authLoading, user?.isLoggedIn, user?.userHash]);

  useEffect(() => {
    return () => {
      if (requestAbortRef.current) {
        requestAbortRef.current.abort();
      }
    };
  }, []);

  const fetchDomesticBonus = async () => {
    setMyBonusLoading(true);
    try {
      const res = await fetch("/api/role-models/my-domestic-bonus", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        // 无法获取时按 0 处理，避免影响页面主流程
        setDomesticBonus({ competition: 0, paper: 0, patent: 0, total: 0 });
        return;
      }

      const body = (await res.json()) as {
        competition?: number;
        paper?: number;
        patent?: number;
        total?: number;
      };
      const competition = Number(body.competition ?? 0);
      const paper = Number(body.paper ?? 0);
      const patent = Number(body.patent ?? 0);
      const total = competition + paper + patent;

      setDomesticBonus({
        competition: Number(competition.toFixed(1)),
        paper: Math.trunc(paper),
        patent: Math.trunc(patent),
        total: Number(total.toFixed(1)),
      });
    } catch {
      setDomesticBonus({ competition: 0, paper: 0, patent: 0, total: 0 });
    } finally {
      setMyBonusLoading(false);
    }
  };

  const fetchDomesticOverview = async (year: string, major: DomesticMajorCode) => {
    setOverviewLoading(true);
    try {
      const res = await fetch(`/api/role-models/domestic-bonus-overview?year=${year}&major=${major}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401) {
        setError(text.loginExpiredView);
        return;
      }

      if (!res.ok) {
        setOverviewData({
          year: Number(year),
          major,
          totalNumber: 0,
          competitionAverageBonus: 0,
          competition: 0,
          paper: 0,
          patent: 0,
        });
        return;
      }

      const body = (await res.json()) as DomesticBonusOverview;
      setOverviewData({
        year: Number(body.year ?? year),
        major,
        totalNumber: Number(body.totalNumber ?? 0),
        competitionAverageBonus: Number(body.competitionAverageBonus ?? 0),
        competition: Number(body.competition ?? 0),
        paper: Number(body.paper ?? 0),
        patent: Number(body.patent ?? 0),
      });
    } catch {
      setOverviewData({
        year: Number(year),
        major,
        totalNumber: 0,
        competitionAverageBonus: 0,
        competition: 0,
        paper: 0,
        patent: 0,
      });
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isLoggedIn || !user?.userId) return;
    if (destination !== "domestic") return;
    fetchDomesticBonus();
  }, [destination, authLoading, user?.isLoggedIn, user?.userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isLoggedIn) return;
    if (destination !== "domestic") return;
    fetchDomesticOverview(overviewYear, overviewMajor);
  }, [destination, authLoading, user?.isLoggedIn, overviewYear, overviewMajor]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isLoggedIn || !user?.userHash || !user?.userId) {
      setStudentInfoText("");
      return;
    }

    const loadStudentMeta = async () => {
      setLoadingStudentInfo(true);
      try {
        const info = await getStudentInfo(user.userHash);
        // 年级优先使用学号前4位（如 202421**** -> 2024），避免数据库学期记录导致的年级偏差
        const userId = String(user.userId).trim();
        const idYear = userId.slice(0, 4);
        const yearFromId = /^\d{4}$/.test(idYear) ? idYear : "";
        // 回退：若学号不规范，则使用数据库返回年级
        const yearFromDb = (info?.year ?? "").replace(/级/g, "").trim();
        const yearText = yearFromId || yearFromDb;
        const majorText = (info?.major ?? "").trim();
        const majorCodeFromInfo = mapMajorLabelToCode(majorText);

        // 默认把“往届总览”筛选项同步到当前用户年级与专业（仅首次加载常见场景）
        if (yearText && OVERVIEW_YEAR_OPTIONS.includes(yearText as (typeof OVERVIEW_YEAR_OPTIONS)[number])) {
          setOverviewYear(yearText);
        }
        if (majorCodeFromInfo) {
          setOverviewMajor(majorCodeFromInfo);
        }

        if (yearText && majorText && userId) {
          setStudentInfoText(`${yearText}${majorText}-${userId}`);
        } else if (userId) {
          setStudentInfoText(`--${majorText || (isEn ? "Unknown Major" : "未知专业")}-${userId}`);
        } else {
          setStudentInfoText(text.studentInfoLoadFailed);
        }
      } catch {
        setStudentInfoText(text.studentInfoLoadFailed);
      } finally {
        setLoadingStudentInfo(false);
      }
    };

    loadStudentMeta();
  }, [authLoading, user?.isLoggedIn, user?.userHash, user?.userId]);

  const generateMyProfile = async (target: Destination = destination) => {
    setGeneratingProfile(true);
    setError(null);
    try {
      const res = await fetch(`/api/role-models/my-c18?destination=${target}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401) {
        setError(text.loginExpiredGenerate);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `${text.generateFailed} (${res.status})`);
      }

      const body = (await res.json()) as MyC18Response;
      // 按去向缓存用户画像，切换 tab 后可恢复显示
      setUserProfilesByDestination((prev) => ({ ...prev, [target]: body }));
      setUserProfileVisibilityByDestination((prev) => ({ ...prev, [target]: true }));
      setShowGeneratePrompt(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : text.generateFailed;
      setError(message);
    } finally {
      setGeneratingProfile(false);
    }
  };

  if (!authLoading && !user?.isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">{text.authRequiredTitle}</h2>
        <p className="text-muted-foreground mb-4">{text.authRequiredDesc}</p>
        <Button onClick={() => router.push("/login")}>{text.goLogin}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{text.pageTitle}</h1>
        <p className="text-muted-foreground mt-1">{loadingStudentInfo ? text.loadingStudentInfo : studentInfoText || text.studentInfoLoadFailed}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <meta.icon className="h-5 w-5 text-primary" />
            {meta.label}
          </CardTitle>
          <CardDescription className="flex items-center gap-4">
            <span>{meta.description}</span>  {/*div改为span标签，网页不报错*/}
            <button
              type="button"
              className="inline-block rounded-sm px-1 text-base font-bold underline underline-offset-4 transition-colors hover:text-foreground"
              onClick={() => setShowZScoreInfo(true)}
            >
              {text.whatIsZScore}
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={destination} onValueChange={(v) => setDestination(v as Destination)}>
            <TabsList>
              <TabsTrigger value="domestic">{text.tabDomestic}</TabsTrigger>
              <TabsTrigger value="abroad">{text.tabAbroad}</TabsTrigger>
              <TabsTrigger value="employment">{text.tabEmployment}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {text.dataVersion}：{data?.statsVersion ?? "-"} | {text.computationTime}：{data?.computationTime ?? "-"}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchCentroids(destination)} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {text.refresh}
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-muted-foreground">{text.loadingRadar}</div>
          ) : chartData.length === 0 ? (
            <div className="h-[520px] flex items-center justify-center text-muted-foreground">{text.noData}</div>
          ) : (
            <div className={destination === "domestic" ? "flex w-full flex-col gap-4 lg:h-[680px] lg:flex-row" : "relative h-[680px] w-full"}>
              {/* 移动端优先展示雷达图，随后是往届加分总览与我的加分 */}
              <div className={destination === "domestic" ? "relative order-1 h-[520px] w-full sm:h-[580px] lg:order-2 lg:h-full lg:flex-1" : "relative h-full w-full"}>
                {/*图例*/}
                <div className="absolute left-2 top-2 z-10 rounded-md border bg-background/95 px-3 py-2 shadow-sm lg:left-auto lg:right-4 lg:top-3 lg:px-4 lg:py-3">
                  <div className="space-y-1">
                    {data?.subclasses.map((item, idx) => (
                      <div key={`legend-${item.subclass}`} className="flex items-center gap-2 text-sm lg:text-base">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: radarColors[idx % radarColors.length] }}
                        />
                        <span style={{ color: radarColors[idx % radarColors.length] }}>{item.subclass}</span>
                      </div>
                    ))}
                    {currentUserProfile && (
                      <div className="flex items-center gap-2 text-sm lg:text-base">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-black" />
                        <span className="text-black">{text.myProfile}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={chartData}
                    outerRadius="90%"
                    cx="50%"
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="ability" tick={{ fontSize: 14 }} />
                    {/* 先渲染轴，不显示度量文字 */}
                    <PolarRadiusAxis tick={false} />
                    <Tooltip content={<SortedRadarTooltip />} />
                    {data?.subclasses.map((item, idx) => (
                      <Radar
                        key={item.subclass}
                        name={`${item.subclass}`}
                        dataKey={item.subclass}
                        stroke={radarColors[idx % radarColors.length]}
                        fill={radarColors[idx % radarColors.length]}
                        fillOpacity={0.15}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 3.2 }}
                      />
                    ))}
                    {currentUserProfile && (
                      <Radar
                        name="我的画像"
                        dataKey="我的画像"
                        stroke="#000000"
                        fill="#000000"
                        fillOpacity={0.06}
                        strokeWidth={2.8}
                        dot={false}
                        activeDot={{ r: 3.2 }}
                      />
                    )}
                    {/* 最后只渲染度量文字，避免重复绘制轴线 */}
                    <PolarRadiusAxis axisLine={false} tickLine={false} tick={(props) => <RadiusTick {...props} />} />
                  </RadarChart>
                </ResponsiveContainer>
                <Button
                  className={`absolute bottom-3 right-3 z-10 h-11 min-w-[128px] px-4 text-sm sm:h-12 sm:min-w-[150px] sm:text-base lg:bottom-8 lg:right-8 ${
                    isCurrentDestinationProfileVisible
                      ? "border border-input bg-white text-black hover:bg-gray-100"
                      : "bg-black text-white hover:bg-black/75"
                  }`}
                  onClick={() => {
                    if (isCurrentDestinationProfileVisible) {
                      // 仅隐藏显示，不清除缓存数据；后续可快速恢复
                      setUserProfileVisibilityByDestination((prev) => ({ ...prev, [destination]: false }));
                      return;
                    }
                    if (hasCurrentDestinationProfile) {
                      setUserProfileVisibilityByDestination((prev) => ({ ...prev, [destination]: true }));
                      return;
                    }
                    setShowGeneratePrompt(true);
                  }}
                >
                  {isCurrentDestinationProfileVisible ? text.hideMyProfile : text.generateMyProfile}
                </Button>
              </div>

              {destination === "domestic" && (
                <div className="order-2 w-full space-y-4 lg:order-1 lg:w-[340px] lg:shrink-0">
                  <div className="rounded-lg border bg-slate-100/90 p-4 shadow-sm">
                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-slate-900">{text.overviewTitle}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">{text.grade}</label>
                        <select
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                          value={overviewYear}
                          onChange={(e) => setOverviewYear(e.target.value)}
                        >
                          {OVERVIEW_YEAR_OPTIONS.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">{text.major}</label>
                        <select
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                          value={overviewMajor}
                          onChange={(e) => setOverviewMajor(e.target.value as DomesticMajorCode)}
                        >
                          {OVERVIEW_MAJOR_OPTIONS.map((major) => (
                            <option key={major.value} value={major.value}>
                              {major.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{overviewData.competition}/{overviewData.totalNumber} {text.overviewHintSuffix}</p>
                    {overviewLoading ? (
                      <div className="flex h-[190px] items-center justify-center text-sm text-slate-500">{text.loadingOverview}</div>
                    ) : (
                      <div className="mt-3 flex h-[210px] items-end justify-between gap-3">
                        {[
                          { key: "competition", label: "竞赛", value: overviewData.competition, color: "bg-emerald-600", light: "bg-emerald-200" },
                          { key: "paper", label: "论文", value: overviewData.paper, color: "bg-blue-600", light: "bg-blue-200" },
                          { key: "patent", label: "专利", value: overviewData.patent, color: "bg-violet-600", light: "bg-violet-200" },
                        ].map((item) => {
                          const total = Math.max(overviewData.totalNumber, 1);
                          const deepHeight = Math.max(8, (item.value / total) * 140);
                          return (
                            <div key={item.key} className="flex flex-1 flex-col items-center">
                              {item.key === "competition" ? (
                                <div className="mb-1 text-center text-xs font-semibold leading-tight text-slate-700">
                                  <div>{item.value}/{overviewData.totalNumber}</div>
                                  <div>{text.avgBonus}：{overviewData.competitionAverageBonus.toFixed(1)}</div>
                                </div>
                              ) : (
                                <div className="mb-1 text-xs font-semibold text-slate-700">
                                  {item.value}/{overviewData.totalNumber}
                                </div>
                              )}
                              <div className="relative h-[140px] w-12">
                                <div className={`absolute bottom-0 w-12 rounded-t-md ${item.light}`} style={{ height: "140px" }} />
                                <div className={`absolute bottom-0 w-12 rounded-t-md ${item.color}`} style={{ height: `${deepHeight}px` }} />
                              </div>
                              <div className="mt-2 text-sm text-slate-700">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border bg-slate-100/90 p-4 shadow-sm">
                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-slate-900">{text.myBonusTitle}</h3>
                      <p className="mt-1 text-xs text-slate-600">{text.myBonusHint}</p>
                    </div>
                    {myBonusLoading ? (
                      <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">{text.loadingMyBonus}</div>
                    ) : (
                      <div className="mt-2 flex h-[190px] items-end justify-between gap-3">
                        {[
                          { key: "competition", label: text.competition, value: domesticBonus.competition, unit: isEn ? " pt" : "分", color: "bg-emerald-600" },
                          { key: "paper", label: text.paper, value: domesticBonus.paper, unit: isEn ? "" : "条", color: "bg-blue-600" },
                          { key: "patent", label: text.patent, value: domesticBonus.patent, unit: isEn ? "" : "条", color: "bg-violet-600" },
                        ].map((item) => {
                          const maxCompetition = Math.max(domesticBonus.competition, 1);
                          const maxCountBetweenPaperAndPatent = Math.max(domesticBonus.paper, domesticBonus.patent, 1);
                          const barHeight = item.key === "competition"
                            ? Math.max(12, (item.value / maxCompetition) * 120)
                            : Math.max(12, (item.value / maxCountBetweenPaperAndPatent) * 120);
                          return (
                            <div key={item.key} className="flex flex-1 flex-col items-center">
                              <div className="mb-1 text-xs font-semibold text-slate-700">
                                {item.key === "competition" ? item.value.toFixed(1) : String(Math.trunc(item.value))}
                                {item.unit}
                              </div>
                              <div className={`w-12 rounded-t-md ${item.color}`} style={{ height: `${barHeight}px` }} />
                              <div className="mt-2 text-sm text-slate-700">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showGeneratePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 animate-in fade-in-0 duration-400">
          <div className="relative w-full max-w-md rounded-lg border bg-background p-6 shadow-xl animate-in fade-in-0 zoom-in-90 slide-in-from-bottom-3 duration-400 ease-out">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:bg-muted"
              onClick={() => setShowGeneratePrompt(false)}
              aria-label={text.closePromptAria}
            >
              <X className="h-4 w-4" />
            </Button>
            <p className="mt-1 text-center text-xl text-muted-foreground">
              {isEn ? (
                <>Filling in more personal info (papers, competition awards, etc.)<br />helps generate a better profile.</>
              ) : (
                <>填写更多个人信息（如论文发表、竞赛<br/>获奖等）有利于画像生成</>
              )}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                className="mt-1 h-11 min-w-[112px] justify-center text-center text-base text-black bg-white hover:bg-gray-100"
                onClick={() => generateMyProfile(destination)}
                disabled={generatingProfile}
              >
                {generatingProfile ? text.generating : text.generateDirectly}
              </Button>
              <Button
                className="mt-1 h-11 min-w-[112px] justify-center text-center text-base text-white bg-black hover:bg-black/75"
                onClick={() => {
                  setShowGeneratePrompt(false);
                  router.push("/profile");
                }}
              >
                {text.goFill}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showZScoreInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 animate-in fade-in-0 duration-400">
          <div className="relative w-full max-w-xl rounded-xl border bg-background p-9 shadow-xl animate-in fade-in-0 zoom-in-90 slide-in-from-bottom-3 duration-400 ease-out">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:bg-muted"
              onClick={() => setShowZScoreInfo(false)}
              aria-label={text.closeZScoreAria}
            >
              <X className="h-4 w-4" />
            </Button>
            <p className="mt-1 text-xl leading-7 text-muted-foreground">
              <b>
                {isEn ? (
                  <>
                    z-score means how far you are from the average of students in the same destination.
                    <br />
                    z-score &gt; 0 means above average, &lt; 0 means below average.
                  </>
                ) : (
                  <>
                    z-score 的值可以理解为：和同去向同学平均水平相比，你高了多少或低了多少
                    <br />
                    z-score &gt; 0 说明高于平均， &lt; 0 说明低于平均
                  </>
                )}
              </b>
              <br />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

