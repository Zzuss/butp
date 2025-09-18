import { supabase } from '@/lib/supabase'

// 投票选项接口
export interface VotingOption {
  id: number
  option_key: string
  option_text: string
  vote_count: number
  created_at: string
  updated_at: string
}

// 用户投票记录接口
export interface UserVote {
  id: number
  user_id: string
  option_id: number
  created_at: string
  version: string
}

// 用户投票历史接口（支持多票）
export interface UserVoteHistory {
  user_id: string
  votes: UserVote[]
  version: string
}

// 固定选项键与稳定ID映射（A→1, B→2, ...）
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const
type OptionKey = typeof OPTION_KEYS[number]
const keyToId = (key: string): number => Math.max(1, OPTION_KEYS.indexOf(key as OptionKey) + 1)
const idToKey = (id: number): OptionKey => OPTION_KEYS[Math.max(0, Math.min(OPTION_KEYS.length - 1, id - 1))]

// 当前投票版本号
const CURRENT_VOTING_VERSION = '1.1'

// 获取所有投票选项（按票数排序）
export async function getVotingOptions(): Promise<VotingOption[]> {
  try {
    // 读取数据库 vote 表的 option 列，统计每个选项的票数
    const { data, error } = await supabase
      .from('vote')
      .select('option')

    // 如果表不存在或返回错误，回退为0票
    if (error) {
      console.error('获取投票选项失败:', error.message)
      return initialVotingOptions.map((opt) => ({
        id: keyToId(opt.option_key),
        option_key: opt.option_key,
        option_text: opt.option_text,
        vote_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    }

    // 统计票数（option 存储为 'A C' 这样的空格分隔字符串）
    const counts: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
    for (const row of data || []) {
      const text: string = (row as any).option || ''
      const parts = text.split(/\s+/).map(s => s.trim()).filter(Boolean)
      for (const p of parts) {
        if ((OPTION_KEYS as readonly string[]).includes(p)) {
          counts[p as OptionKey] += 1
        }
      }
    }

    // 组装返回并按票数排序
    const now = new Date().toISOString()
    const options: VotingOption[] = initialVotingOptions.map((opt) => ({
      id: keyToId(opt.option_key),
      option_key: opt.option_key,
      option_text: opt.option_text,
      vote_count: counts[opt.option_key as OptionKey] || 0,
      created_at: now,
      updated_at: now
    }))
    return options.sort((a, b) => b.vote_count - a.vote_count)
  } catch (error) {
    console.error('获取投票选项失败:', (error as Error).message)
    const now = new Date().toISOString()
    return initialVotingOptions.map((opt) => ({
      id: keyToId(opt.option_key),
      option_key: opt.option_key,
      option_text: opt.option_text,
      vote_count: 0,
      created_at: now,
      updated_at: now
    }))
  }
}

// 获取用户已投票的选项（支持多票）
export async function getUserVote(userHash: string): Promise<UserVoteHistory | null> {
  try {
    const { data, error } = await supabase
      .from('vote')
      .select('option')
      .eq('SNH', userHash)
      .limit(1)
      .maybeSingle()

    if (error) {
      return null
    }

    const optionsText: string = data?.option || ''
    const parts = optionsText.split(/\s+/).map((s: string) => s.trim()).filter(Boolean)
    const votes: UserVote[] = parts.map((k) => ({
      id: keyToId(k),
      user_id: userHash,
      option_id: keyToId(k),
      created_at: new Date().toISOString(),
      version: CURRENT_VOTING_VERSION
    }))

    return {
      user_id: userHash,
      votes,
      version: CURRENT_VOTING_VERSION
    }
  } catch (error) {
    console.error('获取用户投票失败:', (error as Error).message)
    return null
  }
}

// 用户投票（支持最多3票）
export async function voteForOption(userHash: string, optionId: number): Promise<boolean> {
  try {
    const optionKey = idToKey(optionId)

    // 读取现有记录
    const { data: existing, error: readError } = await supabase
      .from('vote')
      .select('option')
      .eq('SNH', userHash)
      .limit(1)
      .maybeSingle()

    if (readError && readError.code !== 'PGRST116') {
      // 非空结果错误
      return false
    }

    const currentParts = (existing?.option || '')
      .split(/\s+/)
      .map((s: string) => s.trim())
      .filter(Boolean)

    // 已投该选项
    if (currentParts.includes(optionKey)) {
      return false
    }

    // 最多三票
    if (currentParts.length >= 3) {
      return false
    }

    const updatedParts = [...currentParts, optionKey]
    const updatedText = updatedParts.join(' ')

    if (existing) {
      const { error: updateError } = await supabase
        .from('vote')
        .update({ option: updatedText })
        .eq('SNH', userHash)
      return !updateError
    } else {
      const { error: insertError } = await supabase
        .from('vote')
        .insert({ SNH: userHash, option: updatedText })
      return !insertError
    }
  } catch (error) {
    console.error('投票失败:', (error as Error).message)
    return false
  }
}

// 撤销投票（支持撤销特定选项）
export async function revokeVote(userHash: string, optionId?: number): Promise<boolean> {
  try {
    const { data: existing, error: readError } = await supabase
      .from('vote')
      .select('option')
      .eq('SNH', userHash)
      .limit(1)
      .maybeSingle()

    if (readError || !existing) {
      return false
    }

    const currentParts = (existing.option || '')
      .split(/\s+/)
      .map((s: string) => s.trim())
      .filter(Boolean)

    let updatedParts: string[]
    if (optionId) {
      const key = idToKey(optionId)
      updatedParts = currentParts.filter((k: string) => k !== key)
    } else {
      updatedParts = []
    }

    const { error: updateError } = await supabase
      .from('vote')
      .update({ option: updatedParts.join(' ') })
      .eq('SNH', userHash)

    return !updateError
  } catch (error) {
    console.error('撤销投票失败:', (error as Error).message)
    return false
  }
}

// 更新投票版本号（清除所有用户投票记录）
export function updateVotingVersion(newVersion: string): void {
  // 基于数据库的实现无需本地版本清理，这里保持空实现以兼容调用方
  console.log(`投票版本已更新到 ${newVersion}`)
}

// 获取当前投票版本号
export function getCurrentVotingVersion(): string {
  return CURRENT_VOTING_VERSION
}

// 初始化投票选项（如果数据库中没有的话）
export const initialVotingOptions = [
  { option_key: 'A', option_text: '把滑条输入改为数字输入' },
  { option_key: 'B', option_text: '生成动态数字CV' },
  { option_key: 'C', option_text: '动态能力图谱' },
  { option_key: 'D', option_text: '导出动态数字人' },
  { option_key: 'E', option_text: '通告栏公示功能' }
] 