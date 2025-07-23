"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Briefcase, MapPin, Star, Building, School, Award, BookOpen, Layers, Globe } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollableContainer } from "../../components/ui/scrollable-container"
import { useLanguage } from "@/contexts/language-context"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { getUserProbabilityData } from "@/lib/dashboard-data"
import { useState, useEffect } from "react"

// 可能性卡片组件
function PossibilityCard({ activeTab }: { activeTab: string }) {
  const { t } = useLanguage()
  const { currentStudent } = useSimpleAuth()
  const [probabilityData, setProbabilityData] = useState<{
    proba_1: number;
    proba_2: number;
    proba_3: number;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 获取用户概率数据
  useEffect(() => {
    async function fetchProbabilityData() {
      if (currentStudent) {
        try {
          const data = await getUserProbabilityData(currentStudent.id)
          setProbabilityData(data)
        } catch (error) {
          console.error('Error fetching probability data:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    
    fetchProbabilityData()
  }, [currentStudent])
  
  // 根据不同标签页显示不同的可能性类型和数值
  const getPossibilityData = () => {
    // 默认值（当没有数据时使用）
    const defaultValues = {
      companies: { type: t('rolemodels.possibility.employment'), percentage: '70%' },
      schools: { type: t('rolemodels.possibility.graduate'), percentage: '80%' },
      internships: { type: t('rolemodels.possibility.internship'), percentage: '90%' }
    }
    
    // 如果没有数据或正在加载，使用默认值
    if (loading || !probabilityData) {
      return defaultValues[activeTab as keyof typeof defaultValues] || defaultValues.companies
    }
    
    // 根据当前标签页返回对应的概率数据
    switch (activeTab) {
      case 'companies':
        return {
          type: t('rolemodels.possibility.employment'),
          percentage: `${(probabilityData.proba_1 * 100).toFixed(1)}%`
        }
      case 'schools':
        return {
          type: t('rolemodels.possibility.graduate'),
          percentage: `${(probabilityData.proba_2 * 100).toFixed(1)}%`
        }
      case 'internships':
        return {
          type: t('rolemodels.possibility.internship'),
          percentage: `${(probabilityData.proba_3 * 100).toFixed(1)}%`
        }
      default:
        return {
          type: t('rolemodels.possibility.employment'),
          percentage: `${(probabilityData.proba_1 * 100).toFixed(1)}%`
        }
    }
  }
  
  const { type, percentage } = getPossibilityData()
  
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-lg hover:shadow-xl transition-shadow duration-300 min-w-[280px] max-w-[320px]">
      <CardContent className="px-8 py-4">
        <div className="text-center mb-3">
          <div className="text-sm text-blue-600 opacity-80">
            {t('rolemodels.possibility.estimate')}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-blue-700">
            {type}
          </div>
          <div className="text-4xl font-bold text-blue-800 tracking-tight">
            {percentage}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 按公司和学校分类的虚拟角色模型数据
const companyModels = {
  "腾讯": {
    "大模型": [
      {
        id: 1,
        name: "腾讯大模型工程师画像",
        position: "大模型工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.8+/4.0",
          courses: ["深度学习", "自然语言处理", "分布式系统", "机器学习"]
        },
        competitions: ["ACM程序设计大赛", "互联网+创新创业大赛"],
        internships: ["腾讯人工智能实验室实习", "知名互联网公司人工智能实习"],
        englishScores: {
          toefl: "105+",
          ielts: "7.0+"
        },
        skills: ["大模型训练", "分布式计算", "算法优化", "团队协作"],
        tags: ["大模型", "人工智能", "深度学习"],
        description: "腾讯大模型工程师需具备扎实的深度学习理论基础，熟悉大规模分布式训练，有相关竞赛和实习经验，课程成绩优秀。",
        rating: 4.9,
        consultations: 120
      }
    ],
    "算法": [
      {
        id: 2,
        name: "腾讯算法工程师画像",
        position: "算法工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.8+/4.0",
          courses: ["机器学习", "数据挖掘", "算法设计"]
        },
        competitions: ["ACM程序设计大赛"],
        internships: ["腾讯算法实习"],
        englishScores: {
          toefl: "105+",
          ielts: "7.0+"
        },
        skills: ["算法设计", "数据分析", "Python/Java"],
        tags: ["算法", "数据挖掘"],
        description: "腾讯算法工程师需有扎实的算法理论基础，参与过算法竞赛，具备数据分析能力。",
        rating: 4.8,
        consultations: 100
      }
    ],
    "后端": [
      {
        id: 3,
        name: "腾讯后端开发画像",
        position: "后端开发工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.7+/4.0",
          courses: ["数据结构与算法", "操作系统", "计算机网络", "数据库"]
        },
        competitions: ["ACM程序设计大赛"],
        internships: ["腾讯后端开发实习"],
        englishScores: {
          toefl: "100+",
          ielts: "6.5+"
        },
        skills: ["Java/Python", "微服务架构", "高并发系统设计"],
        tags: ["后端", "高并发", "微服务"],
        description: "腾讯后端开发需熟悉主流后端技术栈，有高并发系统开发经验。",
        rating: 4.8,
        consultations: 98
      }
    ],
    "前端": [
      {
        id: 4,
        name: "腾讯前端开发画像",
        position: "前端开发工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.6+/4.0",
          courses: ["Web开发", "数据结构", "计算机网络"]
        },
        competitions: ["腾讯前端大赛"],
        internships: ["腾讯前端实习"],
        englishScores: {
          toefl: "95+",
          ielts: "6.0+"
        },
        skills: ["React/Vue", "前端工程化", "性能优化"],
        tags: ["前端", "网页开发", "工程化"],
        description: "腾讯前端开发需熟悉主流前端框架，有大型项目开发经验。",
        rating: 4.7,
        consultations: 85
      }
    ],
    "测试": [
      {
        id: 5,
        name: "腾讯测试工程师画像",
        position: "测试工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.5+/4.0",
          courses: ["软件测试", "自动化测试", "编程基础"]
        },
        competitions: ["软件测试大赛"],
        internships: ["腾讯测试实习"],
        englishScores: {
          toefl: "90+",
          ielts: "6.0+"
        },
        skills: ["自动化测试", "脚本开发", "Bug分析"],
        tags: ["测试", "自动化"],
        description: "腾讯测试工程师需熟悉自动化测试工具，具备脚本开发能力。",
        rating: 4.6,
        consultations: 60
      }
    ],
    "产品经理": [
      {
        id: 6,
        name: "腾讯产品经理画像",
        position: "产品经理",
        location: "深圳/北京",
        academics: {
          gpa: "3.6+/4.0",
          courses: ["产品管理", "用户体验", "市场分析"]
        },
        competitions: ["互联网+创新创业大赛"],
        internships: ["腾讯产品实习"],
        englishScores: {
          toefl: "95+",
          ielts: "6.5+"
        },
        skills: ["需求分析", "项目管理", "沟通能力"],
        tags: ["产品", "管理"],
        description: "腾讯产品经理需具备良好的沟通能力和项目管理能力，关注用户体验。",
        rating: 4.7,
        consultations: 70
      }
    ],
    "运维": [
      {
        id: 7,
        name: "腾讯运维工程师画像",
        position: "运维工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.5+/4.0",
          courses: ["操作系统", "网络安全", "自动化运维"]
        },
        competitions: ["运维技能大赛"],
        internships: ["腾讯运维实习"],
        englishScores: {
          toefl: "90+",
          ielts: "6.0+"
        },
        skills: ["自动化运维", "脚本开发", "系统监控"],
        tags: ["运维", "自动化"],
        description: "腾讯运维工程师需熟悉自动化运维工具，具备系统监控和故障排查能力。",
        rating: 4.6,
        consultations: 55
      }
    ],
    "数据分析": [
      {
        id: 8,
        name: "腾讯数据分析师画像",
        position: "数据分析师",
        location: "深圳/北京",
        academics: {
          gpa: "3.7+/4.0",
          courses: ["数据分析", "统计学", "数据库"]
        },
        competitions: ["数据分析大赛"],
        internships: ["腾讯数据分析实习"],
        englishScores: {
          toefl: "100+",
          ielts: "6.5+"
        },
        skills: ["数据分析", "SQL", "数据可视化"],
        tags: ["数据分析", "统计"],
        description: "腾讯数据分析师需具备扎实的数据分析和可视化能力，熟悉SQL。",
        rating: 4.7,
        consultations: 65
      }
    ]
  },
  "阿里巴巴": {
    "算法": [
      {
        id: 3,
        name: "阿里巴巴算法工程师画像",
        position: "算法工程师",
        location: "杭州/北京",
        academics: {
          gpa: "3.8+/4.0",
          courses: ["机器学习", "数据挖掘", "大数据处理", "算法设计"]
        },
        competitions: ["天池大数据竞赛", "阿里云创新大赛"],
        internships: ["阿里巴巴算法实习", "数据分析相关实习"],
        englishScores: {
          toefl: "105+",
          ielts: "7.0+"
        },
        skills: ["机器学习", "数据挖掘", "Python/Java"],
        tags: ["算法", "大数据", "机器学习"],
        description: "阿里算法工程师需有扎实的算法理论基础，参与过天池等数据竞赛，具备大数据处理能力。",
        rating: 4.9,
        consultations: 110
      }
    ],
    "前端": [
      {
        id: 4,
        name: "阿里巴巴前端开发画像",
        position: "前端开发工程师",
        location: "杭州/北京",
        academics: {
          gpa: "3.6+/4.0",
          courses: ["Web开发", "数据结构", "计算机网络"]
        },
        competitions: ["阿里云前端大赛"],
        internships: ["阿里巴巴前端实习", "大型互联网公司前端实习"],
        englishScores: {
          toefl: "95+",
          ielts: "6.0+"
        },
        skills: ["React/Vue", "前端工程化", "性能优化"],
        tags: ["前端", "网页开发", "工程化"],
        description: "阿里前端开发需熟悉主流前端框架，有大型项目开发经验，注重性能优化。",
        rating: 4.7,
        consultations: 85
      }
    ]
  },
  "字节跳动": {
    "算法": [
      {
        id: 5,
        name: "字节跳动算法工程师画像",
        position: "算法工程师",
        location: "北京/上海",
        academics: {
          gpa: "3.9+/4.0",
          courses: ["人工智能", "计算机视觉", "推荐系统"]
        },
        competitions: ["全国大学生数学建模竞赛", "字节跳动青训营"],
        internships: ["字节跳动算法实习", "人工智能研究实验室实习"],
        englishScores: {
          toefl: "110+",
          ielts: "7.5+"
        },
        skills: ["深度学习", "推荐系统", "Python/C++"],
        tags: ["人工智能", "算法", "推荐系统"],
        description: "字节算法工程师需有人工智能算法项目经验，熟悉推荐系统，参与过青训营等活动。",
        rating: 4.9,
        consultations: 90
      }
    ],
    "前端": [
      {
        id: 6,
        name: "字节跳动前端开发画像",
        position: "前端开发工程师",
        location: "北京/上海",
        academics: {
          gpa: "3.7+/4.0",
          courses: ["Web开发", "前端工程化", "数据结构"]
        },
        competitions: ["字节跳动前端大赛"],
        internships: ["字节跳动前端实习", "大型互联网公司前端实习"],
        englishScores: {
          toefl: "100+",
          ielts: "6.5+"
        },
        skills: ["React/Vue", "前端性能优化", "工程化工具链"],
        tags: ["前端", "网页开发", "工程化"],
        description: "字节前端开发需熟悉前端主流技术栈，有大型项目开发和优化经验。",
        rating: 4.8,
        consultations: 70
      }
    ]
  }
}

const schoolModels = {
  "清华大学": {
    "电子信息工程": [
      {
        id: 4,
        name: "清华大学电子信息工程研究生画像",
        graduateMajor: "电子信息工程",
        location: "北京",
        academics: {
          gpa: "3.8+/4.0",
          courses: ["信号与系统", "数字电路", "通信原理", "嵌入式系统"]
        },
        competitions: ["全国大学生电子设计竞赛", "挑战杯学术竞赛"],
        research: ["发表SCI/EI检索论文", "参与国家级科研项目"],
        englishScores: {
          toefl: "110+",
          ielts: "7.5+",
          gre: "325+"
        },
        skills: ["电路设计", "嵌入式开发", "科研能力", "学术写作"],
        tags: ["电子", "嵌入式", "科研"],
        description: "清华电子信息工程研究生通常本科成绩优异，积极参与电子设计竞赛和科研项目，具备扎实的电路与嵌入式开发能力。",
        rating: 4.8,
        consultations: 120
      }
    ],
    "计算机科学与技术": [
      {
        id: 5,
        name: "清华大学计算机科学与技术研究生画像",
        graduateMajor: "计算机科学与技术",
        location: "北京",
        academics: {
          gpa: "3.85+/4.0",
          courses: ["数据结构", "操作系统", "人工智能", "算法设计"]
        },
        competitions: ["ACM程序设计大赛", "全国大学生数学竞赛"],
        research: ["发表高水平论文", "参与国家级科研项目"],
        englishScores: {
          toefl: "112+",
          ielts: "7.5+",
          gre: "328+"
        },
        skills: ["算法设计", "编程实现", "科研能力", "团队协作"],
        tags: ["计算机", "算法", "科研"],
        description: "清华计算机研究生需有扎实的算法和编程基础，积极参与竞赛和科研，具备较强的创新能力。",
        rating: 4.9,
        consultations: 150
      }
    ],
    "自动化": [
      {
        id: 6,
        name: "清华大学自动化研究生画像",
        graduateMajor: "自动化",
        location: "北京",
        academics: {
          gpa: "3.8+/4.0",
          courses: ["自动控制原理", "信号处理", "机器人学"]
        },
        competitions: ["全国大学生机器人大赛"],
        research: ["参与自动化相关科研项目"],
        englishScores: {
          toefl: "110+",
          ielts: "7.0+",
          gre: "325+"
        },
        skills: ["控制算法", "机器人", "系统建模"],
        tags: ["自动化", "机器人", "控制"],
        description: "清华自动化研究生需具备扎实的控制理论基础和机器人开发能力，积极参与相关竞赛和科研。",
        rating: 4.7,
        consultations: 90
      }
    ]
  },
  "北京大学": {
    "理论物理": [
      {
        id: 7,
        name: "北京大学理论物理研究生画像",
        graduateMajor: "理论物理",
        location: "北京",
        academics: {
          gpa: "3.9+/4.0",
          courses: ["理论物理", "量子力学", "高等数学", "计算物理"]
        },
        competitions: ["全国大学生物理竞赛", "美国大学生数学建模竞赛"],
        research: ["参与前沿科研项目", "在核心期刊发表论文"],
        englishScores: {
          toefl: "115+",
          ielts: "7.5+",
          gre: "330+"
        },
        skills: ["理论研究", "数据分析", "科学计算", "批判性思维"],
        tags: ["科研", "物理", "数学"],
        description: "北大理论物理研究生在基础学科领域有扎实功底，积极参与科研，GPA高，英语能力强。",
        rating: 4.9,
        consultations: 100
      }
    ],
    "计算机科学与技术": [
      {
        id: 8,
        name: "北京大学计算机科学与技术研究生画像",
        graduateMajor: "计算机科学与技术",
        location: "北京",
        academics: {
          gpa: "3.85+/4.0",
          courses: ["数据结构", "人工智能", "操作系统"]
        },
        competitions: ["ACM程序设计大赛"],
        research: ["参与高水平科研项目"],
        englishScores: {
          toefl: "112+",
          ielts: "7.5+",
          gre: "328+"
        },
        skills: ["算法设计", "编程实现", "科研能力"],
        tags: ["计算机", "算法", "科研"],
        description: "北大计算机研究生需有扎实的算法和编程基础，积极参与竞赛和科研。",
        rating: 4.8,
        consultations: 120
      }
    ],
    "生物科学": [
      {
        id: 9,
        name: "北京大学生物科学研究生画像",
        graduateMajor: "生物科学",
        location: "北京",
        academics: {
          gpa: "3.85+/4.0",
          courses: ["分子生物学", "遗传学", "生物化学"]
        },
        competitions: ["全国大学生生命科学竞赛"],
        research: ["参与生物相关科研项目"],
        englishScores: {
          toefl: "110+",
          ielts: "7.0+",
          gre: "325+"
        },
        skills: ["实验设计", "数据分析", "学术写作"],
        tags: ["生物", "科研", "实验"],
        description: "北大生物科学研究生需具备扎实的实验和数据分析能力，积极参与科研。",
        rating: 4.7,
        consultations: 80
      }
    ]
  },
  "哈佛大学": {
    "分子生物学": [
      {
        id: 10,
        name: "哈佛大学分子生物学留学生画像",
        graduateMajor: "分子生物学",
        location: "波士顿",
        academics: {
          gpa: "3.95+/4.0",
          courses: ["高级生物学", "有机化学", "分子遗传学", "科研方法论"]
        },
        competitions: ["国际生物学奥林匹克", "全国英语竞赛"],
        research: ["国际顶级期刊发表论文", "参与国际合作研究项目"],
        englishScores: {
          toefl: "115+",
          ielts: "8.0+",
          gre: "335+",
          sat: "1550+"
        },
        skills: ["科研创新", "学术写作", "批判性思维", "跨文化交流"],
        tags: ["留学", "科研", "生物"],
        description: "哈佛分子生物学留学生学术成绩极为优秀，科研能力突出，具备国际视野。",
        rating: 5.0,
        consultations: 100
      }
    ],
    "公共政策": [
      {
        id: 11,
        name: "哈佛大学公共政策留学生画像",
        graduateMajor: "公共政策",
        location: "波士顿",
        academics: {
          gpa: "3.9+/4.0",
          courses: ["政策分析", "经济学", "社会学"]
        },
        competitions: ["国际公共政策竞赛"],
        research: ["参与国际合作项目"],
        englishScores: {
          toefl: "113+",
          ielts: "8.0+",
          gre: "332+",
          sat: "1530+"
        },
        skills: ["政策分析", "跨文化沟通", "学术写作"],
        tags: ["留学", "政策", "社会科学"],
        description: "哈佛公共政策留学生需具备良好的政策分析和跨文化沟通能力，积极参与国际项目。",
        rating: 4.9,
        consultations: 80
      }
    ],
    "计算机科学": [
      {
        id: 12,
        name: "哈佛大学计算机科学留学生画像",
        graduateMajor: "计算机科学",
        location: "波士顿",
        academics: {
          gpa: "3.95+/4.0",
          courses: ["人工智能", "算法分析", "分布式系统"]
        },
        competitions: ["国际编程竞赛"],
        research: ["参与高水平科研项目"],
        englishScores: {
          toefl: "115+",
          ielts: "8.0+",
          gre: "335+",
          sat: "1550+"
        },
        skills: ["算法设计", "科研创新", "编程实现"],
        tags: ["计算机", "科研", "人工智能"],
        description: "哈佛计算机科学留学生需有扎实的算法和编程基础，积极参与国际竞赛和科研。",
        rating: 4.9,
        consultations: 90
      }
    ]
  }
}

const internshipModels = {
  "腾讯": {
    "技术类": [
      {
        id: 1,
        name: "腾讯技术实习生画像",
        position: "技术实习生",
        duration: "3-6个月",
        location: "深圳/北京",
        academics: {
          gpa: "3.5+/4.0",
          courses: ["数据结构", "算法设计", "操作系统"]
        },
        skills: ["编程基础", "学习能力", "沟通能力"],
        requirements: ["计算机相关专业", "扎实的编程基础", "良好的团队合作精神"],
        benefits: ["导师指导", "实际项目经验", "转正机会"],
        tags: ["技术", "实习", "导师制"],
        description: "腾讯技术实习生将参与真实项目开发，接受资深工程师指导，获得宝贵的实践经验。",
        rating: 4.8,
        applications: 1200
      }
    ],
    "产品类": [
      {
        id: 2,
        name: "腾讯产品实习生画像",
        position: "产品实习生",
        duration: "3-6个月",
        location: "深圳/北京",
        academics: {
          gpa: "3.4+/4.0",
          courses: ["市场营销", "用户体验", "数据分析"]
        },
        skills: ["需求分析", "用户研究", "产品设计"],
        requirements: ["对互联网产品感兴趣", "良好的沟通能力", "数据敏感度"],
        benefits: ["产品经验", "用户调研", "行业认知"],
        tags: ["产品", "实习", "用户体验"],
        description: "腾讯产品实习生将参与产品设计和用户研究，学习互联网产品的完整开发流程。",
        rating: 4.7,
        applications: 800
      }
    ]
  },
  "阿里巴巴": {
    "技术类": [
      {
        id: 3,
        name: "阿里巴巴技术实习生画像",
        position: "技术实习生",
        duration: "3-6个月",
        location: "杭州/北京",
        academics: {
          gpa: "3.5+/4.0",
          courses: ["Java开发", "数据库", "分布式系统"]
        },
        skills: ["Java/Python", "数据库操作", "系统设计"],
        requirements: ["计算机相关专业", "熟悉主流开发语言", "有项目经验"],
        benefits: ["技术成长", "业务理解", "职业发展"],
        tags: ["技术", "实习", "大数据"],
        description: "阿里巴巴技术实习生将接触大规模分布式系统，学习电商业务的技术实现。",
        rating: 4.8,
        applications: 1500
      }
    ],
    "运营类": [
      {
        id: 4,
        name: "阿里巴巴运营实习生画像",
        position: "运营实习生",
        duration: "3-6个月",
        location: "杭州/北京",
        academics: {
          gpa: "3.3+/4.0",
          courses: ["市场营销", "电子商务", "数据分析"]
        },
        skills: ["数据分析", "内容运营", "用户运营"],
        requirements: ["对电商行业感兴趣", "数据分析能力", "创意思维"],
        benefits: ["运营经验", "数据驱动", "商业思维"],
        tags: ["运营", "实习", "电商"],
        description: "阿里巴巴运营实习生将学习电商平台运营策略，掌握数据驱动的运营方法。",
        rating: 4.6,
        applications: 600
      }
    ]
  },
  "字节跳动": {
    "技术类": [
      {
        id: 5,
        name: "字节跳动技术实习生画像",
        position: "技术实习生",
        duration: "3-6个月",
        location: "北京/上海",
        academics: {
          gpa: "3.6+/4.0",
          courses: ["算法设计", "机器学习", "移动开发"]
        },
        skills: ["算法优化", "机器学习", "移动开发"],
        requirements: ["计算机相关专业", "算法基础扎实", "对人工智能感兴趣"],
        benefits: ["前沿技术", "算法实践", "快速成长"],
        tags: ["技术", "实习", "人工智能"],
        description: "字节跳动技术实习生将参与推荐算法和人工智能技术的开发，接触前沿技术。",
        rating: 4.9,
        applications: 1000
      }
    ],
    "内容类": [
      {
        id: 6,
        name: "字节跳动内容实习生画像",
        position: "内容实习生",
        duration: "3-6个月",
        location: "北京/上海",
        academics: {
          gpa: "3.2+/4.0",
          courses: ["新闻传播", "内容创作", "社交媒体"]
        },
        skills: ["内容创作", "社交媒体", "用户洞察"],
        requirements: ["对内容创作感兴趣", "良好的文字功底", "创意思维"],
        benefits: ["内容运营", "用户理解", "创意实践"],
        tags: ["内容", "实习", "创意"],
        description: "字节跳动内容实习生将参与内容策划和创作，学习短视频和社交媒体运营。",
        rating: 4.7,
        applications: 700
      }
    ]
  }
}

function Badge({ children, variant = "secondary" }: { children: React.ReactNode, variant?: "secondary" | "outline" }) {
  const baseClass = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  const variantClass = variant === "outline" 
    ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  
  return (
    <div className={`${baseClass} ${variantClass}`}>
      {children}
    </div>
  )
}

interface CompanyModel {
  id: number
  name: string
  position: string
  location: string
  academics: {
    gpa: string
    courses: string[]
  }
  competitions: string[]
  internships: string[]
  englishScores: {
    toefl: string
    ielts: string
  }
  skills: string[]
  tags: string[]
  description: string
  rating: number
  consultations: number
}

interface InternshipModel {
  id: number
  name: string
  position: string
  duration: string
  location: string
  academics: {
    gpa: string
    courses: string[]
  }
  skills: string[]
  requirements: string[]
  benefits: string[]
  tags: string[]
  description: string
  rating: number
  applications: number
}

function InternshipCard({ model }: { model: InternshipModel }) {
  const { t } = useLanguage()
  
  return (
    <Card className="hover:shadow-lg transition-shadow min-w-[350px] w-[350px] flex-shrink-0 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{model.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {model.position}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{model.rating}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{model.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>{t('rolemodels.internship.duration')}: {model.duration}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span>GPA: {model.academics.gpa}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>{t('rolemodels.internship.benefits')}: {model.benefits.join(", ")}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {model.tags.map((tag: string) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground flex-1 overflow-auto">
          {model.description}
        </p>

        <div className="flex items-center justify-between pt-2 mt-auto">
          <span className="text-xs text-muted-foreground">{model.applications} {t('rolemodels.internship.applications')}</span>
          <Button size="sm">
            {t('rolemodels.internship.details')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CompanyCard({ model }: { model: CompanyModel }) {
  const { t } = useLanguage()
  
  return (
    <Card className="hover:shadow-lg transition-shadow w-full md:min-w-[350px] md:w-[350px] flex-shrink-0 flex flex-col min-h-[650px] md:h-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{model.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {model.position}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{model.rating}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{model.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>GPA: {model.academics.gpa}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span>{model.competitions.join(", ")}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{model.internships.join(", ")}</span>
        </div>

          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>托福: {model.englishScores.toefl} | 雅思: {model.englishScores.ielts}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {model.tags.map((tag: string) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground flex-1 overflow-auto">
          {model.description}
        </p>

        <div className="flex items-center justify-between pt-2 mt-auto">
          <Button size="sm">
            {t('rolemodels.common.details')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface SchoolModel {
  id: number
  name: string
  graduateMajor: string
  location: string
  academics: {
    gpa: string
    courses: string[]
  }
  competitions: string[]
  research: string[]
  englishScores: {
    toefl: string
    ielts: string
    gre: string
    sat?: string
  }
  skills: string[]
  tags: string[]
  description: string
  rating: number
  consultations: number
}

function SchoolCard({ model }: { model: SchoolModel }) {
  const { t } = useLanguage()
  
  return (
    <Card className="hover:shadow-lg transition-shadow w-full md:min-w-[350px] md:w-[350px] flex-shrink-0 flex flex-col min-h-[650px] md:h-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <School className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{model.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {model.graduateMajor}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{model.rating}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{model.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>GPA: {model.academics.gpa}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span>{model.competitions.join(", ")}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>{model.research.join(", ")}</span>
        </div>

          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>托福: {model.englishScores.toefl} | 雅思: {model.englishScores.ielts}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {model.tags.map((tag: string) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground flex-1 overflow-auto">
          {model.description}
        </p>

        <div className="flex items-center justify-between pt-2 mt-auto">
          <Button size="sm">
            {t('rolemodels.common.details')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// 公司行组件
function CompanyRow({ company, positions }: { company: string, positions: Record<string, CompanyModel[]> }) {
  return (
    <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{company}</h2>
              </div>
              <ScrollableContainer>
                {Object.entries(positions).map(([position, models]) => (
                  models.map((model) => (
            <div key={`${company}-${position}-${model.id}`} className="mr-4 min-w-[350px]">
              <div className="mb-2 flex items-center gap-2 md:ml-0">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-base font-medium">{position}</span>
                      </div>
                      <CompanyCard model={model} />
                    </div>
                  ))
                ))}
              </ScrollableContainer>
            </div>
  );
}

// 学校行组件
function SchoolRow({ school, majors }: { school: string, majors: Record<string, SchoolModel[]> }) {
  return (
    <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <School className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{school}</h2>
              </div>
              <ScrollableContainer>
                {Object.entries(majors).map(([major, models]) => (
                  models.map((model) => (
            <div key={`${school}-${major}-${model.id}`} className="mr-4 min-w-[350px]">
              <div className="mb-2 flex items-center gap-2 md:ml-0">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-base font-medium">{major}</span>
                      </div>
                      <SchoolCard model={model} />
                    </div>
                  ))
                ))}
              </ScrollableContainer>
            </div>
  );
}

// 实习行组件
function InternshipRow({ company, categories }: { company: string, categories: Record<string, InternshipModel[]> }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Building className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold">{company}</h2>
      </div>
      <ScrollableContainer>
        {Object.entries(categories).map(([category, models]) => (
          models.map((model) => (
            <div key={`${company}-${category}-${model.id}`} className="mr-4 min-w-[350px]">
              <div className="mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-base font-medium">{category}</span>
              </div>
              <InternshipCard model={model} />
            </div>
          ))
        ))}
      </ScrollableContainer>
    </div>
  );
}

export default function RoleModels() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("companies")
  
  return (
    <div className="p-6">
      {/* 电脑端布局：标题和可能性卡片在同一行 */}
      <div className="mb-6 hidden md:flex justify-between items-start gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Role Models</h1>
          <p className="text-muted-foreground">{t('rolemodels.description')}</p>
        </div>
        <div className="flex-shrink-0">
          <PossibilityCard activeTab={activeTab} />
        </div>
      </div>
      
      {/* 手机端布局：标题和可能性卡片分开显示 */}
      <div className="mb-6 md:hidden">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Role Models</h1>
          <p className="text-muted-foreground">{t('rolemodels.description')}</p>
        </div>
        <div className="flex justify-center">
          <PossibilityCard activeTab={activeTab} />
        </div>
      </div>

      <Tabs defaultValue="companies" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="companies">{t('rolemodels.tab.companies')}</TabsTrigger>
          <TabsTrigger value="schools">{t('rolemodels.tab.schools')}</TabsTrigger>
          <TabsTrigger value="internships">{t('rolemodels.tab.internships')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="companies">
          {Object.entries(companyModels).map(([company, positions]) => (
            <CompanyRow key={company} company={company} positions={positions} />
          ))}
        </TabsContent>
        
        <TabsContent value="schools">
          {Object.entries(schoolModels).map(([school, majors]) => (
            <SchoolRow key={school} school={school} majors={majors} />
          ))}
        </TabsContent>
        
        <TabsContent value="internships">
          {Object.entries(internshipModels).map(([company, categories]) => (
            <InternshipRow key={company} company={company} categories={categories} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}