"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"

// 测试数据
const barChartData = [
  { month: "一月", desktop: 186, mobile: 80 },
  { month: "二月", desktop: 305, mobile: 200 },
  { month: "三月", desktop: 237, mobile: 120 },
  { month: "四月", desktop: 173, mobile: 190 },
  { month: "五月", desktop: 209, mobile: 130 },
  { month: "六月", desktop: 214, mobile: 140 },
]

const pieChartData = [
  { browser: "Chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "Safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "Firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "Edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "Other", visitors: 90, fill: "var(--color-other)" },
]

const lineChartData = [
  { month: "一月", visits: 12000 },
  { month: "二月", visits: 15000 },
  { month: "三月", visits: 18000 },
  { month: "四月", visits: 14000 },
  { month: "五月", visits: 22000 },
  { month: "六月", visits: 25000 },
]

const areaChartData = [
  { month: "一月", sales: 12000, profit: 4000 },
  { month: "二月", sales: 15000, profit: 5500 },
  { month: "三月", sales: 18000, profit: 6200 },
  { month: "四月", sales: 14000, profit: 4800 },
  { month: "五月", sales: 22000, profit: 8200 },
  { month: "六月", sales: 25000, profit: 9800 },
]

const radarChartData = [
  { subject: "数学", A: 120, B: 110, fullMark: 150 },
  { subject: "语文", A: 98, B: 130, fullMark: 150 },
  { subject: "英语", A: 86, B: 130, fullMark: 150 },
  { subject: "物理", A: 99, B: 100, fullMark: 150 },
  { subject: "化学", A: 85, B: 90, fullMark: 150 },
  { subject: "生物", A: 65, B: 85, fullMark: 150 },
]

// 图表配置
const barChartConfig = {
  desktop: {
    label: "桌面端",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "移动端",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const pieChartConfig = {
  visitors: {
    label: "访问者",
  },
  chrome: {
    label: "Chrome",
    color: "hsl(var(--chart-1))",
  },
  safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
  firefox: {
    label: "Firefox",
    color: "hsl(var(--chart-3))",
  },
  edge: {
    label: "Edge",
    color: "hsl(var(--chart-4))",
  },
  other: {
    label: "其他",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

const lineChartConfig = {
  visits: {
    label: "访问量",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const areaChartConfig = {
  sales: {
    label: "销售额",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "利润",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const radarChartConfig = {
  A: {
    label: "学生A",
    color: "hsl(var(--chart-1))",
  },
  B: {
    label: "学生B",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function ChartsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">图表测试</h1>
        <p className="text-muted-foreground">shadcn/ui 图表组件展示与测试</p>
      </div>

      <div className="grid gap-6">
        {/* 柱状图 */}
        <Card>
          <CardHeader>
            <CardTitle>柱状图示例</CardTitle>
            <CardDescription>显示桌面端和移动端月度数据对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
              <BarChart data={barChartData}>
                <CartesianGrid vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Bar 
                  dataKey="desktop" 
                  fill="var(--color-desktop)" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="mobile" 
                  fill="var(--color-mobile)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 饼图 */}
          <Card>
            <CardHeader>
              <CardTitle>饼图示例</CardTitle>
              <CardDescription>浏览器使用情况分布</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={pieChartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="visitors"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                    </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 折线图 */}
          <Card>
            <CardHeader>
              <CardTitle>折线图示例</CardTitle>
              <CardDescription>月度访问量趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={lineChartConfig} className="h-[250px] w-full">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                    <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="var(--color-visits)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-visits)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* 面积图 */}
        <Card>
          <CardHeader>
            <CardTitle>面积图示例</CardTitle>
            <CardDescription>销售额与利润对比趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={areaChartConfig} className="h-[300px] w-full">
              <AreaChart data={areaChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stackId="1"
                  stroke="var(--color-sales)" 
                  fill="var(--color-sales)"
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stackId="1"
                  stroke="var(--color-profit)" 
                  fill="var(--color-profit)"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 雷达图 */}
        <Card>
          <CardHeader>
            <CardTitle>雷达图示例</CardTitle>
            <CardDescription>学生各科成绩对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radarChartConfig} className="h-[300px] w-full">
              <RadarChart data={radarChartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 150]} 
                  tick={false}
                />
                <Radar 
                  name="学生A" 
                  dataKey="A" 
                  stroke="var(--color-A)" 
                  fill="var(--color-A)" 
                  fillOpacity={0.3}
                />
                <Radar 
                  name="学生B" 
                  dataKey="B" 
                  stroke="var(--color-B)" 
                  fill="var(--color-B)" 
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 特性展示 */}
        <Card>
          <CardHeader>
            <CardTitle>图表特性</CardTitle>
            <CardDescription>shadcn/ui 图表组件的主要特性</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">🎨 主题适配</h4>
                <p className="text-sm text-muted-foreground">
                  自动适配明暗主题，支持自定义颜色配置
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">📱 响应式设计</h4>
                <p className="text-sm text-muted-foreground">
                  自适应容器大小，在不同设备上完美显示
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">🔧 高度可定制</h4>
                <p className="text-sm text-muted-foreground">
                  基于 Recharts 构建，保持完整的自定义能力
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">♿ 无障碍支持</h4>
                <p className="text-sm text-muted-foreground">
                  内置无障碍支持，提供键盘导航和屏幕阅读器支持
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">💫 交互体验</h4>
                <p className="text-sm text-muted-foreground">
                  丰富的交互效果，包括悬停、点击等事件处理
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">🚀 React 19 兼容</h4>
                <p className="text-sm text-muted-foreground">
                  完全兼容 React 19，享受最新特性
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}