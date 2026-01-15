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
  note: string
  score: number
  colorIndex: number
  award_type?: 'prize' | 'ranking'
  award_value?: string
  competition_type?: 'individual' | 'team'
  team_leader_is_bupt?: boolean
  is_main_member?: boolean
  main_members_count?: number
  coefficient?: number
}

interface CompetitionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (record: CompetitionRecord) => Promise<void> | void
  editingRecord?: CompetitionRecord | null
  studentId: string
  studentName: string
  loading?: boolean
  adminMode?: boolean // 管理员模式，允许修改分数
}

export default function CompetitionForm({
  isOpen,
  onClose,
  onSubmit,
  editingRecord,
  studentId,
  studentName,
  loading = false,
  adminMode = false
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
  const [awardType, setAwardType] = useState<'prize' | 'ranking'>('prize')
  const [awardValue, setAwardValue] = useState("")
  const [note, setNote] = useState("")
  const [adminScore, setAdminScore] = useState<string>("") // 管理员模式下的分数
  const [formLoading, setFormLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  
  // 新增团体竞赛相关状态
  const [competitionType, setCompetitionType] = useState<'individual' | 'team'>('individual')
  const [teamLeaderIsBupt, setTeamLeaderIsBupt] = useState<boolean | null>(null)
  const [isMainMember, setIsMainMember] = useState<boolean | null>(null)
  const [mainMembersCount, setMainMembersCount] = useState<number>(1)

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
      setNote(editingRecord.note || "")
      setAwardType(editingRecord.award_type || 'prize')
      setAwardValue(editingRecord.award_value || "")
      setCompetitionType(editingRecord.competition_type || 'individual')
      setTeamLeaderIsBupt(editingRecord.team_leader_is_bupt ?? null)
      setIsMainMember(editingRecord.is_main_member ?? null)
      setMainMembersCount(editingRecord.main_members_count || 1)
      setAdminScore(editingRecord.score?.toString() || "0") // 设置管理员分数
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
    setAwardType('prize')
    setAwardValue("")
    setNote("")
    setAdminScore("0")
    setFormErrors({})
    setCompetitionType('individual')
    setTeamLeaderIsBupt(null)
    setIsMainMember(null)
    setMainMembersCount(1)
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

  // 计算系数
  const calculateCoefficient = () => {
    // 排名类竞赛始终使用系数1（不支持团体模式）
    if (isRankingCompetition()) return 1
    
    if (competitionType === 'individual') return 1
    if (competitionType === 'team' && mainMembersCount >= 1 && mainMembersCount <= 6) {
      return 1 + (mainMembersCount - 1) * 0.6
    }
    return 1
  }

  // 计算预览分数
  const getPreviewScore = () => {
    const currentComp = getCurrentCompetitionData()
    if (!currentComp || !awardValue) return null
    
    const baseScore = (currentComp as any)[awardValue] || 0
    const coefficient = calculateCoefficient()
    
    // 团体竞赛需要除以主力队员人数
    if (competitionType === 'team' && mainMembersCount >= 1) {
      return Math.round((baseScore * coefficient / mainMembersCount) * 100) / 100 // 保留两位小数
    }
    
    return Math.round(baseScore * coefficient * 100) / 100 // 保留两位小数
  }

  // 检查当前竞赛是否为排名类竞赛（排名类竞赛不支持团体模式）
  const isRankingCompetition = () => {
    if (!selectedRegion || !selectedLevel || !selectedCompetition) return false
    
    // 检查该竞赛是否存在于排名表中
    return competitionOptions.rankingBasedCompetitions.some(comp => 
      comp.region === selectedRegion && 
      comp.level === selectedLevel && 
      comp.name === selectedCompetition
    )
  }

  // 检查团体竞赛是否符合加分要求
  const isTeamCompetitionValid = () => {
    if (competitionType === 'individual') return true
    if (competitionType === 'team') {
      return teamLeaderIsBupt === true || isMainMember === true
    }
    return false
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErrors({})

    // 验证表单
    const errors: {[key: string]: string} = {}
    if (!selectedRegion) errors.region = t('profile.competitions.form.error.region')
    if (!selectedLevel) errors.level = t('profile.competitions.form.error.level')
    if (!selectedCompetition) errors.competition = t('profile.competitions.form.error.name')
    if (!awardValue) errors.award = t('profile.competitions.form.error.award')
    
    // 团体竞赛验证
    if (competitionType === 'team') {
      if (teamLeaderIsBupt === null) {
        errors.teamLeader = '请选择团体负责人是否为北京邮电大学学生'
      }
      if (isMainMember === null) {
        errors.mainMember = '请选择学生本人是否为参赛团队的主力队员'
      }
      if (teamLeaderIsBupt === false && isMainMember === false) {
        errors.teamRequirement = '不符合加分要求：团体负责人必须为北京邮电大学学生或学生本人必须为主力队员'
      }
      if (mainMembersCount < 1 || mainMembersCount > 6) {
        errors.membersCount = '主力队员人数必须在1-6人之间'
      }
    }

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
      note: note.trim(),
      score: adminMode ? (parseFloat(adminScore) || 0) : (getPreviewScore() || 0), // 管理员模式使用输入的分数
      colorIndex: editingRecord?.colorIndex || Math.floor(Math.random() * 10),
      award_type: awardType,
      award_value: awardValue,
      competition_type: competitionType,
      team_leader_is_bupt: competitionType === 'team' ? (teamLeaderIsBupt ?? undefined) : undefined,
      is_main_member: competitionType === 'team' ? (isMainMember ?? undefined) : undefined,
      main_members_count: competitionType === 'team' ? mainMembersCount : undefined,
      coefficient: calculateCoefficient()
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
                          // 排名类竞赛自动设置为个人模式
                          setCompetitionType('individual')
                          setTeamLeaderIsBupt(null)
                          setIsMainMember(null)
                          setMainMembersCount(1)
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

              {/* 竞赛类型选择 */}
              {selectedCompetition && (
                <div>
                  <label className="block text-sm font-medium mb-1">竞赛类型</label>
                  {isRankingCompetition() ? (
                    // 排名类竞赛只显示个人模式
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="competitionType"
                          value="individual"
                          checked={true}
                          disabled={true}
                          className="mr-2"
                        />
                        <span className="text-blue-800 font-medium">个人竞赛获奖</span>
                      </div>
                      <p className="text-blue-700 text-sm mt-2">
                        <strong>排名类竞赛</strong> - 此竞赛按排名计分，仅支持个人参赛模式
                      </p>
                    </div>
                  ) : (
                    // 奖项类竞赛显示个人/团体选择
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="competitionType"
                          value="individual"
                          checked={competitionType === 'individual'}
                          onChange={(e) => {
                            setCompetitionType(e.target.value as 'individual')
                            // 重置团体相关状态
                            setTeamLeaderIsBupt(null)
                            setIsMainMember(null)
                            setMainMembersCount(1)
                          }}
                          className="mr-2"
                        />
                        个人竞赛获奖
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="competitionType"
                          value="team"
                          checked={competitionType === 'team'}
                          onChange={(e) => {
                            setCompetitionType(e.target.value as 'team')
                          }}
                          className="mr-2"
                        />
                        团体竞赛获奖
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 团体竞赛相关选项 */}
              {competitionType === 'team' && (
                <>
                  {/* 团体负责人是否为北邮学生 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">团体负责人是否为北京邮电大学学生</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="teamLeaderIsBupt"
                          value="true"
                          checked={teamLeaderIsBupt === true}
                          onChange={() => setTeamLeaderIsBupt(true)}
                          className="mr-2"
                        />
                        是
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="teamLeaderIsBupt"
                          value="false"
                          checked={teamLeaderIsBupt === false}
                          onChange={() => setTeamLeaderIsBupt(false)}
                          className="mr-2"
                        />
                        否
                      </label>
                    </div>
                    {formErrors.teamLeader && <p className="text-red-500 text-sm mt-1">{formErrors.teamLeader}</p>}
                  </div>

                  {/* 学生本人是否为主力队员 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">学生本人是否为参赛团队的主力队员（即团队前六名成员）</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isMainMember"
                          value="true"
                          checked={isMainMember === true}
                          onChange={() => setIsMainMember(true)}
                          className="mr-2"
                        />
                        是
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isMainMember"
                          value="false"
                          checked={isMainMember === false}
                          onChange={() => setIsMainMember(false)}
                          className="mr-2"
                        />
                        否
                      </label>
                    </div>
                    {formErrors.mainMember && <p className="text-red-500 text-sm mt-1">{formErrors.mainMember}</p>}
                  </div>

                  {/* 主力队员人数 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">参赛团队主力队员人数（1-6人）</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={mainMembersCount}
                      onChange={(e) => setMainMembersCount(parseInt(e.target.value) || 1)}
                      className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.membersCount ? 'border-red-500' : ''}`}
                      placeholder="请输入主力队员人数"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      系数计算：1 + (主力队员人数 - 1) × 0.6 = {calculateCoefficient().toFixed(1)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      最终加分 = 基础分数 × 系数 ÷ 主力队员人数
                    </p>
                    {formErrors.membersCount && <p className="text-red-500 text-sm mt-1">{formErrors.membersCount}</p>}
                  </div>

                  {/* 加分要求验证提示 */}
                  {teamLeaderIsBupt === false && isMainMember === false && (
                    <div className="bg-red-50 p-3 rounded-md border border-red-200">
                      <p className="text-red-800 text-sm font-medium">
                        ⚠️ 不符合加分要求
                      </p>
                      <p className="text-red-700 text-sm mt-1">
                        团体负责人必须为北京邮电大学学生，或学生本人必须为参赛团队的主力队员（前六名成员）。
                      </p>
                    </div>
                  )}
                  
                  {formErrors.teamRequirement && (
                    <div className="bg-red-50 p-3 rounded-md border border-red-200">
                      <p className="text-red-800 text-sm">{formErrors.teamRequirement}</p>
                    </div>
                  )}
                </>
              )}

              {/* 奖项类型选择 */}
              {selectedCompetition && (() => {
                const availableTypes = getAvailableAwardTypes()
                
                // 编辑模式下，如果竞赛选项还没加载完成，显示当前的奖项类型
                if (editingRecord && !availableTypes.prize && !availableTypes.ranking) {
                  return (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.competitions.form.award.type')}</label>
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="text-blue-800 text-sm">
                          {awardType === 'prize' ? t('profile.competitions.form.award.type.prize') : t('profile.competitions.form.award.type.ranking')}
                        </span>
                      </div>
                    </div>
                  )
                }
                
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
              {selectedCompetition && (getAvailableAwardTypes().prize || getAvailableAwardTypes().ranking || editingRecord) ? (
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

              {/* 分数预览或管理员分数输入 */}
              {adminMode ? (
                <div>
                  <label className="block text-sm font-medium mb-1">分数</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={adminScore}
                    onChange={(e) => setAdminScore(e.target.value)}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入分数"
                  />
                  <p className="text-xs text-gray-500 mt-1">管理员可以手动修改分数</p>
                </div>
              ) : (
                awardValue && selectedCompetition && (getAvailableAwardTypes().prize || getAvailableAwardTypes().ranking || editingRecord) && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800">{t('profile.competitions.form.preview.label')}</span>
                      <span className="font-semibold text-blue-900">
                        {shouldShowYearlyDecision() ? t('profile.competitions.form.preview.dependent') : t('profile.competitions.form.preview.points', { score: getPreviewScore() || 0 })}
                      </span>
                    </div>
                  </div>
                )
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
