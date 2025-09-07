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

// 本地存储键名
const VOTING_OPTIONS_KEY = 'butp_voting_options'
const USER_VOTE_PREFIX = 'butp_user_vote_'
const VOTING_VERSION_KEY = 'butp_voting_version'

// 当前投票版本号
const CURRENT_VOTING_VERSION = '1.0'

// 获取所有投票选项（按票数排序）
export async function getVotingOptions(): Promise<VotingOption[]> {
  try {
    // 从本地存储获取投票选项
    const localVotes = localStorage.getItem(VOTING_OPTIONS_KEY)
    if (localVotes) {
      const options = JSON.parse(localVotes)
      // 按票数排序
      return options.sort((a: VotingOption, b: VotingOption) => b.vote_count - a.vote_count)
    }
    
    // 如果没有本地数据，初始化默认选项
    const defaultOptions = initialVotingOptions.map((opt, index) => ({
      id: index + 1,
      option_key: opt.option_key,
      option_text: opt.option_text,
      vote_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    // 保存到本地存储
    localStorage.setItem(VOTING_OPTIONS_KEY, JSON.stringify(defaultOptions))
    return defaultOptions
  } catch (error) {
    console.error('获取投票选项失败:', error)
    // 如果出错，返回初始选项
    return initialVotingOptions.map((opt, index) => ({
      id: index + 1,
      option_key: opt.option_key,
      option_text: opt.option_text,
      vote_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  }
}

// 获取用户已投票的选项（支持多票）
export async function getUserVote(userId: string): Promise<UserVoteHistory | null> {
  try {
    const localUserVote = localStorage.getItem(`${USER_VOTE_PREFIX}${userId}`)
    if (localUserVote) {
      const userVoteHistory = JSON.parse(localUserVote)
      
      // 检查版本号，如果版本不匹配则清除旧投票记录
      if (userVoteHistory.version !== CURRENT_VOTING_VERSION) {
        localStorage.removeItem(`${USER_VOTE_PREFIX}${userId}`)
        return null
      }
      
      return userVoteHistory
    }
    return null
  } catch (error) {
    console.error('获取用户投票失败:', error)
    return null
  }
}

// 用户投票（支持最多3票）
export async function voteForOption(userId: string, optionId: number): Promise<boolean> {
  try {
    // 获取当前投票选项
    const options = await getVotingOptions()
    
    // 获取用户当前投票历史
    const existingVoteHistory = await getUserVote(userId)
    
    // 检查是否已经投过这个选项
    if (existingVoteHistory && existingVoteHistory.votes.some(vote => vote.option_id === optionId)) {
      return false // 已经投过这个选项
    }
    
    // 检查是否已达到最大投票数（3票）
    if (existingVoteHistory && existingVoteHistory.votes.length >= 3) {
      return false // 已达到最大投票数
    }
    
    // 更新选项票数
    const updatedOptions = options.map(opt => 
      opt.id === optionId 
        ? { ...opt, vote_count: opt.vote_count + 1, updated_at: new Date().toISOString() }
        : opt
    )
    
    // 保存更新后的选项
    localStorage.setItem(VOTING_OPTIONS_KEY, JSON.stringify(updatedOptions))
    
    // 创建新的投票记录
    const newVoteRecord = {
      id: Date.now(),
      user_id: userId,
      option_id: optionId,
      created_at: new Date().toISOString(),
      version: CURRENT_VOTING_VERSION
    }
    
    // 更新用户投票历史
    const updatedVoteHistory = {
      user_id: userId,
      votes: existingVoteHistory ? [...existingVoteHistory.votes, newVoteRecord] : [newVoteRecord],
      version: CURRENT_VOTING_VERSION
    }
    
    localStorage.setItem(`${USER_VOTE_PREFIX}${userId}`, JSON.stringify(updatedVoteHistory))
    
    return true
  } catch (error) {
    console.error('投票失败:', error)
    return false
  }
}

// 撤销投票（支持撤销特定选项）
export async function revokeVote(userId: string, optionId?: number): Promise<boolean> {
  try {
    // 获取用户当前投票历史
    const userVoteHistory = await getUserVote(userId)
    if (!userVoteHistory || userVoteHistory.votes.length === 0) {
      return false
    }
    
    // 获取当前投票选项
    const options = await getVotingOptions()
    
    let votesToRemove: UserVote[]
    
    if (optionId) {
      // 撤销特定选项的投票
      votesToRemove = userVoteHistory.votes.filter(vote => vote.option_id === optionId)
      if (votesToRemove.length === 0) {
        return false // 没有找到要撤销的投票
      }
    } else {
      // 撤销所有投票
      votesToRemove = userVoteHistory.votes
    }
    
    // 更新选项票数
    const updatedOptions = options.map(opt => {
      const votesForThisOption = votesToRemove.filter(vote => vote.option_id === opt.id)
      return votesForThisOption.length > 0
        ? { ...opt, vote_count: Math.max(0, opt.vote_count - votesForThisOption.length), updated_at: new Date().toISOString() }
        : opt
    })
    
    // 保存更新后的选项
    localStorage.setItem(VOTING_OPTIONS_KEY, JSON.stringify(updatedOptions))
    
    // 更新用户投票历史
    if (optionId) {
      // 只移除特定选项的投票
      const updatedVotes = userVoteHistory.votes.filter(vote => vote.option_id !== optionId)
      if (updatedVotes.length === 0) {
        // 如果没有剩余投票，删除整个记录
        localStorage.removeItem(`${USER_VOTE_PREFIX}${userId}`)
      } else {
        // 更新投票历史
        const updatedVoteHistory = {
          ...userVoteHistory,
          votes: updatedVotes
        }
        localStorage.setItem(`${USER_VOTE_PREFIX}${userId}`, JSON.stringify(updatedVoteHistory))
      }
    } else {
      // 删除所有投票记录
      localStorage.removeItem(`${USER_VOTE_PREFIX}${userId}`)
    }
    
    return true
  } catch (error) {
    console.error('撤销投票失败:', error)
    return false
  }
}

// 更新投票版本号（清除所有用户投票记录）
export function updateVotingVersion(newVersion: string): void {
  try {
    // 清除所有用户投票记录
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(USER_VOTE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
    
    // 保存新版本号
    localStorage.setItem(VOTING_VERSION_KEY, newVersion)
    
    console.log(`投票版本已更新到 ${newVersion}，所有用户投票记录已清除`)
  } catch (error) {
    console.error('更新投票版本失败:', error)
  }
}

// 获取当前投票版本号
export function getCurrentVotingVersion(): string {
  return CURRENT_VOTING_VERSION
}

// 初始化投票选项（如果数据库中没有的话）
export const initialVotingOptions = [
  { option_key: 'A', option_text: '是否把修改成绩改成滑条式输入' },
  { option_key: 'B', option_text: '人工智能与机器学习功能' },
  { option_key: 'C', option_text: '社交学习与讨论功能' },
  { option_key: 'D', option_text: '职业规划与就业指导' },
  { option_key: 'E', option_text: '多语言国际化支持' }
] 