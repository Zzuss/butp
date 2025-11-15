"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Users, GraduationCap, BookOpen, Tag, Heart, Star } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/AuthContext"
import { submitUserRating } from "@/lib/voting-data"
import VotingPoll from "@/components/voting-poll"
import VisitorStats from "@/components/analytics/VisitorStats"
import { useState } from "react"

// 版本号常量 - 固定为1.0版本
const VERSION = "1.0"

// 团队成员数据
const teachers = [
  {
    name: "A老师",
    note: "项目指导老师，负责整体架构设计"
  },
  {
    name: "B老师", 
    note: "技术顾问，负责前端开发指导"
  },
  {
    name: "C老师",
    note: "产品顾问，负责用户体验设计"
  }
];

const students = [
  {
    name: "吴明泽",
    note: "负责平台总体技术架构的规划、设计与持续演进，主导核心技术选型与架构决策，并为开发团队提供全周期的技术指导、评审与核心难题攻关，确保系统架构的先进性、稳定性、可扩展性和高可用性"
  },
  {
    name: "潘明辉", 
    note: "负责产品整体规划与设计，梳理用户需求并转化为产品方案，跟进开发进度，并持续进行迭代优化以提升用户体验"
  },
  {
    name: "黄昌澄",
    note: "负责后端服务与数据库体系的规划、设计与维护，承担数据性能优化与稳定性保障，确保平台数据安全、可靠、高效运行"
  },
  {
    name: "范智健",
    note: "负责模型的微调与优化，进行数据处理，数据库运维。负责网络服务与中转节点的搭建与运维。"
  },
  {
    name: "朱思远",
    note: "负责项目数据处理和数据分析，负责项目算法代码实现"
  },
  {
    name: "苑博淳", 
    note: "前端开发工程师兼UI/UX设计师，负责界面设计与实现"
  },
  {
    name: "吕梓豪",
    note: "负责前端开发，负责平台文书处理工作"
  }
];

export default function AboutPage() {
  const { t } = useLanguage()
  const { user, login } = useAuth()
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>("")
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const resetForm = () => {
    setRating(0)
    setHoverRating(0)
    setFeedback("")
    setSubmitSuccess(false)
  }
  const handleSubmitRating = async () => {
    if (rating === 0 || submitting) return
    // 如果未登录，可考虑要求登录；当前先使用匿名标识写入
    const userHash = user?.userHash || 'ANON'
    try {
      setSubmitting(true)
      const ok = await submitUserRating(userHash, rating, feedback.trim())
      if (ok) {
        setSubmitSuccess(true)
        setTimeout(() => {
          setShowRatingModal(false)
          resetForm()
        }, 1500)
      } else {
        // 简单失败提示
        alert('提交失败，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">关于 BuTP</h1>
          <p className="text-xl text-blue-700 mb-2">Build Your Toolbox Platform</p>
          <p className="text-blue-600 mb-4">构建属于你的工具箱</p>
          
          {/* 版本号显示 */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-blue-600" />
            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 px-3 py-1 text-sm font-medium">
              {t('about.version', { version: VERSION })}
            </Badge>
          </div>
        </div>

        {/* 项目介绍 */}
        <Card className="mb-12 border-blue-200 shadow-lg">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              项目简介
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              BuTP（Build Your Toolbox Platform）是一个现代化的学生培养系统，
              旨在帮助学生更好地管理学习进度、分析学习数据、制定学习计划。
              系统采用 Next.js + React + Supabase 技术栈构建，
              提供直观友好的用户界面和丰富的功能模块。
            </p>
          </CardContent>
        </Card>

        {/* 指导老师团队 */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-blue-900">指导老师</h2>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              {teachers.length} 位老师
            </Badge>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher, index) => (
              <Card key={index} className="border-blue-200 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="text-xl">{teacher.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      <p className="text-sm leading-relaxed">{teacher.note}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 特别致谢 */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-blue-900">特别致谢</h2>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              2 位校友
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[{ name: "白景文", note: "国际学院校友，给予项目支持与帮助" }, { name: "刘双", note: "国际学院校友，给予项目支持与帮助" }].map((person, index) => (
              <Card key={index} className="border-blue-200 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="text-xl">{person.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      <p className="text-sm leading-relaxed">{person.note}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 学生开发团队 */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-blue-900">学生开发团队</h2>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              {students.length} 位同学
            </Badge>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {students.map((student, index) => (
              <Card key={index} className="border-blue-200 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-400 to-blue-500 text-white">
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      <p className="text-sm leading-relaxed">{student.note}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 网站访问统计（仅保留统计组件） */}
        <div className="mt-16">
          <VisitorStats />
        </div>

        {/* 平台评分 */}
        <div className="mt-16">
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-6 w-6 text-blue-600" />
                为平台打分
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-blue-700 mb-4">欢迎为 BuTP 评分，并留下你的建议与反馈。</p>
              <button
                onClick={() => setShowRatingModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
              >
                <Star className="h-4 w-4" /> 给平台打分
              </button>
            </CardContent>
          </Card>
        </div>

        {/* 投票排行榜 */}
        <div className="mt-16">
          <VotingPoll />
        </div>

        {/* 联系邮箱 */}
        <div className="mt-16 text-center">
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
                <h3 className="text-2xl font-bold text-blue-900">联系我们</h3>
              </div>
              <p className="text-blue-700 text-lg">
                如有任何问题或建议，欢迎通过以下邮箱联系我们：
              </p>
              <div className="mt-4">
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 px-4 py-2 text-lg font-medium">
                  developer@butp.tech
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部感谢 */}
        <div className="mt-16 text-center">
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">感谢所有团队成员</h3>
              <p className="text-blue-700 text-lg">
                感谢每一位老师的悉心指导和每一位同学的辛勤付出，
                共同打造了这个优秀的系统！
              </p>
              <div className="mt-6">
                <button 
                  onClick={() => window.open('/privacy-policy', '_blank')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
                >
                  隐私政策与用户数据使用条款
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    {/* 评分弹窗 */}
    {showRatingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => { setShowRatingModal(false); resetForm(); }} />
        <div className="relative w-full max-w-md mx-4">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-600" />
                为平台打分
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-blue-800 mb-2">请选择你的评分（1-5 星）：</p>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const value = i + 1
                    const active = hoverRating ? value <= hoverRating : value <= rating
                    return (
                      <button
                        key={value}
                        type="button"
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(value)}
                        className="p-1"
                        aria-label={`${value} 星`}
                      >
                        <span className={`text-2xl leading-none ${active ? "text-yellow-400" : "text-gray-300"}`}>
                          {active ? "★" : "☆"}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm text-blue-800 mb-2">你的建议（可选）：</p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="例如：希望增加更多课程推荐、完善职业路线图等..."
                  className="w-full min-h-[100px] rounded-md border border-blue-200 bg-blue-50 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => { if (!submitting) { setShowRatingModal(false); resetForm(); } }}
                  disabled={submitting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={rating === 0 || submitting}
                  className={`rounded-md px-4 py-2 text-white transition-colors ${rating === 0 || submitting ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {submitting ? '提交中…' : '提交评分'}
                </button>
              </div>

              {submitSuccess && (
                <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  感谢你的反馈！我们将持续优化平台体验。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )}
    </>
  )
}