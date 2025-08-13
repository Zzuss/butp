"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Users, GraduationCap, BookOpen, Tag } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import VotingPoll from "@/components/voting-poll"
import VisitorStats from "@/components/analytics/VisitorStats"

// 版本号常量 - 固定为1.0版本
const VERSION = "1.0"

// 团队成员数据
const teachers = [
  {
    name: "A老师",
    email: "teacher.c@butp.edu",
    note: "项目指导老师，负责整体架构设计"
  },
  {
    name: "B老师", 
    email: "teacher.j@butp.edu",
    note: "技术顾问，负责前端开发指导"
  },
  {
    name: "C老师",
    email: "teacher.l@butp.edu", 
    note: "产品顾问，负责用户体验设计"
  }
];

const students = [
  {
    name: "Y同学",
    email: "student.y@butp.edu",
    note: "前端开发工程师，负责界面设计与实现"
  },
  {
    name: "P同学",
    email: "student.p@butp.edu", 
    note: "后端开发工程师，负责数据库设计"
  },
  {
    name: "F同学",
    email: "student.f@butp.edu",
    note: "全栈开发工程师，负责系统集成"
  },
  {
    name: "H同学",
    email: "student.h@butp.edu",
    note: "UI/UX设计师，负责用户界面设计"
  },
  {
    name: "Z同学", 
    email: "student.z@butp.edu",
    note: "测试工程师，负责质量保证"
  },
  {
    name: "Y同学",
    email: "student.y2@butp.edu",
    note: "产品经理，负责需求分析"
  },
  {
    name: "L同学",
    email: "student.l@butp.edu",
    note: "运维工程师，负责部署与维护"
  }
];

export default function AboutPage() {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">关于 BuTP</h1>
          <p className="text-xl text-blue-700 mb-2">Build Your Toolbox Project</p>
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
              BuTP（Build Your Toolbox Project）是一个现代化的学生培养系统，
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
                    <div className="flex items-center gap-2 text-blue-700">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{teacher.email}</span>
                    </div>
                    <div className="text-gray-600">
                      <p className="text-sm leading-relaxed">{teacher.note}</p>
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
                    <div className="flex items-center gap-2 text-blue-700">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{student.email}</span>
                    </div>
                    <div className="text-gray-600">
                      <p className="text-sm leading-relaxed">{student.note}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 网站访问统计 */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-900 mb-4">
              📊 BuTP 网站真实访问统计
            </h2>
            <p className="text-blue-700 text-lg">
              基于 Umami Analytics 的真实访问数据
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                实时数据源
              </Badge>
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                隐私友好
              </Badge>
            </div>
          </div>
          <VisitorStats />
        </div>

        {/* 投票排行榜 */}
        <div className="mt-16">
          <VotingPoll />
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 