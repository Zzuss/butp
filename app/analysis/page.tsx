"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Target, Brain, BookOpen, Users, Check, Plus, X } from "lucide-react"

const subjectAnalysis = [
  { subject: '数学', current: 95, target: 98, gap: 3 },
  { subject: '语文', current: 87, target: 92, gap: 5 },
  { subject: '英语', current: 92, target: 95, gap: 3 },
  { subject: '物理', current: 89, target: 94, gap: 5 },
  { subject: '化学', current: 91, target: 96, gap: 5 },
  { subject: '生物', current: 88, target: 93, gap: 5 },
];

const abilityRadar = [
  { ability: '逻辑思维', score: 85 },
  { ability: '记忆能力', score: 78 },
  { ability: '理解能力', score: 92 },
  { ability: '应用能力', score: 88 },
  { ability: '创新思维', score: 75 },
  { ability: '表达能力', score: 82 },
];

const improvementSuggestions = [
  {
    category: "数学",
    issue: "几何证明题正确率较低",
    suggestion: "加强几何定理的理解和应用练习",
    priority: "高",
    estimatedTime: "2周"
  },
  {
    category: "语文",
    issue: "作文立意不够深刻",
    suggestion: "多阅读优秀范文，提升思辨能力",
    priority: "中",
    estimatedTime: "1个月"
  },
  {
    category: "英语",
    issue: "听力理解有待提高",
    suggestion: "每天增加30分钟英语听力练习",
    priority: "中",
    estimatedTime: "3周"
  },
  {
    category: "物理",
    issue: "实验题分析不够准确",
    suggestion: "复习实验原理，多做实验分析题",
    priority: "高",
    estimatedTime: "2周"
  }
];

function Badge({ children, variant = "secondary" }: { children: React.ReactNode, variant?: "secondary" | "outline" | "destructive" }) {
  const baseClass = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  let variantClass = ""
  
  switch (variant) {
    case "outline":
      variantClass = "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      break
    case "destructive":
      variantClass = "bg-destructive text-destructive-foreground hover:bg-destructive/80"
      break
    default:
      variantClass = "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  }
  
  return (
    <div className={`${baseClass} ${variantClass}`}>
      {children}
    </div>
  )
}

// 打卡清单类型定义
type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  timestamp: Date;
};

export default function Analysis() {
  // 打卡清单状态
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', text: '完成数学作业', completed: false, timestamp: new Date() },
    { id: '2', text: '阅读英语文章', completed: false, timestamp: new Date() },
    { id: '3', text: '复习物理笔记', completed: true, timestamp: new Date() },
  ]);
  const [newItemText, setNewItemText] = useState('');

  // 添加新事项
  const addItem = () => {
    if (newItemText.trim() === '') return;
    
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newItemText,
      completed: false,
      timestamp: new Date()
    };
    
    setChecklist([...checklist, newItem]);
    setNewItemText('');
  };

  // 切换完成状态
  const toggleComplete = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  // 删除事项
  const removeItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  // 排序事项：未完成的在前，完成的在后
  const sortedChecklist = [...checklist].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // 计算完成率
  const completionRate = checklist.length > 0 
    ? Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)
    : 100;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">分析模块</h1>
        <p className="text-muted-foreground">深入分析您的学习表现，提供个性化改进建议</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学习效率</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +5% 比上周
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">目标达成率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +3% 比上周
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">弱项科目</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              需要重点关注
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">班级排名</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              上升3名
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>各科目分析</CardTitle>
            <CardDescription>当前成绩与目标对比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectAnalysis.map((item) => (
                <div key={item.subject} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.subject}</span>
                    <span className="text-sm text-muted-foreground">差距: {item.gap}分</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>当前: {item.current}</span>
                      <span>目标: {item.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full relative" 
                        style={{ width: `${(item.current / item.target) * 100}%` }}
                      >
                        <div 
                          className="absolute right-0 w-1 h-2 bg-green-500 rounded-full"
                          style={{ right: `${100 - (item.target / item.target) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>能力评估</CardTitle>
            <CardDescription>各项能力综合评估</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {abilityRadar.map((item) => (
                <div key={item.ability} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.ability}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold w-8">{item.score}</span>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-800">
                  综合能力评分: {Math.round(abilityRadar.reduce((acc, item) => acc + item.score, 0) / abilityRadar.length)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>打卡清单</CardTitle>
            <CardDescription>记录并完成您的日常任务</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 添加新事项 */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="添加新事项..."
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <Button size="sm" onClick={addItem} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 完成率统计 */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  完成率: {completionRate}%
                </div>
              </div>
              
              {/* 事项列表 */}
              <div className="space-y-2">
                {sortedChecklist.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                      item.completed ? 'bg-green-50 border-green-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button 
                        onClick={() => toggleComplete(item.id)}
                        className={`flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center ${
                          item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}
                      >
                        {item.completed && <Check className="h-3 w-3 text-white" />}
                      </button>
                      <span className={`flex-1 truncate ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>改进建议</CardTitle>
            <CardDescription>基于数据分析的个性化建议</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {improvementSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{suggestion.category}</h4>
                    <Badge variant={suggestion.priority === "高" ? "destructive" : "secondary"}>
                      {suggestion.priority}优先级
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.issue}</p>
                  <p className="text-sm">{suggestion.suggestion}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">预计用时: {suggestion.estimatedTime}</span>
                    <Button size="sm" variant="outline">
                      制定计划
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}