"use client"

import { useState, useEffect, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { X, Trophy, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

// 竞赛选项接口
interface CompetitionOption {
  region: string
  level: string
  name: string
  // 奖项等级竞赛的字段
  premier_prize?: number
  first_prize?: number
  second_prize?: number
  third_prize?: number
  // 排名竞赛的字段
  ranked_first?: number
  ranked_second?: number
  ranked_third?: number
  ranked_fourth?: number
  ranked_fifth?: number
  ranked_sixth?: number
}

// 竞赛记录接口
interface CompetitionRecord {
  id?: string
  competition_region: string
  competition_level: string
  competition_name: string
  bupt_student_id: string
  full_name: string
  class: string
  note: string
  score: number
  colorIndex: number
  award_type?: 'prize' | 'ranking'
  award_value?: string
}

interface CompetitionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (record: CompetitionRecord) => Promise<void> | void
  editingRecord?: CompetitionRecord | null
  studentId: string
  studentName: string
  loading?: boolean
}

export default function CompetitionForm({
  isOpen,
  onClose,
  onSubmit,
  editingRecord,
  studentId,
  studentName,
  loading = false
}: CompetitionFormProps) {
  const { t } = useLanguage()
  const [competitionOptions, setCompetitionOptions] = useState<{
    prizeBasedCompetitions: CompetitionOption[]
    rankingBasedCompetitions: CompetitionOption[]
  }>({
    prizeBasedCompetitions: [],
    rankingBasedCompetitions: []
  })
  
  const [selectedRegion, setSelectedRegion] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedCompetition, setSelectedCompetition] = useState("")
  const [selectedClass, setSelectedClass] = useState("")
  const [awardType, setAwardType] = useState<'prize' | 'ranking'>('prize')
  const [awardValue, setAwardValue] = useState("")
  const [note, setNote] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})

  // 生成班级选项（1-24班）
  const classOptions = Array.from({ length: 24 }, (_, i) => `${i + 1}班`)

  // 获取竞赛选项
  useEffect(() => {
    if (isOpen) {
      fetchCompetitionOptions()
    }
  }, [isOpen])

  // 初始化编辑数据
  useEffect(() => {
    if (editingRecord) {
      setSelectedRegion(editingRecord.competition_region)
      setSelectedLevel(editingRecord.competition_level)
      setSelectedCompetition(editingRecord.competition_name)
      setSelectedClass(editingRecord.class)
      setNote(editingRecord.note || "")
      setAwardType(editingRecord.award_type || 'prize')
      setAwardValue(editingRecord.award_value || "")
    } else {
      resetForm()
    }
  }, [editingRecord, isOpen])

  const fetchCompetitionOptions = async () => {
    try {
      setFormLoading(true)
      const response = await fetch('/api/competition-options')
      const result = await response.json()
      
      if (result.success) {
        setCompetitionOptions(result.data)
      } else {
        console.error('获取竞赛选项失败:', result.message)
      }
    } catch (error) {
      console.error('获取竞赛选项失败:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedRegion("")
    setSelectedLevel("")
    setSelectedCompetition("")
    setSelectedClass("")
    setAwardType('prize')
    setAwardValue("")
    setNote("")
    setFormErrors({})
  }

  // 获取当前选择的竞赛数据（根据奖项类型从对应表查询）
  const getCurrentCompetitionData = () => {
    if (!selectedRegion || !selectedLevel || !selectedCompetition) return null
    
    if (awardType === 'prize') {
      return competitionOptions.prizeBasedCompetitions.find(comp => 
        comp.region === selectedRegion && 
        comp.level === selectedLevel && 
        comp.name === selectedCompetition
      )
    } else if (awardType === 'ranking') {
      return competitionOptions.rankingBasedCompetitions.find(comp => 
        comp.region === selectedRegion && 
        comp.level === selectedLevel && 
        comp.name === selectedCompetition
      )
    }
    
    return null
  }

  // 获取可用的地区选项
  const getRegionOptions = () => {
    const allCompetitions = [...competitionOptions.prizeBasedCompetitions, ...competitionOptions.rankingBasedCompetitions]
    const regions = [...new Set(allCompetitions.map(comp => comp.region))]
    return regions.sort()
  }

  // 获取可用的级别选项
  const getLevelOptions = () => {
    if (!selectedRegion) return []
    const allCompetitions = [...competitionOptions.prizeBasedCompetitions, ...competitionOptions.rankingBasedCompetitions]
    const levels = [...new Set(allCompetitions
      .filter(comp => comp.region === selectedRegion)
      .map(comp => comp.level)
    )]
    return levels.sort()
  }

  // 获取可用的竞赛名称选项
  const getCompetitionNameOptions = () => {
    if (!selectedRegion || !selectedLevel) return []
    const allCompetitions = [...competitionOptions.prizeBasedCompetitions, ...competitionOptions.rankingBasedCompetitions]
    const names = [...new Set(allCompetitions
      .filter(comp => comp.region === selectedRegion && comp.level === selectedLevel)
      .map(comp => comp.name)
    )]
    return names.sort()
  }

  // 检查当前选择的竞赛是否支持指定的奖项类型
  const isAwardTypeAvailable = (type: 'prize' | 'ranking') => {
    if (!selectedRegion || !selectedLevel || !selectedCompetition) return false
    
    const prizeExists = competitionOptions.prizeBasedCompetitions.some(comp => 
      comp.region === selectedRegion && comp.level === selectedLevel && comp.name === selectedCompetition
    )
    
    const rankingExists = competitionOptions.rankingBasedCompetitions.some(comp => 
      comp.region === selectedRegion && comp.level === selectedLevel && comp.name === selectedCompetition
    )
    
    if (type === 'prize') {
      return prizeExists
    } else {
      return rankingExists
    }
  }
  
  // 获取当前竞赛可用的奖项类型
  const getAvailableAwardTypes = () => {
    const prizeAvailable = isAwardTypeAvailable('prize')
    const rankingAvailable = isAwardTypeAvailable('ranking')
    
    return {
      prize: prizeAvailable,
      ranking: rankingAvailable,
      both: prizeAvailable && rankingAvailable,
      single: (prizeAvailable && !rankingAvailable) || (!prizeAvailable && rankingAvailable)
    }
  }

  // 获取奖项选项
  const getAwardOptions = () => {
    if (awardType === 'prize') {
      return [
        { value: 'premier_prize', label: t('profile.competitions.award.premier_prize') },
        { value: 'first_prize', label: t('profile.competitions.award.first_prize') },
        { value: 'second_prize', label: t('profile.competitions.award.second_prize') },
        { value: 'third_prize', label: t('profile.competitions.award.third_prize') }
      ]
    } else {
      return [
        { value: 'ranked_first', label: t('profile.competitions.award.ranked_first') },
        { value: 'ranked_second', label: t('profile.competitions.award.ranked_second') },
        { value: 'ranked_third', label: t('profile.competitions.award.ranked_third') },
        { value: 'ranked_fourth', label: t('profile.competitions.award.ranked_fourth') },
        { value: 'ranked_fifth', label: t('profile.competitions.award.ranked_fifth') },
        { value: 'ranked_sixth', label: t('profile.competitions.award.ranked_sixth') }
      ]
    }
  }

  // 判断是否应该显示"视当年情况而定"的提示
  const shouldShowYearlyDecision = () => {
    // 只有"北京市大学生科学研究与创业行动计划成果展"的一二三等奖才显示"视当年情况而定"
    if (selectedCompetition === "北京市大学生科学研究与创业行动计划成果展") {
      return awardType === 'prize' && ['first_prize', 'second_prize', 'third_prize'].includes(awardValue)
    }
    return false
  }

  // 计算预览分数
  const getPreviewScore = () => {
    const currentComp = getCurrentCompetitionData()
    if (!currentComp || !awardValue) return null
    
    const score = (currentComp as any)[awardValue]
    return score || 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErrors({})

    // 验证表单
    const errors: {[key: string]: string} = {}
    if (!selectedRegion) errors.region = t('profile.competitions.form.error.region')
    if (!selectedLevel) errors.level = t('profile.competitions.form.error.level')
    if (!selectedCompetition) errors.competition = t('profile.competitions.form.error.name')
    if (!selectedClass) errors.class = t('profile.competitions.form.error.class')
    if (!awardValue) errors.award = t('profile.competitions.form.error.award')

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const record: CompetitionRecord = {
      id: editingRecord?.id,
      competition_region: selectedRegion,
      competition_level: selectedLevel,
      competition_name: selectedCompetition,
      bupt_student_id: studentId,
      full_name: studentName,
      class: selectedClass,
      note: note.trim(),
      score: getPreviewScore() || 0,
      colorIndex: editingRecord?.colorIndex || Math.floor(Math.random() * 10),
      award_type: awardType,
      award_value: awardValue
    }

    await onSubmit(record)
  }

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {editingRecord ? t('profile.competitions.form.edit') : t('profile.competitions.form.title')}
          </h3>
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {formLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('profile.competitions.form.loading')}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* 地区选择 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.region')}</label>
                <select 
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value)
                    setSelectedLevel("")
                    setSelectedCompetition("")
                    setAwardValue("")
                  }}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.region ? 'border-red-500' : ''}`}
                >
                  <option value="">{t('profile.competitions.form.region.placeholder')}</option>
                  {getRegionOptions().map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                {formErrors.region && <p className="text-red-500 text-sm mt-1">{formErrors.region}</p>}
              </div>

              {/* 级别选择 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.level')}</label>
                <select 
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value)
                    setSelectedCompetition("")
                    setAwardValue("")
                  }}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.level ? 'border-red-500' : ''}`}
                  disabled={!selectedRegion}
                >
                  <option value="">{t('profile.competitions.form.level.placeholder')}</option>
                  {getLevelOptions().map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {formErrors.level && <p className="text-red-500 text-sm mt-1">{formErrors.level}</p>}
              </div>

              {/* 竞赛名称选择 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.name')}</label>
                <select 
                  value={selectedCompetition}
                  onChange={(e) => {
                    setSelectedCompetition(e.target.value)
                    setAwardValue("")
                    
                    // 在选择竞赛名称后，自动检测并设置奖项类型
                    if (e.target.value) {
                      // 需要先更新状态，然后在下一个tick检查可用类型
                      setTimeout(() => {
                        const updatedPrizeAvailable = competitionOptions.prizeBasedCompetitions.some(comp => 
                          comp.region === selectedRegion && comp.level === selectedLevel && comp.name === e.target.value
                        )
                        const updatedRankingAvailable = competitionOptions.rankingBasedCompetitions.some(comp => 
                          comp.region === selectedRegion && comp.level === selectedLevel && comp.name === e.target.value
                        )
                        
                        // 如果只有一种类型可用，自动选择
                        if (updatedPrizeAvailable && !updatedRankingAvailable) {
                          setAwardType('prize')
                        } else if (!updatedPrizeAvailable && updatedRankingAvailable) {
                          setAwardType('ranking')
                        }
                        // 如果两种都可用或都不可用，保持当前选择
                      }, 0)
                    }
                  }}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.competition ? 'border-red-500' : ''}`}
                  disabled={!selectedLevel}
                >
                  <option value="">{t('profile.competitions.form.name.placeholder')}</option>
                  {getCompetitionNameOptions().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {formErrors.competition && <p className="text-red-500 text-sm mt-1">{formErrors.competition}</p>}
              </div>

              {/* 班级选择 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.class')}</label>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.class ? 'border-red-500' : ''}`}
                >
                  <option value="">{t('profile.competitions.form.class.placeholder')}</option>
                  {classOptions.map(className => (
                    <option key={className} value={className}>{t('profile.common.class.option', { num: parseInt(className) })}</option>
                  ))}
                </select>
                {formErrors.class && <p className="text-red-500 text-sm mt-1">{formErrors.class}</p>}
              </div>

              {/* 奖项类型选择 */}
              {selectedCompetition && (() => {
                const availableTypes = getAvailableAwardTypes()
                
                // 如果只有一种类型可用，显示为信息提示而不是选择器
                if (availableTypes.single) {
                  const singleType = availableTypes.prize ? 'prize' : 'ranking'
                  const typeLabel = singleType === 'prize' ? t('profile.competitions.form.award.type.prize') : t('profile.competitions.form.award.type.ranking')
                  
                  return (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.award.type')}</label>
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="text-blue-800 text-sm">
                          {t('profile.competitions.form.award.type.single', { type: typeLabel })}
                        </span>
                      </div>
                    </div>
                  )
                }
                
                // 如果两种类型都可用，显示选择器
                if (availableTypes.both) {
                  return (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.award.type')}</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="awardType"
                            value="prize"
                            checked={awardType === 'prize'}
                            onChange={(e) => {
                              setAwardType(e.target.value as 'prize')
                              setAwardValue("")
                            }}
                            className="mr-2"
                          />
                          {t('profile.competitions.form.award.type.prize')}
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="awardType"
                            value="ranking"
                            checked={awardType === 'ranking'}
                            onChange={(e) => {
                              setAwardType(e.target.value as 'ranking')
                              setAwardValue("")
                            }}
                            className="mr-2"
                          />
                          {t('profile.competitions.form.award.type.ranking')}
                        </label>
                      </div>
                    </div>
                  )
                }
                
                // 如果都不可用，显示错误提示
                return (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.award.type')}</label>
                    <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                      <span className="text-red-800 text-sm">
                        {t('profile.competitions.form.award.type.none')}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* 具体奖项/排名选择 */}
              {selectedCompetition && (getAvailableAwardTypes().prize || getAvailableAwardTypes().ranking) ? (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {awardType === 'prize' ? t('profile.competitions.form.award.label.prize') : t('profile.competitions.form.award.label.ranking')}
                  </label>
                  <select 
                    value={awardValue}
                    onChange={(e) => setAwardValue(e.target.value)}
                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.award ? 'border-red-500' : ''}`}
                  >
                    <option value="">{awardType === 'prize' ? t('profile.competitions.form.award.placeholder.prize') : t('profile.competitions.form.award.placeholder.ranking')}</option>
                    {getAwardOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {formErrors.award && <p className="text-red-500 text-sm mt-1">{formErrors.award}</p>}
                </div>
              ) : null}

              {/* 分数预览 */}
              {awardValue && selectedCompetition && (getAvailableAwardTypes().prize || getAvailableAwardTypes().ranking) && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">{t('profile.competitions.form.preview.label')}</span>
                    <span className="font-semibold text-blue-900">
                      {shouldShowYearlyDecision() ? t('profile.competitions.form.preview.dependent') : t('profile.competitions.form.preview.points', { score: getPreviewScore() })}
                    </span>
                  </div>
                </div>
              )}

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.note')}</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder={t('profile.competitions.form.note.placeholder')}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {t('profile.competitions.form.cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t('profile.competitions.form.save')}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
