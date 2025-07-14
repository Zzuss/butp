"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, Brain, Check, Plus, X, ChevronDown } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getTopPercentageGPAThreshold } from "@/lib/dashboard-data"

const subjectAnalysis = [
  { subject: '数学', current: 95, target: 98, gap: 3 },
  { subject: '语文', current: 87, target: 92, gap: 5 },
  { subject: '英语', current: 92, target: 95, gap: 3 },
  { subject: '物理', current: 89, target: 94, gap: 5 },
  { subject: '化学', current: 91, target: 96, gap: 5 },
  { subject: '生物', current: 88, target: 93, gap: 5 },
];

const abilityRadar = [
  { ability: '逻辑思维', abilityKey: 'analysis.ability.logical', score: 85 },
  { ability: '记忆能力', abilityKey: 'analysis.ability.memory', score: 78 },
  { ability: '理解能力', abilityKey: 'analysis.ability.comprehension', score: 92 },
  { ability: '应用能力', abilityKey: 'analysis.ability.application', score: 88 },
  { ability: '创新思维', abilityKey: 'analysis.ability.innovation', score: 75 },
  { ability: '表达能力', abilityKey: 'analysis.ability.expression', score: 82 },
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
  const { t } = useLanguage()
  
  // 下拉菜单状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('top30');
  
  // GPA门槛值状态
  const [gpaThreshold, setGpaThreshold] = useState<number | null>(null);
  const [loadingGPA, setLoadingGPA] = useState(false);
  
  // 获取GPA门槛值
  const loadGPAThreshold = async (percentage: number) => {
    setLoadingGPA(true);
    try {
      const threshold = await getTopPercentageGPAThreshold(percentage);
      setGpaThreshold(threshold);
    } catch (error) {
      console.error('Failed to load GPA threshold:', error);
      setGpaThreshold(null);
    } finally {
      setLoadingGPA(false);
    }
  };

  // 处理下拉菜单选择
  const handleOptionSelect = (optionKey: string) => {
    setSelectedOption(optionKey);
    setIsDropdownOpen(false);
  };

  // 初始加载和选项变化时更新GPA门槛值
  useEffect(() => {
    const percentageOptions = [
      { key: 'top10', label: t('analysis.tops.top10'), value: 10 },
      { key: 'top20', label: t('analysis.tops.top20'), value: 20 },
      { key: 'top30', label: t('analysis.tops.top30'), value: 30 }
    ];
    
    const selectedPercentage = percentageOptions.find(opt => opt.key === selectedOption)?.value || 30;
    loadGPAThreshold(selectedPercentage);
  }, [selectedOption, t]);

  const percentageOptions = [
    { key: 'top10', label: t('analysis.tops.top10'), value: 10 },
    { key: 'top20', label: t('analysis.tops.top20'), value: 20 },
    { key: 'top30', label: t('analysis.tops.top30'), value: 30 }
  ];

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
        <h1 className="text-3xl font-bold">{t('analysis.title')}</h1>
        <p className="text-muted-foreground">{t('analysis.description')}</p>
      </div>

      {/* 免责声明 */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 text-center">
          {t('disclaimer.data.accuracy')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analysis.efficiency.title')}</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t('analysis.efficiency.desc')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analysis.target.title')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t('analysis.target.desc')}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">{t('analysis.tops.title')}</CardTitle>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="h-7 px-3 text-sm"
              >
                {percentageOptions.find(opt => opt.key === selectedOption)?.label}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  {percentageOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => handleOptionSelect(option.key)}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-lg font-medium mb-2">
                GPA：{loadingGPA ? '计算中...' : (gpaThreshold !== null ? gpaThreshold.toFixed(2) : '暂无数据')}
              </div>
              <p className="text-sm text-muted-foreground">
                {percentageOptions.find(opt => opt.key === selectedOption)?.label} 门槛值
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('analysis.subjects.title')}</CardTitle>
            <CardDescription>{t('analysis.subjects.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectAnalysis.map((item) => (
                <div key={item.subject} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.subject}</span>
                    <span className="text-sm text-muted-foreground">{t('analysis.subjects.gap', { gap: item.gap })}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{t('analysis.subjects.current', { current: item.current })}</span>
                      <span>{t('analysis.subjects.target', { target: item.target })}</span>
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
            <CardTitle>{t('analysis.ability.title')}</CardTitle>
            <CardDescription>{t('analysis.ability.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {abilityRadar.map((item) => (
                <div key={item.ability} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t(item.abilityKey)}</span>
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
                  {t('analysis.ability.overall', { score: Math.round(abilityRadar.reduce((acc, item) => acc + item.score, 0) / abilityRadar.length) })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('analysis.checklist.title')}</CardTitle>
            <CardDescription>{t('analysis.checklist.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 添加新事项 */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder={t('analysis.checklist.add.placeholder')}
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
                  {t('analysis.checklist.completion.rate', { rate: completionRate })}
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
            <CardTitle>{t('analysis.improvement.title')}</CardTitle>
            <CardDescription>{t('analysis.improvement.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {improvementSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{suggestion.category}</h4>
                    <Badge variant={suggestion.priority === "高" ? "destructive" : "secondary"}>
                      {suggestion.priority === "高" ? t('analysis.improvement.priority.high') : t('analysis.improvement.priority.medium')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.issue}</p>
                  <p className="text-sm">{suggestion.suggestion}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('analysis.improvement.estimated.time', { time: suggestion.estimatedTime })}</span>
                    <Button size="sm" variant="outline">
                      {t('analysis.improvement.make.plan')}
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