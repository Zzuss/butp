"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getTopPercentageGPAThreshold } from "@/lib/dashboard-data"
import { getStudentAbilityData } from "@/lib/ability-data"
import { RadarChart } from "@/components/ui/radar-chart"
import { SimplePDFExport } from '@/components/pdf/SimplePDFExport'
import { useAuth } from "@/contexts/AuthContext"

// 能力标签（支持中英文）
const abilityLabels = {
  zh: ['公共课程', '实践课程', '数学科学', '政治课程', '基础学科', '创新课程', '英语课程', '基础专业', '专业课程'],
  en: ['Public Courses', 'Practice Courses', 'Math & Science', 'Political Courses', 'Basic Subjects', 'Innovation Courses', 'English Courses', 'Basic Major', 'Major Courses']
}

export default function Analysis() {
  const { t, language } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  
  // 下拉菜单状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('top30');
  
  // GPA门槛值状态
  const [gpaThreshold, setGpaThreshold] = useState<number | null>(null);
  const [loadingGPA, setLoadingGPA] = useState(false);

  // 按钮选择状态
  const [selectedButton, setSelectedButton] = useState<'graduation' | 'overseas' | 'domestic' | null>(null);

  // 能力数据状态
  const [abilityData, setAbilityData] = useState<number[]>([50, 70, 80, 50, 70, 80, 50, 70, 80]);
  const [loadingAbility, setLoadingAbility] = useState(false);

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

  // 概率数据状态
  const [probabilityData, setProbabilityData] = useState<{proba_1: number | null, proba_2: number | null} | null>(null);
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

  // 加载能力数据
  const loadAbilityData = async () => {
    if (!user?.userHash) return;
    
    setLoadingAbility(true);
    try {
      const data = await getStudentAbilityData(user.userHash);
      setAbilityData(data);
    } catch (error) {
      console.error('Failed to load ability data:', error);
      // 保持默认值，不重新设置
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
    
    // 模拟编辑操作
    setTimeout(() => {
      setGraduationRequirements(prev => ({
        ...prev,
        [requirementKey]: {
          ...prev[requirementKey],
          completed: true
        }
      }));
      setSubmitting(false);
      setIsEditing(false);
    }, 1000);
  };

  // 加载概率数据
  const loadProbabilityData = async () => {
    if (!user?.userHash) return;
    
    setLoadingProbability(true);
    try {
      const response = await fetch(`/api/predict-possibility?studentHash=${user.userHash}`);
      if (response.ok) {
        const data = await response.json();
        setProbabilityData(data);
      }
    } catch (error) {
      console.error('Failed to load probability data:', error);
    } finally {
      setLoadingProbability(false);
    }
  };

  // 初始加载和选项变化时更新GPA门槛值
  useEffect(() => {
    if (authLoading) return;
    
    const percentageOptions = [
      { key: 'top10', label: t('analysis.tops.top10'), value: 10 },
      { key: 'top20', label: t('analysis.tops.top20'), value: 20 },
      { key: 'top30', label: t('analysis.tops.top30'), value: 30 }
    ];
    
    const selectedPercentage = percentageOptions.find(opt => opt.key === selectedOption)?.value || 30;
    loadGPAThreshold(selectedPercentage);
  }, [selectedOption, t, authLoading]);

  // 加载能力数据
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.userHash) {
      loadAbilityData();
    }
  }, [user?.userHash, authLoading]);

  // 加载概率数据
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.userHash) {
      loadProbabilityData();
    }
  }, [user?.userHash, authLoading]);

  const percentageOptions = [
    { key: 'top10', label: t('analysis.tops.top10'), value: 10 },
    { key: 'top20', label: t('analysis.tops.top20'), value: 20 },
    { key: 'top30', label: t('analysis.tops.top30'), value: 30 }
  ];

  // 获取当前语言的能力标签
  const currentAbilityLabels = abilityLabels[language as keyof typeof abilityLabels] || abilityLabels.zh;

  // 如果未登录，显示登录提示
  if (!authLoading && !user?.isLoggedIn) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('analysis.title')}</h1>
          <p className="text-muted-foreground">{t('analysis.login.required')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('analysis.title')}</h1>
          <p className="text-muted-foreground">{t('analysis.description')}</p>
        </div>
        <SimplePDFExport 
          pageTitle="学习分析报告"
          fileName={`learning_analysis_${new Date().toISOString().split('T')[0]}.pdf`}
          contentSelector=".analysis-content"
        />
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
          onClick={() => setSelectedButton(selectedButton === 'graduation' ? null : 'graduation')}
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
           onClick={() => setSelectedButton(selectedButton === 'overseas' ? null : 'overseas')}
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
           onClick={() => setSelectedButton(selectedButton === 'domestic' ? null : 'domestic')}
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

      <div className="analysis-content">
        {/* 初始界面内容 - 仅在未选择按钮时显示 */}
        {!selectedButton && (
          <>
            {/* GPA门槛值分析 - 独立卡片，填满整个宽度 */}
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

            {/* 能力评估雷达图 - 在2列网格中显示 */}
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

              {/* 培养方案卡片 - 填满右边空缺 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>培养方案</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm"
                  >
                    查看完整方案
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="text-lg font-medium mb-2">专业培养方案</div>
                    <p className="text-sm text-muted-foreground">
                      点击查看完整的专业培养方案
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* 毕业要求检查界面 - 当选择毕业按钮时显示 */}
        {selectedButton === 'graduation' && (
          <div className="mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>毕业要求检查</CardTitle>
                  <CardDescription>检查您的毕业要求完成情况</CardDescription>
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
                        <h3 className="font-medium">学分要求</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.credits.required} 学分，已获得 {graduationRequirements.credits.earned} 学分
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
                        <h3 className="font-medium">GPA要求</h3>
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          待完成
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        需要 GPA {graduationRequirements.gpa.required}，当前 GPA {graduationRequirements.gpa.current}
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
                        <h3 className="font-medium">毕业论文</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要完成毕业论文并通过答辩
                      </p>
                    </div>
                  )}

                  {/* 证书要求 - 仅显示未完成的 */}
                  {!graduationRequirements.certificates.completed && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">证书要求</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要获得相关专业证书
                      </p>
                    </div>
                  )}

                  {/* 思政课程 - 仅显示未完成的 */}
                  {!graduationRequirements.political.completed && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">思政课程</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.political.required} 学分，已获得 {graduationRequirements.political.earned} 学分
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
                        <h3 className="font-medium">军训学分</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.military.required} 学分，已获得 {graduationRequirements.military.earned} 学分
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
                        <h3 className="font-medium">创新创业学分</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.innovation.required} 学分，已获得 {graduationRequirements.innovation.earned} 学分
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

        {/* 海外读研分析界面 - 仿照模板设计 */}
        {selectedButton === 'overseas' && (
          <div className="space-y-6">
            {/* 目标分数显示 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-center">
                    <p className="text-blue-800 font-medium">
                      最低目标分数{' '}
                      <span className="text-blue-600 font-bold">
                        --
                      </span>
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled
                  >
                    查看所有课程数据
                  </Button>
                </div>
              </div>
            </div>

            {/* 课程成绩表格 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-medium">课程成绩</CardTitle>
                    <CardDescription>查看和修改您的课程成绩</CardDescription>
                  </div>
                  <div className="flex-1 flex justify-center items-center gap-4">
                    <Button 
                      variant="default"
                      size="lg"
                      className="px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl scale-105"
                      disabled
                    >
                      修改未来
                    </Button>
                  </div>
                  <div className="w-32 flex justify-end">
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-muted-foreground">课程成绩数据加载中...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 国内读研分析界面 - 保持原有的占位符 */}
        {selectedButton === 'domestic' && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">国内读研分析</CardTitle>
                <CardDescription>分析您的国内读研可能性</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-muted-foreground">国内读研分析功能开发中...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}