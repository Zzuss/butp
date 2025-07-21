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
}

// 本地存储键名
const VOTING_OPTIONS_KEY = 'butp_voting_options'
const USER_VOTE_PREFIX = 'butp_user_vote_'

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

// 获取用户已投票的选项
export async function getUserVote(userId: string): Promise<UserVote | null> {
  try {
    const localUserVote = localStorage.getItem(`${USER_VOTE_PREFIX}${userId}`)
    if (localUserVote) {
      return JSON.parse(localUserVote)
    }
    return null
  } catch (error) {
    console.error('获取用户投票失败:', error)
    return null
  }
}

// 用户投票
export async function voteForOption(userId: string, optionId: number): Promise<boolean> {
  try {
    // 获取当前投票选项
    const options = await getVotingOptions()
    
    // 检查用户是否已经投票
    const existingVote = await getUserVote(userId)
    if (existingVote) {
      // 如果已经投票，先撤销之前的投票
      await revokeVote(userId)
    }
    
    // 更新选项票数
    const updatedOptions = options.map(opt => 
      opt.id === optionId 
        ? { ...opt, vote_count: opt.vote_count + 1, updated_at: new Date().toISOString() }
        : opt
    )
    
    // 保存更新后的选项
    localStorage.setItem(VOTING_OPTIONS_KEY, JSON.stringify(updatedOptions))
    
    // 保存用户投票记录
    const userVoteRecord = {
      id: Date.now(),
      user_id: userId,
      option_id: optionId,
      created_at: new Date().toISOString()
    }
    localStorage.setItem(`${USER_VOTE_PREFIX}${userId}`, JSON.stringify(userVoteRecord))
    
    return true
  } catch (error) {
    console.error('投票失败:', error)
    return false
  }
}

// 撤销投票
export async function revokeVote(userId: string): Promise<boolean> {
  try {
    // 获取用户当前投票
    const userVote = await getUserVote(userId)
    if (!userVote) {
      return false
    }
    
    // 获取当前投票选项
    const options = await getVotingOptions()
    
    // 更新选项票数
    const updatedOptions = options.map(opt => 
      opt.id === userVote.option_id 
        ? { ...opt, vote_count: Math.max(0, opt.vote_count - 1), updated_at: new Date().toISOString() }
        : opt
    )
    
    // 保存更新后的选项
    localStorage.setItem(VOTING_OPTIONS_KEY, JSON.stringify(updatedOptions))
    
    // 删除用户投票记录
    localStorage.removeItem(`${USER_VOTE_PREFIX}${userId}`)
    
    return true
  } catch (error) {
    console.error('撤销投票失败:', error)
    return false
  }
}

// 初始化投票选项（如果数据库中没有的话）
export const initialVotingOptions = [
  { option_key: 'A', option_text: '移动端应用开发' },
  { option_key: 'B', option_text: '人工智能与机器学习功能' },
  { option_key: 'C', option_text: '社交学习与讨论功能' },
  { option_key: 'D', option_text: '职业规划与就业指导' },
  { option_key: 'E', option_text: '多语言国际化支持' }
] 