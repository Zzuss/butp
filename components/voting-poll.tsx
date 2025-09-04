"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Vote, TrendingUp, Users, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { 
  VotingOption, 
  UserVote, 
  getVotingOptions, 
  getUserVote, 
  voteForOption, 
  revokeVote
} from "@/lib/voting-data"

export default function VotingPoll() {
  const { user } = useAuth()
  const [options, setOptions] = useState<VotingOption[]>([])
  const [userVote, setUserVote] = useState<UserVote | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [totalVotes, setTotalVotes] = useState(0)

  // 获取投票数据
  const fetchVotingData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [optionsData, userVoteData] = await Promise.all([
        getVotingOptions(),
        user?.isLoggedIn ? getUserVote(user.userId) : Promise.resolve(null)
      ])
      
      setOptions(optionsData)
      setUserVote(userVoteData)
      setTotalVotes(optionsData.reduce((sum, opt) => sum + opt.vote_count, 0))
    } catch (error) {
      console.error('获取投票数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchVotingData()
  }, [user, fetchVotingData])

  // 投票处理
  const handleVote = async (optionId: number) => {
    if (!user?.isLoggedIn || voting) return
    
    try {
      setVoting(true)
      const success = await voteForOption(user.userId, optionId)
      if (success) {
        await fetchVotingData()
      }
    } catch (error) {
      console.error('投票失败:', error)
    } finally {
      setVoting(false)
    }
  }

  // 撤销投票处理
  const handleRevokeVote = async () => {
    if (!user?.isLoggedIn || voting) return
    
    try {
      setVoting(true)
      const success = await revokeVote(user.userId)
      if (success) {
        await fetchVotingData()
      }
    } catch (error) {
      console.error('撤销投票失败:', error)
    } finally {
      setVoting(false)
    }
  }

  // 计算百分比
  const getPercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0
    return Math.round((voteCount / totalVotes) * 100)
  }

  if (loading) {
    return (
      <Card className="border-blue-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-6 w-6" />
            功能投票排行榜
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-6 w-6" />
          最希望BuTP未来添加的功能
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>总投票数: {totalVotes}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>实时排行</span>
          </div>
        </div>
        <div className="mt-2">
          <h4 className="font-semibold text-white mb-1">投票规则</h4>
          <ul className="text-xs text-white/90 space-y-1">
            <li>• 每个账户在每个版本中只能投一票</li>
            <li>• 可以随时撤销投票并重新选择</li>
            <li>• 票数实时更新，按票数从高到低排序</li>
            <li>• 如果有任何其他想添加的功能，请通过下方邮箱联系我们</li>
          </ul>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {options.map((option, index) => {
            const percentage = getPercentage(option.vote_count)
            const isUserVoted = userVote?.option_id === option.id
            const rank = index + 1
            
            return (
              <div 
                key={option.id} 
                className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                  isUserVoted 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {/* 排名徽章 */}
                <div className="absolute -top-2 -left-2">
                  <Badge 
                    variant={rank <= 3 ? "default" : "secondary"}
                    className={`${
                      rank === 1 ? 'bg-yellow-500 hover:bg-yellow-600' :
                      rank === 2 ? 'bg-gray-400 hover:bg-gray-500' :
                      rank === 3 ? 'bg-orange-500 hover:bg-orange-600' :
                      'bg-gray-300 hover:bg-gray-400'
                    } text-white font-bold`}
                  >
                    {rank}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg text-blue-600">
                        {option.option_key}
                      </span>
                      <span className="text-gray-700 font-medium">
                        {option.option_text}
                      </span>
                      {isUserVoted && (
                        <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          已投票
                        </Badge>
                      )}
                    </div>
                    
                    {/* 进度条 */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          rank === 1 ? 'bg-yellow-500' :
                          rank === 2 ? 'bg-gray-400' :
                          rank === 3 ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{option.vote_count} 票</span>
                      <span>{percentage}%</span>
                    </div>
                  </div>

                  {/* 投票按钮 */}
                  <div className="ml-4">
                    {user?.isLoggedIn ? (
                      isUserVoted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRevokeVote}
                          disabled={voting}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          撤销投票
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleVote(option.id)}
                          disabled={voting || userVote !== null}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Vote className="h-4 w-4 mr-1" />
                          投票
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-gray-500"
                      >
                        请先登录
                      </Button>
                    )}
                  </div>
                </div>
              </div>
          )})}
        </div>

        
      </CardContent>
    </Card>
  )
} 