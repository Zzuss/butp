"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
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

const destinationMeta: Record<
  Destination,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
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

  const meta = destinationMeta[destination];
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
        setError("登录状态失效，请重新登录后查看职业分析。");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `请求失败 (${res.status})`);
      }

      const body = (await res.json()) as CentroidResponse;
      if (controller.signal.aborted) return;
      setData(body);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const message = e instanceof Error ? e.message : "加载失败";
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
    if (!user?.isLoggedIn) return;
    fetchCentroids(destination);
  }, [destination, authLoading, user?.isLoggedIn]);

  useEffect(() => {
    return () => {
      if (requestAbortRef.current) {
        requestAbortRef.current.abort();
      }
    };
  }, []);

  const fetchDomesticBonus = async () => {
    if (!user?.userId) return;
    setMyBonusLoading(true);
    try {
      const res = await fetch(`/api/competition-records?userId=${encodeURIComponent(user.userId)}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        // 无法获取时按 0 处理，避免影响页面主流程
        setDomesticBonus({ competition: 0, paper: 0, patent: 0, total: 0 });
        return;
      }

      const body = (await res.json()) as { success?: boolean; data?: Array<{ score?: number | string }> };
      const rows = body?.success && Array.isArray(body.data) ? body.data : [];
      const competition = rows.reduce((sum, item) => sum + Number(item?.score ?? 0), 0);
      const paper = 0; // 按需求：论文加分先写死为0
      const patent = 0; // 按需求：专利加分先写死为0
      const total = competition + paper + patent;

      setDomesticBonus({
        competition: Number(competition.toFixed(1)),
        paper: Number(paper.toFixed(1)),
        patent: Number(patent.toFixed(1)),
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
        setError("登录状态失效，请重新登录后查看职业分析。");
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
          setStudentInfoText(`--${majorText || "未知专业"}-${userId}`);
        } else {
          setStudentInfoText("学生信息加载失败");
        }
      } catch {
        setStudentInfoText("学生信息加载失败");
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
        setError("登录状态失效，请重新登录后生成画像。");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `生成失败 (${res.status})`);
      }

      const body = (await res.json()) as MyC18Response;
      // 按去向缓存用户画像，切换 tab 后可恢复显示
      setUserProfilesByDestination((prev) => ({ ...prev, [target]: body }));
      setUserProfileVisibilityByDestination((prev) => ({ ...prev, [target]: true }));
      setShowGeneratePrompt(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "生成失败";
      setError(message);
    } finally {
      setGeneratingProfile(false);
    }
  };

  if (!authLoading && !user?.isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">需要先登录</h2>
        <p className="text-muted-foreground mb-4">请先登录后查看职业分析雷达图。</p>
        <Button onClick={() => router.push("/login")}>去登录</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">职业分析</h1>
        <p className="text-muted-foreground mt-1">{loadingStudentInfo ? "正在加载学生信息" : studentInfoText || "学生信息加载失败"}</p>
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
              什么是z-score？
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={destination} onValueChange={(v) => setDestination(v as Destination)}>
            <TabsList>
              <TabsTrigger value="domestic">国内升学</TabsTrigger>
              <TabsTrigger value="abroad">出国留学</TabsTrigger>
              <TabsTrigger value="employment">本科就业</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              数据版本：{data?.statsVersion ?? "-"} | 计算时间：{data?.computationTime ?? "-"}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchCentroids(destination)} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-muted-foreground">正在加载雷达图数据...</div>
          ) : chartData.length === 0 ? (
            <div className="h-[520px] flex items-center justify-center text-muted-foreground">暂无可展示数据</div>
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
                        <span className="text-black">我的画像</span>
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
                  {isCurrentDestinationProfileVisible ? "隐藏我的画像" : "生成我的画像"}
                </Button>
              </div>

              {destination === "domestic" && (
                <div className="order-2 w-full space-y-4 lg:order-1 lg:w-[340px] lg:shrink-0">
                  <div className="rounded-lg border bg-slate-100/90 p-4 shadow-sm">
                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-slate-900">往届加分总览</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">年级</label>
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
                        <label className="mb-1 block text-xs text-slate-600">专业</label>
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
                    <p className="mt-2 text-xs text-slate-600">{overviewData.competition}/{overviewData.totalNumber} 表示：获竞赛加分的人数/总保研人数</p>
                    {overviewLoading ? (
                      <div className="flex h-[190px] items-center justify-center text-sm text-slate-500">往届数据加载中...</div>
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
                                  <div>加分均分：{overviewData.competitionAverageBonus.toFixed(1)}</div>
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
                      <h3 className="text-base font-semibold text-slate-900">我的加分</h3>
                      <p className="mt-1 text-xs text-slate-600">*竞赛加分只做累加，不一定符合学校上限要求</p>
                    </div>
                    {myBonusLoading ? (
                      <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">我的加分加载中...</div>
                    ) : (
                      <div className="mt-2 flex h-[190px] items-end justify-between gap-3">
                        {[
                          { key: "competition", label: "竞赛", value: domesticBonus.competition, unit: "分", color: "bg-emerald-600" },
                          { key: "paper", label: "论文", value: 1, unit: "条", color: "bg-blue-600" },
                          { key: "patent", label: "专利", value: 0, unit: "条", color: "bg-violet-600" },
                        ].map((item) => {
                          const maxVal = Math.max(domesticBonus.competition, 1, 0);
                          const barHeight = item.key === "competition"
                            ? Math.max(12, (item.value / maxVal) * 120)
                            : Math.max(12, item.value > 0 ? 70 : 12);
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
              aria-label="关闭提示卡片"
            >
              <X className="h-4 w-4" />
            </Button>
            <p className="mt-1 text-center text-xl text-muted-foreground">
              填写更多个人信息（如论文发表、竞赛<br/>获奖等）有利于画像生成
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                className="mt-1 h-11 min-w-[112px] justify-center text-center text-base text-black bg-white hover:bg-gray-100"
                onClick={() => generateMyProfile(destination)}
                disabled={generatingProfile}
              >
                {generatingProfile ? "生成中..." : "直接生成"}
              </Button>
              <Button
                className="mt-1 h-11 min-w-[112px] justify-center text-center text-base text-white bg-black hover:bg-black/75"
                onClick={() => {
                  setShowGeneratePrompt(false);
                  router.push("/profile");
                }}
              >
                去填写
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
              aria-label="关闭z-score说明"
            >
              <X className="h-4 w-4" />
            </Button>
            <p className="mt-1 text-xl leading-7 text-muted-foreground">
              <b>z-score 的值可以理解为：和同去向同学平均水平相比，你高了多少或低了多少
              <br />
              z-score &gt; 0 说明高于平均， &lt; 0 说明低于平均</b>
              <br />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

