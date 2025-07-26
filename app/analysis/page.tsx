"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getTopPercentageGPAThreshold } from "@/lib/dashboard-data"
import { getStudentAbilityData, AbilityData } from "@/lib/ability-data"
import { RadarChart } from "@/components/ui/radar-chart"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"











export default function Analysis() {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  
  // 能力数据状态
  const [abilityData, setAbilityData] = useState<AbilityData | null>(null)
  const [loadingAbility, setLoadingAbility] = useState(false)
  
  // 按钮选择状态
  const [selectedButton, setSelectedButton] = useState<string>('')
  
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

  // 获取能力数据
  const loadAbilityData = async (studentId: string) => {
    setLoadingAbility(true)
    try {
      const data = await getStudentAbilityData(studentId)
      setAbilityData(data)
    } catch (error) {
      console.error('Failed to load ability data:', error)
      setAbilityData(null)
    } finally {
      setLoadingAbility(false)
    }
  }

  // 加载能力数据
  useEffect(() => {
    if (user?.userId) {
      loadAbilityData(user.userId)
    }
  }, [user?.userId])

  const [probabilities, setProbabilities] = useState<{ proba_2: number | null, proba_3: number | null }>({ proba_2: null, proba_3: null })
  const [loadingProba, setLoadingProba] = useState(false)

  useEffect(() => {
    async function fetchProbabilities() {
      if (!user?.userId) return
      setLoadingProba(true)
      const { data, error } = await supabase
        .from('cohort_probability')
        .select('proba_2, proba_3')
        .eq('SNH', user.userId)
        .single()
      if (!error && data) {
        setProbabilities({
          proba_2: data.proba_2,
          proba_3: data.proba_3
        })
      } else {
        setProbabilities({ proba_2: null, proba_3: null })
      }
      setLoadingProba(false)
    }
    fetchProbabilities()
  }, [user?.userId])

  // 能力名称中英文映射
  const abilityLabels = language === 'en'
    ? [
        'General Foundation',
        'Practice',
        'Math & Science',
        'Political Literacy',
        'Basic Subjects',
        'Innovation',
        'English',
        'Major Foundation',
        'Major Ability'
      ]
    : [
        '公共基础能力',
        '实践能力',
        '数理科学能力',
        '政治素养',
        '基础学科能力',
        '创新能力',
        '英语能力',
        '专业基础能力',
        '专业能力'
      ]

  // 准备雷达图数据
  const radarData = abilityData
    ? {
        [abilityLabels[0]]: abilityData.current_public,
        [abilityLabels[1]]: abilityData.current_practice,
        [abilityLabels[2]]: abilityData.current_math_science,
        [abilityLabels[3]]: abilityData.current_political,
        [abilityLabels[4]]: abilityData.current_basic_subject,
        [abilityLabels[5]]: abilityData.current_innovation,
        [abilityLabels[6]]: abilityData.current_english,
        [abilityLabels[7]]: abilityData.current_basic_major,
        [abilityLabels[8]]: abilityData.current_major
      }
    : {
        [abilityLabels[0]]: 1,
        [abilityLabels[1]]: 1,
        [abilityLabels[2]]: 1,
        [abilityLabels[3]]: 1,
        [abilityLabels[4]]: 1,
        [abilityLabels[5]]: 1,
        [abilityLabels[6]]: 1,
        [abilityLabels[7]]: 1,
        [abilityLabels[8]]: 1
      }

  // 计算平均分
  const averageScore = abilityData
    ? Math.round(
        (abilityData.current_public + abilityData.current_practice +
          abilityData.current_math_science + abilityData.current_political +
          abilityData.current_basic_subject + abilityData.current_innovation +
          abilityData.current_english + abilityData.current_basic_major +
          abilityData.current_major) /
          9
      )
    : 1


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

      {/* 选择按钮 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Button
          variant={selectedButton === 'graduation' ? 'default' : 'outline'}
          className={`h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${selectedButton === 'graduation' ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-350 hover:text-white scale-110' : 'scale-90'}`}
          onClick={() => setSelectedButton('graduation')}
        >
          <span>毕业</span>
          <span className="text-xs text-red-500 mt-1">您还有毕业要求未完成</span>
        </Button>
        <Button
          variant={selectedButton === 'overseas' ? 'default' : 'outline'}
          className={`h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${selectedButton === 'overseas' ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-350 hover:text-white scale-110' : 'scale-90'}`}
          onClick={() => setSelectedButton('overseas')}
        >
          <span>海外读研</span>
          <span className="text-xs text-blue-500 mt-1">{loadingProba ? '...' : (probabilities.proba_3 !== null ? `${Math.round(probabilities.proba_3 * 100)}%` : '暂无数据')}</span>
        </Button>
        <Button
          variant={selectedButton === 'domestic' ? 'default' : 'outline'}
          className={`h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${selectedButton === 'domestic' ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-350 hover:text-white scale-110' : 'scale-90'}`}
          onClick={() => setSelectedButton('domestic')}
        >
          <span>国内读研</span>
          <span className="text-xs text-blue-500 mt-1">{loadingProba ? '...' : (probabilities.proba_2 !== null ? `${Math.round(probabilities.proba_2 * 100)}%` : '暂无数据')}</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 mb-6">
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

      <div className="grid gap-6 md:grid-cols-1 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('analysis.ability.title')}</CardTitle>
            <CardDescription>{t('analysis.ability.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAbility ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">加载能力数据中...</div>
              </div>
            ) : abilityData && radarData ? (
              <div className="space-y-6">
                {/* 雷达图 */}
                <div className="flex justify-center">
                  <RadarChart data={radarData} width={400} height={400} />
                </div>
                
                {/* 能力详情列表 */}
                <div className="space-y-3">
                  {Object.entries(radarData).map(([ability, score]) => (
                    <div key={ability} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ability}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold w-8">{Math.round(score)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 平均分统计 */}
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-800">
                    综合能力评分：{averageScore} 分
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">暂无能力数据</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  )
}