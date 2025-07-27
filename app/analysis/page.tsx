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
  const [selectedButton, setSelectedButton] = useState<'graduation' | 'overseas' | 'domestic' | null>(null);
  
  // 毕业要求状态
  const [graduationRequirements, setGraduationRequirements] = useState({
    credits: { required: 160, earned: 145, completed: false },
    gpa: { required: 2.0, current: 3.2, completed: true },
    thesis: { completed: false },
    certificates: { completed: false },
    military: { required: 2, earned: 1, completed: false },
    political: { required: 16, earned: 12, completed: false },
    innovation: { required: 2, earned: 1, completed: false }
  });
  
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  // 概率数据状态
  const [probabilityData, setProbabilityData] = useState<{
    proba_1: number | null;
    proba_2: number | null;
  } | null>(null);
  const [loadingProbability, setLoadingProbability] = useState(false);
  
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

  // 处理毕业要求编辑
  const handleGraduationEdit = (requirementKey: keyof typeof graduationRequirements) => {
    setSubmitting(true);
    setShowNotification(true);
    
    // 仅显示提示，不改变实际状态
    setTimeout(() => {
      setSubmitting(false);
      setIsEditing(false);
    }, 1000); // 1秒后退出编辑模式，但提示继续显示
  };

  // 获取概率数据
  const loadProbabilityData = async () => {
    if (!currentStudent?.id) return;
    
    setLoadingProbability(true);
    try {
      const response = await fetch('/api/probability-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: currentStudent.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setProbabilityData(data);
      } else {
        setProbabilityData(null);
      }
    } catch (error) {
      console.error('Failed to load probability data:', error);
      setProbabilityData(null);
    } finally {
      setLoadingProbability(false);
    }
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

  // 加载概率数据
  useEffect(() => {
    loadProbabilityData();
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
      <div className="mb-6 grid grid-cols-3 gap-2 md:gap-4">
        <Button
          variant={selectedButton === 'graduation' ? 'default' : 'outline'}
          className={`h-22 md:h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'graduation' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'hover:scale-95'
          }`}
          onClick={() => setSelectedButton('graduation')}
        >
          <span>毕业</span>
          <span className="text-xs text-red-500 mt-1 px-1 text-center leading-tight break-words whitespace-normal">
            您还有毕业要求未完成
          </span>
        </Button>
        <Button
          variant={selectedButton === 'overseas' ? 'default' : 'outline'}
          className={`h-22 md:h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'overseas' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'hover:scale-95'
          }`}
          onClick={() => setSelectedButton('overseas')}
        >
          <span>海外读研</span>
          <span className="text-xs text-blue-500 mt-1">
            {loadingProbability ? '加载中...' : 
             probabilityData && probabilityData.proba_2 !== null ? 
             `${(probabilityData.proba_2 * 100).toFixed(1)}%` : 
             '暂无数据'}
          </span>
        </Button>
        <Button
          variant={selectedButton === 'domestic' ? 'default' : 'outline'}
          className={`h-22 md:h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'domestic' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'hover:scale-95'
          }`}
          onClick={() => setSelectedButton('domestic')}
        >
          <span>国内读研</span>
          <span className="text-xs text-blue-500 mt-1">
            {loadingProbability ? '加载中...' : 
             probabilityData && probabilityData.proba_1 !== null ? 
             `${(probabilityData.proba_1 * 100).toFixed(1)}%` : 
             '暂无数据'}
          </span>
        </Button>
      </div>

      {/* 平均成绩模块 - 仅在非毕业状态显示 */}
      {selectedButton !== 'graduation' && (
        <div className="mb-6">
          <Card>
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
      )}

      {/* 能力评估模块 - 仅在非毕业状态显示 */}
      {selectedButton !== 'graduation' && (
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
      )}

      {/* 毕业要求模块 - 仅在毕业状态显示 */}
      {selectedButton === 'graduation' && (
        <div className="mb-6">
          <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>{t('analysis.graduation.title')}</CardTitle>
              <CardDescription>{t('analysis.graduation.description')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={submitting}
              className="h-8 px-3 text-sm"
            >
              {isEditing ? '取消编辑' : '编辑'}
            </Button>
          </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 学分要求 - 仅显示未完成的 */}
                {!graduationRequirements.credits.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.credits')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('credits')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.credits', { 
                        required: graduationRequirements.credits.required, 
                        earned: graduationRequirements.credits.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.credits.earned / graduationRequirements.credits.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* GPA要求 - 仅显示未完成的 */}
                {!graduationRequirements.gpa.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.gpa')}</h3>
                      <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                        {t('analysis.graduation.pending')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.gpa', { 
                        required: graduationRequirements.gpa.required, 
                        current: graduationRequirements.gpa.current 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.gpa.current / graduationRequirements.gpa.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* 毕业论文 - 仅显示未完成的 */}
                {!graduationRequirements.thesis.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.thesis')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('thesis')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.thesis')}
                    </p>
                  </div>
                )}

                {/* 证书要求 - 仅显示未完成的 */}
                {!graduationRequirements.certificates.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.certificates')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('certificates')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.certificates')}
                    </p>
                  </div>
                )}



                {/* 思政课程 - 仅显示未完成的 */}
                {!graduationRequirements.political.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.political')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('political')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.political', { 
                        required: graduationRequirements.political.required, 
                        earned: graduationRequirements.political.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.political.earned / graduationRequirements.political.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* 军训学分 - 仅显示未完成的 */}
                {!graduationRequirements.military.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.military')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('military')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.military', { 
                        required: graduationRequirements.military.required, 
                        earned: graduationRequirements.military.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.military.earned / graduationRequirements.military.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* 创新创业学分 - 仅显示未完成的 */}
                {!graduationRequirements.innovation.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.innovation')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('innovation')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.innovation', { 
                        required: graduationRequirements.innovation.required, 
                        earned: graduationRequirements.innovation.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.innovation.earned / graduationRequirements.innovation.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 悬浮提示窗 */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50 md:scale-150 md:origin-bottom-right">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">提交成功</p>
              <p className="text-sm text-gray-600 mt-1">已提交修改，请您耐心等待后台反馈。</p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}