"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, Brain, ChevronDown } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getTopPercentageGPAThreshold } from "@/lib/dashboard-data"
import { getStudentAbilityData } from "@/lib/ability-data"
import { RadarChart } from "@/components/ui/radar-chart"
import { useSimpleAuth } from "@/contexts/simple-auth-context"

// 能力标签（支持中英文）
const abilityLabels = {
  zh: ['逻辑思维', '记忆能力', '理解能力', '应用能力', '创新思维', '表达能力', '分析能力', '综合能力', '实践能力'],
  en: ['Logical Thinking', 'Memory', 'Comprehension', 'Application', 'Innovation', 'Expression', 'Analysis', 'Synthesis', 'Practice']
}

export default function Analysis() {
  const { t } = useLanguage()
  const { currentStudent } = useSimpleAuth()
  
  // 下拉菜单状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('top30');
  
  // GPA门槛值状态
  const [gpaThreshold, setGpaThreshold] = useState<number | null>(null);
  const [loadingGPA, setLoadingGPA] = useState(false);
  
  // 能力数据状态
  const [abilityData, setAbilityData] = useState<number[]>([50, 70, 80, 50, 70, 80, 50, 70, 80]);
  const [loadingAbility, setLoadingAbility] = useState(false);
  
  // 按钮选择状态
  const [selectedButton, setSelectedButton] = useState<'graduation' | 'overseas' | 'domestic'>('graduation');
  
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

  // 获取能力数据
  const loadAbilityData = async () => {
    if (!currentStudent?.id) return;
    
    setLoadingAbility(true);
    try {
      const data = await getStudentAbilityData(currentStudent.id);
      setAbilityData(data);
    } catch (error) {
      console.error('Failed to load ability data:', error);
      setAbilityData([50, 70, 80, 50, 70, 80, 50, 70, 80]);
    } finally {
      setLoadingAbility(false);
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

  // 加载能力数据
  useEffect(() => {
    loadAbilityData();
  }, [currentStudent?.id]);

  const percentageOptions = [
    { key: 'top10', label: t('analysis.tops.top10'), value: 10 },
    { key: 'top20', label: t('analysis.tops.top20'), value: 20 },
    { key: 'top30', label: t('analysis.tops.top30'), value: 30 }
  ];

  // 获取当前语言的能力标签
  const currentLanguage = t('language') === 'en' ? 'en' : 'zh';
  const currentAbilityLabels = abilityLabels[currentLanguage];

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

      {/* 三个交互按钮 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Button
          variant={selectedButton === 'graduation' ? 'default' : 'outline'}
          className={`h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'graduation' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'scale-90'
          }`}
          onClick={() => setSelectedButton('graduation')}
        >
          <span>毕业</span>
          <span className="text-xs text-red-500 mt-1">您还有毕业要求未完成</span>
        </Button>
        <Button
          variant={selectedButton === 'overseas' ? 'default' : 'outline'}
          className={`h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'overseas' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'scale-90'
          }`}
          onClick={() => setSelectedButton('overseas')}
        >
          <span>海外读研</span>
          <span className="text-xs text-blue-500 mt-1">70%</span>
        </Button>
        <Button
          variant={selectedButton === 'domestic' ? 'default' : 'outline'}
          className={`h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'domestic' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'scale-90'
          }`}
          onClick={() => setSelectedButton('domestic')}
        >
          <span>国内读研</span>
          <span className="text-xs text-blue-500 mt-1">70%</span>
        </Button>
      </div>

      {/* 优秀学生模块 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
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

      {/* 能力评估模块 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('analysis.ability.title')}</CardTitle>
            <CardDescription>{t('analysis.ability.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAbility ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-muted-foreground">加载中...</div>
              </div>
                         ) : (
               <RadarChart 
                 data={abilityData} 
                 labels={currentAbilityLabels}
                 className="mt-4"
               />
             )}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-purple-800">
                {t('analysis.ability.overall', { 
                  score: Math.round(abilityData.reduce((acc, item) => acc + item, 0) / abilityData.length) 
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}