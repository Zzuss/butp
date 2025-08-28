"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Briefcase, MapPin, Star, Building, School, Award, BookOpen, Layers, Globe } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollableContainer } from "../../components/ui/scrollable-container"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/AuthContext"
import { getUserProbabilityData } from "@/lib/dashboard-data"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// 公司名称映射表
const companyNameMap: Record<string, string> = {
  '腾讯': 'companies.tencent',
  '字节跳动': 'companies.bytedance', 
  '阿里巴巴': 'companies.alibaba',
  '百度': 'companies.baidu',
  '华为': 'companies.huawei',
  '商汤科技': 'companies.sensetime',
  '旷视科技': 'companies.megvii',
  '小米': 'companies.xiaomi',
  '京东': 'companies.jd',
  '美团': 'companies.meituan',
  '网易': 'companies.netease',
  '快手': 'companies.kuaishou',
  '滴滴': 'companies.didi',
  '小红书': 'companies.xiaohongshu',
  '哔哩哔哩': 'companies.bilibili',
  '知乎': 'companies.zhihu',
  '豆瓣': 'companies.douban',
  '拼多多': 'companies.pinduoduo',
  'OPPO': 'companies.oppo',
  'vivo': 'companies.vivo',
  '蔚来': 'companies.nio',
  '理想汽车': 'companies.ideal',
  '微博': 'companies.weibo'
}

// 学校名称映射表
const schoolNameMap: Record<string, string> = {
  '清华大学': 'schools.tsinghua',
  '北京大学': 'schools.peking',
  '上海交通大学': 'schools.sjtu',
  '浙江大学': 'schools.zju',
  '华中科技大学': 'schools.hust',
  '北京航空航天大学': 'schools.buaa',
  '哈尔滨工业大学': 'schools.hit',
  '复旦大学': 'schools.fudan',
  '南京大学': 'schools.nju',
  '中国科学技术大学': 'schools.ustc',
  '西安交通大学': 'schools.xjtu',
  '北京邮电大学': 'schools.bupt',
  '电子科技大学': 'schools.uestc',
  '西安电子科技大学': 'schools.xidian',
  '东南大学': 'schools.seu',
  '北京理工大学': 'schools.bit',
  '大连理工大学': 'schools.dlut',
  '中山大学': 'schools.sysu',
  '华东师范大学': 'schools.ecnu'
}

// 翻译函数
function translateCompanyName(companyName: string, t: (key: string) => string): string {
  const translationKey = companyNameMap[companyName]
  return translationKey ? t(translationKey) : companyName
}

function translateSchoolName(schoolName: string, t: (key: string) => string): string {
  const translationKey = schoolNameMap[schoolName]
  return translationKey ? t(translationKey) : schoolName
}

function translateCompanyList(companies: string[], t: (key: string) => string): string[] {
  return companies.map(company => translateCompanyName(company, t))
}

function translateSchoolList(schools: string[], t: (key: string) => string): string[] {
  return schools.map(school => translateSchoolName(school, t))
}



// 可能性卡片组件
function PossibilityCard({ activeTab }: { activeTab: string }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [probabilityData, setProbabilityData] = useState<{
    proba_1: number;
    proba_2: number;
    proba_3: number;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 获取用户概率数据
  useEffect(() => {
    async function fetchProbabilityData() {
      if (user?.isLoggedIn) {
        try {
          const data = await getUserProbabilityData(user.userId)
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
  }, [user])
  
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

// 按岗位分类的角色模型数据
const positionModels = {
  "大模型工程师": [
    {
      id: 1,
      name: "大模型工程师画像(研究型)",
      position: "大模型工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["腾讯", "字节跳动", "阿里巴巴", "百度", "华为", "商汤科技", "旷视科技"],
      academics: {
        gpa: "3.8+/4.0",
        courses: ["深度学习", "自然语言处理", "分布式系统", "机器学习", "神经网络", "数据挖掘"]
      },
      competitions: ["ACM程序设计大赛", "互联网+创新创业大赛", "AI算法竞赛", "KAGGLE竞赛"],
      internships: ["大厂AI实验室实习", "算法团队实习", "研究院实习"],
      englishScores: {
        toefl: "105+",
        ielts: "7.0+"
      },
      skills: ["大模型训练", "分布式计算", "算法优化", "PyTorch/TensorFlow", "CUDA编程", "模型部署"],
      tags: ["大模型", "人工智能", "深度学习", "NLP"],
      description: "研究型大模型工程师专注于前沿算法研究，需具备扎实的深度学习理论基础，熟悉大规模分布式训练，有顶级竞赛和实习经验。",
      rating: 4.9,
      consultations: 120
    },
    {
      id: 11,
      name: "大模型工程师画像(应用型)",
      position: "大模型工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["字节跳动", "百度", "小米", "京东", "美团", "网易", "快手"],
      academics: {
        gpa: "3.7+/4.0",
        courses: ["深度学习", "软件工程", "系统设计", "机器学习", "数据库", "云计算"]
      },
      competitions: ["AI应用竞赛", "黑客马拉松", "创新创业大赛"],
      internships: ["大模型产品实习", "AI应用开发实习", "算法工程实习"],
      englishScores: {
        toefl: "100+",
        ielts: "6.5+"
      },
      skills: ["模型微调", "API开发", "系统集成", "性能优化", "云平台部署", "产品化"],
      tags: ["大模型", "应用开发", "产品化", "系统集成"],
      description: "应用型大模型工程师专注于大模型的产品化和工程实现，需要较强的系统开发能力和产品思维。",
      rating: 4.7,
      consultations: 95
    }
  ],
  "算法工程师": [
    {
      id: 2,
      name: "算法工程师画像(推荐系统)",
      position: "算法工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["腾讯", "阿里巴巴", "字节跳动", "百度", "美团", "京东", "网易", "滴滴", "快手", "小红书"],
      academics: {
        gpa: "3.8+/4.0",
        courses: ["机器学习", "数据挖掘", "算法设计", "统计学", "推荐系统", "计算机视觉"]
      },
      competitions: ["ACM程序设计大赛", "天池大数据竞赛", "KAGGLE竞赛", "数学建模竞赛"],
      internships: ["互联网公司算法实习", "推荐算法实习", "数据挖掘实习"],
      englishScores: {
        toefl: "105+",
        ielts: "7.0+"
      },
      skills: ["机器学习", "数据挖掘", "Python/Java", "推荐算法", "深度学习", "A/B测试"],
      tags: ["算法", "推荐系统", "机器学习", "大数据"],
      description: "推荐算法工程师专注于个性化推荐系统，需有扎实的算法理论基础，参与过算法竞赛，具备数据分析和机器学习能力。",
      rating: 4.8,
      consultations: 100
    },
    {
      id: 12,
      name: "算法工程师画像(计算机视觉)",
      position: "算法工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["商汤科技", "旷视科技", "字节跳动", "腾讯", "百度", "华为", "阿里达摩院"],
      academics: {
        gpa: "3.8+/4.0",
        courses: ["计算机视觉", "深度学习", "数字图像处理", "模式识别", "神经网络", "机器学习"]
      },
      competitions: ["CVPR竞赛", "ImageNet竞赛", "AI算法竞赛", "计算机视觉挑战赛"],
      internships: ["计算机视觉实习", "图像算法实习", "AI视觉产品实习"],
      englishScores: {
        toefl: "108+",
        ielts: "7.5+"
      },
      skills: ["CNN", "目标检测", "图像分割", "人脸识别", "OpenCV", "PyTorch"],
      tags: ["计算机视觉", "深度学习", "图像处理", "AI"],
      description: "计算机视觉算法工程师专注于图像和视频分析，需要扎实的数学基础和深度学习知识，有相关竞赛经验。",
      rating: 4.9,
      consultations: 85
    }
  ],
  
  "前端工程师": [
    {
      id: 3,
      name: "前端工程师画像(React生态)",
      position: "前端工程师",
      location: "北京/深圳/杭州/上海/广州",
      companies: ["腾讯", "阿里巴巴", "字节跳动", "百度", "美团", "京东", "网易", "携程", "哔哩哔哩", "小米"],
      academics: {
        gpa: "3.6+/4.0",
        courses: ["Web开发", "数据结构", "计算机网络", "软件工程", "人机交互", "UI/UX设计"]
      },
      competitions: ["前端开发大赛", "Web设计竞赛", "创新创业大赛"],
      internships: ["前端开发实习", "UI/UX实习", "全栈开发实习"],
      englishScores: {
        toefl: "95+",
        ielts: "6.5+"
      },
      skills: ["React", "JavaScript/TypeScript", "HTML/CSS", "前端工程化", "性能优化", "移动端开发"],
      tags: ["前端", "React", "JavaScript", "TypeScript"],
      description: "React生态前端工程师专注于React技术栈，需熟悉React生态系统，有大型项目开发经验，注重用户体验和性能优化。",
      rating: 4.7,
      consultations: 85
    },
    {
      id: 13,
      name: "前端工程师画像(Vue生态)",
      position: "前端工程师",
      location: "北京/深圳/杭州/上海/广州",
      companies: ["阿里巴巴", "腾讯", "字节跳动", "美团", "京东", "滴滴", "快手", "小红书"],
      academics: {
        gpa: "3.6+/4.0",
        courses: ["Web开发", "数据结构", "软件工程", "人机交互", "UI/UX设计"]
      },
      competitions: ["Vue开发竞赛", "前端技能大赛", "开源贡献奖"],
      internships: ["Vue项目实习", "前端框架实习", "中后台开发实习"],
      englishScores: {
        toefl: "92+",
        ielts: "6.0+"
      },
      skills: ["Vue3", "JavaScript/TypeScript", "Element Plus", "Vite", "组件库开发", "中后台开发"],
      tags: ["前端", "Vue", "JavaScript", "组件库"],
      description: "Vue生态前端工程师专注于Vue技术栈，擅长中后台系统开发，熟悉Vue生态和组件库开发。",
      rating: 4.6,
      consultations: 78
    }
  ],
  
  "后端工程师": [
    {
      id: 4,
      name: "后端工程师画像(Java生态)",
      position: "后端工程师",
      location: "北京/深圳/杭州/上海/成都",
      companies: ["腾讯", "阿里巴巴", "字节跳动", "百度", "美团", "京东", "网易", "滴滴", "快手", "拼多多"],
      academics: {
        gpa: "3.7+/4.0",
        courses: ["数据结构与算法", "操作系统", "计算机网络", "数据库", "分布式系统", "软件架构"]
      },
      competitions: ["ACM程序设计大赛", "软件设计大赛", "云计算竞赛"],
      internships: ["后端开发实习", "系统架构实习", "云计算实习"],
      englishScores: {
        toefl: "100+",
        ielts: "6.5+"
      },
      skills: ["Java", "Spring Boot", "MySQL/Redis", "微服务架构", "高并发系统设计", "云计算"],
      tags: ["后端", "Java", "Spring", "微服务", "分布式"],
      description: "Java后端工程师专注于Java生态系统，熟悉Spring框架，有高并发系统开发经验。负责企业级应用开发和架构设计。",
      rating: 4.8,
      consultations: 98
    },
    {
      id: 14,
      name: "后端工程师画像(Go云原生)",
      position: "后端工程师",
      location: "北京/深圳/杭州/上海/成都",
      companies: ["字节跳动", "腾讯", "百度", "滴滴", "美团", "快手", "小米", "华为"],
      academics: {
        gpa: "3.7+/4.0",
        courses: ["数据结构与算法", "操作系统", "计算机网络", "分布式系统", "云计算", "容器技术"]
      },
      competitions: ["云原生技术竞赛", "开源贡献奖", "系统架构设计大赛"],
      internships: ["云原生开发实习", "Go语言实习", "容器化实习"],
      englishScores: {
        toefl: "95+",
        ielts: "6.5+"
      },
      skills: ["Go语言", "Kubernetes", "Docker", "gRPC", "云原生架构", "性能优化"],
      tags: ["后端", "Go", "云原生", "Kubernetes", "微服务"],
      description: "Go云原生后端工程师专注于高性能系统开发，熟悉云原生技术栈，有大规模分布式系统经验。",
      rating: 4.9,
      consultations: 88
    }
  ],
  
  "全栈工程师": [
    {
      id: 5,
      name: "全栈工程师画像(创业型)",
      position: "全栈工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["字节跳动", "小红书", "快手", "B站", "知乎", "豆瓣", "36氪", "虎扑", "Boss直聘", "猿辅导"],
      academics: {
        gpa: "3.7+/4.0",
        courses: ["Web开发", "数据结构", "数据库", "软件工程", "项目管理", "产品设计"]
      },
      competitions: ["全栈开发大赛", "Hackathon", "创新创业大赛"],
      internships: ["全栈开发实习", "创业公司实习", "产品开发实习"],
      englishScores: {
        toefl: "100+",
        ielts: "6.5+"
      },
      skills: ["前后端技术栈", "数据库设计", "API设计", "DevOps", "产品思维", "项目管理"],
      tags: ["全栈", "创业", "产品", "快速开发"],
      description: "创业型全栈工程师需具备前后端开发能力，能够独立完成产品开发。适合初创公司和需要快速迭代的项目。",
      rating: 4.6,
      consultations: 75
    }
  ],
  
  "移动端工程师": [
    {
      id: 6,
      name: "移动端工程师画像(iOS原生)",
      position: "移动端工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["腾讯", "字节跳动", "阿里巴巴", "百度", "美团", "滴滴", "快手", "小红书", "哔哩哔哩", "抖音"],
      academics: {
        gpa: "3.6+/4.0",
        courses: ["移动开发", "数据结构", "操作系统", "计算机网络", "软件工程"]
      },
      competitions: ["移动应用开发大赛", "创新创业大赛", "黑客马拉松"],
      internships: ["移动端开发实习", "iOS开发实习", "Swift开发实习"],
      englishScores: {
        toefl: "95+",
        ielts: "6.5+"
      },
      skills: ["iOS开发", "Swift", "Objective-C", "UIKit", "SwiftUI", "性能优化"],
      tags: ["移动端", "iOS", "Swift", "原生开发"],
      description: "iOS原生工程师专注于iOS平台应用开发，熟悉Swift和UIKit，注重用户体验和性能优化。",
      rating: 4.7,
      consultations: 88
    }
  ],
  
  "DevOps工程师": [{
    id: 7,
    name: "DevOps工程师画像",
    position: "DevOps工程师",
    location: "北京/深圳/杭州/上海",
    companies: ["腾讯", "阿里巴巴", "字节跳动", "华为", "美团", "京东", "网易", "滴滴", "蚂蚁金服", "小米"],
    academics: {
      gpa: "3.5+/4.0",
      courses: ["操作系统", "计算机网络", "云计算", "容器技术", "自动化运维", "监控系统"]
    },
    competitions: ["云计算大赛", "运维技能竞赛", "自动化竞赛"],
    internships: ["运维开发实习", "云计算实习", "自动化运维实习"],
    englishScores: {
      toefl: "90+",
      ielts: "6.0+"
    },
    skills: ["Docker/Kubernetes", "CI/CD", "云平台", "监控告警", "自动化脚本", "Linux系统"],
    tags: ["DevOps", "云计算", "容器", "自动化", "运维"],
    description: "DevOps工程师负责开发和运维的协作，构建自动化部署和监控体系，提升系统稳定性和开发效率。",
    rating: 4.6,
    consultations: 65
  }],
  
  "数据工程师": [{
    id: 8,
    name: "数据工程师画像",
    position: "数据工程师",
    location: "北京/深圳/杭州/上海",
    companies: ["阿里巴巴", "腾讯", "字节跳动", "百度", "美团", "京东", "滴滴", "快手", "蚂蚁金服", "小红书"],
    academics: {
      gpa: "3.7+/4.0",
      courses: ["大数据技术", "数据库", "数据挖掘", "统计学", "机器学习", "数据仓库"]
    },
    competitions: ["大数据竞赛", "数据分析大赛", "AI算法竞赛"],
    internships: ["大数据开发实习", "数据平台实习", "数据分析实习"],
    englishScores: {
      toefl: "100+",
      ielts: "6.5+"
    },
    skills: ["Hadoop/Spark", "SQL/NoSQL", "Python/Scala", "数据建模", "ETL开发", "实时计算"],
    tags: ["大数据", "数据工程", "Spark", "Hadoop", "ETL"],
    description: "数据工程师负责大数据平台建设，数据采集、存储、处理和分析，为业务决策提供数据支撑。",
    rating: 4.7,
    consultations: 78
  }],
  
  "产品经理": [{
    id: 9,
    name: "产品经理画像",
    position: "产品经理",
    location: "北京/深圳/杭州/上海",
    companies: ["腾讯", "阿里巴巴", "字节跳动", "百度", "美团", "京东", "网易", "滴滴", "小红书", "知乎"],
    academics: {
      gpa: "3.6+/4.0",
      courses: ["产品管理", "用户体验", "市场营销", "数据分析", "商业模式", "项目管理"]
    },
    competitions: ["产品设计大赛", "创新创业大赛", "商业计划大赛"],
    internships: ["产品经理实习", "用户研究实习", "商业分析实习"],
    englishScores: {
      toefl: "95+",
      ielts: "6.5+"
    },
    skills: ["需求分析", "用户研究", "产品设计", "数据分析", "项目管理", "商业洞察"],
    tags: ["产品", "用户体验", "需求分析", "项目管理"],
    description: "产品经理负责产品规划、设计和管理，需要良好的沟通能力和商业敏感度，关注用户需求和市场趋势。",
    rating: 4.7,
    consultations: 92
  }],
  
  "UI/UX设计师": [{
    id: 10,
    name: "UI/UX设计师画像",
    position: "UI/UX设计师",
    location: "北京/深圳/杭州/上海/广州",
    companies: ["腾讯", "阿里巴巴", "字节跳动", "百度", "网易", "小米", "OPPO", "vivo", "华为", "蔚来"],
    academics: {
      gpa: "3.5+/4.0",
      courses: ["视觉传达", "交互设计", "用户体验", "心理学", "人机交互", "设计思维"]
    },
    competitions: ["设计大赛", "UI设计竞赛", "创意设计挑战赛"],
    internships: ["UI设计实习", "用户体验实习", "视觉设计实习"],
    englishScores: {
      toefl: "90+",
      ielts: "6.0+"
    },
    skills: ["Figma/Sketch", "Photoshop/Illustrator", "原型设计", "用户研究", "设计系统", "交互设计"],
    tags: ["UI设计", "UX设计", "交互设计", "视觉设计", "用户体验"],
    description: "UI/UX设计师负责产品界面和用户体验设计，需要良好的设计能力和用户洞察力，关注设计美学和易用性。",
    rating: 4.6,
    consultations: 68
  }]
}

const majorModels = {
  "计算机科学与技术": [
    {
      id: 1,
      name: "计算机科学与技术研究生画像(算法方向)",
      graduateMajor: "计算机科学与技术",
      location: "北京/上海/深圳/杭州",
      schools: ["清华大学", "北京大学", "中科院计算所", "上海交通大学", "浙江大学", "华中科技大学", "北京航空航天大学", "哈尔滨工业大学"],
      academics: {
        gpa: "3.85+/4.0",
        courses: ["数据结构", "操作系统", "人工智能", "算法设计", "分布式系统", "机器学习"]
      },
      competitions: ["ACM程序设计大赛", "全国大学生数学竞赛", "CCF编程竞赛", "ICPC竞赛"],
      research: ["发表高水平论文", "参与国家级科研项目", "开源项目贡献"],
      englishScores: {
        toefl: "112+",
        ielts: "7.5+",
        gre: "328+"
      },
      skills: ["算法设计", "编程实现", "科研能力", "团队协作", "系统设计", "学术写作"],
      tags: ["计算机", "算法", "科研", "竞赛"],
      description: "算法方向计算机科学与技术研究生专注于算法理论研究，需有扎实的数学和编程基础，积极参与ACM等算法竞赛。",
      rating: 4.9,
      consultations: 150
    },
    {
      id: 21,
      name: "计算机科学与技术研究生画像(系统方向)",
      graduateMajor: "计算机科学与技术",
      location: "北京/上海/深圳/杭州",
      schools: ["清华大学", "北京大学", "上海交通大学", "浙江大学", "华中科技大学", "北京航空航天大学", "中科院计算所"],
      academics: {
        gpa: "3.8+/4.0",
        courses: ["操作系统", "分布式系统", "计算机网络", "数据库系统", "编译原理", "系统架构"]
      },
      competitions: ["系统设计大赛", "开源贡献奖", "云计算竞赛"],
      research: ["系统软件研究", "分布式系统", "云计算技术"],
      englishScores: {
        toefl: "108+",
        ielts: "7.0+",
        gre: "325+"
      },
      skills: ["系统设计", "分布式架构", "性能优化", "开源贡献", "工程实践", "技术写作"],
      tags: ["计算机", "系统", "分布式", "工程"],
      description: "系统方向计算机科学与技术研究生专注于计算机系统研究，擅长大规模分布式系统设计和性能优化。",
      rating: 4.8,
      consultations: 125
    }
  ],
  
  "电子信息工程": [{
    id: 2,
    name: "电子信息工程研究生画像",
    graduateMajor: "电子信息工程",
    location: "北京/西安/成都/深圳",
    schools: ["清华大学", "北京邮电大学", "电子科技大学", "西安电子科技大学", "华中科技大学", "北京理工大学", "哈尔滨工业大学", "东南大学"],
    academics: {
      gpa: "3.8+/4.0",
      courses: ["信号与系统", "数字电路", "通信原理", "嵌入式系统", "射频电路", "FPGA设计"]
    },
    competitions: ["全国大学生电子设计竞赛", "挑战杯学术竞赛", "集成电路设计大赛", "智能车竞赛"],
    research: ["发表SCI/EI检索论文", "参与国家级科研项目", "申请发明专利"],
    englishScores: {
      toefl: "110+",
      ielts: "7.5+",
      gre: "325+"
    },
    skills: ["电路设计", "嵌入式开发", "FPGA编程", "PCB设计", "信号处理", "硬件调试"],
    tags: ["电子", "嵌入式", "通信", "集成电路"],
    description: "电子信息工程研究生需具备扎实的电路与信号处理基础，积极参与电子设计竞赛和科研项目，有较强的硬件开发能力。",
    rating: 4.8,
    consultations: 120
  }],
  
  "通信工程": [{
    id: 3,
    name: "通信工程研究生画像",
    graduateMajor: "通信工程",
    location: "北京/深圳/西安/成都",
    schools: ["北京邮电大学", "电子科技大学", "西安电子科技大学", "清华大学", "北京理工大学", "华中科技大学", "东南大学", "大连理工大学"],
    academics: {
      gpa: "3.8+/4.0",
      courses: ["通信原理", "信号处理", "无线通信", "网络协议", "天线理论", "移动通信"]
    },
    competitions: ["全国大学生电子设计竞赛", "通信技术竞赛", "无线电测向竞赛"],
    research: ["5G/6G技术研究", "无线通信算法", "网络优化研究"],
    englishScores: {
      toefl: "108+",
      ielts: "7.0+",
      gre: "320+"
    },
    skills: ["通信协议", "信号处理", "网络规划", "RF设计", "MATLAB仿真", "基站调试"],
    tags: ["通信", "5G", "无线", "网络"],
    description: "通信工程研究生专注于通信系统和网络技术研究，需要扎实的通信理论基础和实践能力，关注5G/6G等前沿技术。",
    rating: 4.7,
    consultations: 95
  }],
  
  "软件工程": [{
    id: 4,
    name: "软件工程研究生画像",
    graduateMajor: "软件工程",
    location: "北京/上海/深圳/杭州/南京",
    schools: ["北京航空航天大学", "华东师范大学", "大连理工大学", "中山大学", "华中科技大学", "西北大学", "复旦大学", "南京大学"],
    academics: {
      gpa: "3.7+/4.0",
      courses: ["软件架构", "项目管理", "数据库系统", "Web开发", "移动开发", "软件测试"]
    },
    competitions: ["软件设计大赛", "创新创业大赛", "开源软件竞赛", "Hackathon"],
    research: ["软件工程方法", "敏捷开发", "DevOps实践", "软件质量"],
    englishScores: {
      toefl: "105+",
      ielts: "7.0+",
      gre: "320+"
    },
    skills: ["软件架构设计", "项目管理", "团队协作", "敏捷开发", "代码质量", "测试自动化"],
    tags: ["软件工程", "项目管理", "架构设计", "敏捷开发"],
    description: "软件工程研究生注重软件开发的工程化方法，具备良好的项目管理和团队协作能力，熟悉软件开发全生命周期。",
    rating: 4.6,
    consultations: 88
  }],
  
  "人工智能": [{
    id: 5,
    name: "人工智能研究生画像",
    graduateMajor: "人工智能",
    location: "北京/上海/深圳/杭州",
    schools: ["清华大学", "北京大学", "中科院自动化所", "上海交通大学", "浙江大学", "南京大学", "中国科学技术大学", "西安交通大学"],
    academics: {
      gpa: "3.9+/4.0",
      courses: ["机器学习", "深度学习", "计算机视觉", "自然语言处理", "强化学习", "神经网络"]
    },
    competitions: ["AI算法竞赛", "KAGGLE竞赛", "机器人大赛", "智能驾驶竞赛"],
    research: ["顶级会议论文", "AI算法创新", "产学研合作项目"],
    englishScores: {
      toefl: "115+",
      ielts: "8.0+",
      gre: "330+"
    },
    skills: ["深度学习", "算法设计", "模型优化", "科研创新", "Python/PyTorch", "数据分析"],
    tags: ["人工智能", "深度学习", "机器学习", "算法"],
    description: "人工智能研究生是当前最热门的专业方向，需要扎实的数学和编程基础，强烈的科研兴趣和创新能力。",
    rating: 5.0,
    consultations: 180
  }],
  
  "数据科学与大数据技术": [{
    id: 6,
    name: "数据科学与大数据技术研究生画像",
    graduateMajor: "数据科学与大数据技术",
    location: "北京/上海/深圳/杭州",
    schools: ["清华大学", "北京大学", "复旦大学", "上海交通大学", "中南大学", "华中科技大学", "西安交通大学", "中山大学"],
    academics: {
      gpa: "3.8+/4.0",
      courses: ["大数据技术", "数据挖掘", "统计学", "机器学习", "数据可视化", "云计算"]
    },
    competitions: ["大数据竞赛", "数据分析大赛", "统计建模竞赛"],
    research: ["大数据算法", "数据挖掘应用", "商业智能"],
    englishScores: {
      toefl: "108+",
      ielts: "7.5+",
      gre: "325+"
    },
    skills: ["大数据处理", "数据分析", "机器学习", "数据可视化", "Hadoop/Spark", "SQL/NoSQL"],
    tags: ["大数据", "数据科学", "数据挖掘", "统计"],
    description: "数据科学与大数据技术研究生专注于海量数据的处理和分析，需要扎实的统计学和编程基础。",
    rating: 4.8,
    consultations: 125
  }],
  
  "网络空间安全": [{
    id: 7,
    name: "网络空间安全研究生画像",
    graduateMajor: "网络空间安全",
    location: "北京/上海/西安/成都",
    schools: ["清华大学", "北京邮电大学", "西安电子科技大学", "华中科技大学", "北京理工大学", "哈尔滨工业大学", "电子科技大学", "东南大学"],
    academics: {
      gpa: "3.7+/4.0",
      courses: ["密码学", "网络安全", "系统安全", "Web安全", "区块链技术", "渗透测试"]
    },
    competitions: ["CTF竞赛", "网络安全大赛", "密码技术竞赛"],
    research: ["网络安全技术", "密码算法", "区块链应用"],
    englishScores: {
      toefl: "105+",
      ielts: "7.0+",
      gre: "320+"
    },
    skills: ["渗透测试", "漏洞分析", "密码学", "安全评估", "逆向工程", "安全编程"],
    tags: ["网络安全", "密码学", "渗透测试", "区块链"],
    description: "网络空间安全研究生专注于信息安全技术研究，需要扎实的密码学和网络技术基础，具备安全思维。",
    rating: 4.7,
    consultations: 95
  }],
  
  "物联网工程": [{
    id: 8,
    name: "物联网工程研究生画像",
    graduateMajor: "物联网工程",
    location: "北京/上海/深圳/无锡",
    schools: ["清华大学", "北京邮电大学", "华中科技大学", "西北大学", "大连理工大学", "江南大学", "中南大学", "重庆邮电大学"],
    academics: {
      gpa: "3.7+/4.0",
      courses: ["传感器技术", "无线通信", "嵌入式系统", "云计算", "边缘计算", "数据分析"]
    },
    competitions: ["物联网应用竞赛", "智能硬件大赛", "创新创业大赛"],
    research: ["物联网架构", "边缘计算", "智能感知"],
    englishScores: {
      toefl: "100+",
      ielts: "6.5+",
      gre: "315+"
    },
    skills: ["嵌入式开发", "传感器集成", "无线通信", "云平台开发", "数据处理", "系统集成"],
    tags: ["物联网", "嵌入式", "传感器", "边缘计算"],
    description: "物联网工程研究生专注于万物互联技术，需要掌握从硬件到软件的全栈技术，具备系统集成能力。",
    rating: 4.5,
    consultations: 78
  }]
}

const internshipModels = {
  "技术实习": [
    {
      id: 1,
      name: "技术实习生画像(后端开发)",
      position: "技术实习生",
      duration: "3-6个月",
      location: "北京/深圳/杭州/上海",
      companies: ["腾讯", "阿里巴巴", "字节跳动", "百度", "美团", "京东", "网易", "华为", "小米", "滴滴"],
      academics: {
        gpa: "3.5+/4.0",
        courses: ["数据结构", "算法设计", "操作系统", "计算机网络", "数据库"]
      },
      skills: ["编程基础", "算法能力", "系统设计", "团队协作", "学习能力"],
      requirements: ["计算机相关专业", "扎实的编程基础", "良好的团队合作精神", "有项目经验优先"],
      benefits: ["导师指导", "实际项目经验", "转正机会", "技术成长"],
      tags: ["技术", "后端", "实习", "导师制"],
      description: "后端技术实习生将参与服务端开发，学习大规模分布式系统架构，接受资深工程师指导，获得宝贵的工程实践经验。",
      rating: 4.8,
      applications: 1200
    },
    {
      id: 11,
      name: "技术实习生画像(前端开发)",
      position: "技术实习生",
      duration: "3-6个月",
      location: "北京/深圳/杭州/上海",
      companies: ["字节跳动", "腾讯", "阿里巴巴", "美团", "京东", "哔哩哔哩", "小红书", "快手", "网易", "滴滴"],
      academics: {
        gpa: "3.4+/4.0",
        courses: ["Web开发", "数据结构", "软件工程", "人机交互", "UI/UX设计"]
      },
      skills: ["前端框架", "JavaScript", "UI/UX理解", "用户体验", "创新思维"],
      requirements: ["熟悉前端技术栈", "有作品展示", "良好的审美能力", "对用户体验敏感"],
      benefits: ["前端技术提升", "用户体验学习", "作品展示机会", "行业认知"],
      tags: ["技术", "前端", "实习", "用户体验"],
      description: "前端技术实习生将参与Web应用和移动端开发，学习用户体验设计，掌握现代前端技术栈和工程化实践。",
      rating: 4.7,
      applications: 950
    },
    {
      id: 12,
      name: "技术实习生画像(算法工程)",
      position: "技术实习生",
      duration: "3-6个月", 
      location: "北京/深圳/杭州/上海",
      companies: ["字节跳动", "腾讯", "阿里巴巴", "百度", "商汤科技", "旷视科技", "华为", "小米"],
      academics: {
        gpa: "3.6+/4.0",
        courses: ["算法设计", "机器学习", "深度学习", "数据挖掘", "统计学"]
      },
      skills: ["算法优化", "机器学习", "数据分析", "数学建模", "编程实现"],
      requirements: ["算法基础扎实", "对人工智能感兴趣", "有竞赛经验优先", "数学功底好"],
      benefits: ["前沿技术接触", "算法实践", "竞赛指导", "快速成长"],
      tags: ["技术", "算法", "AI", "实习"],
      description: "算法技术实习生将参与推荐系统、机器学习项目开发，接触前沿AI技术，在导师指导下提升算法工程能力。",
      rating: 4.9,
      applications: 800
    }
  ],
  "产品实习": [
    {
      id: 2,
      name: "产品实习生画像(C端产品)",
      position: "产品实习生",
      duration: "3-6个月",
      location: "北京/深圳/杭州/上海",
      companies: ["腾讯", "字节跳动", "阿里巴巴", "百度", "小红书", "快手", "哔哩哔哩", "网易", "知乎", "豆瓣"],
      academics: {
        gpa: "3.4+/4.0",
        courses: ["市场营销", "用户体验", "数据分析", "心理学", "商业模式"]
      },
      skills: ["需求分析", "用户研究", "产品设计", "数据分析", "沟通协调"],
      requirements: ["对互联网产品感兴趣", "良好的沟通能力", "数据敏感度", "用户思维"],
      benefits: ["产品经验", "用户调研", "行业认知", "商业思维"],
      tags: ["产品", "C端", "用户体验", "实习"],
      description: "C端产品实习生将参与消费者产品设计和用户研究，学习互联网产品的完整开发流程，培养产品感和商业思维。",
      rating: 4.7,
      applications: 800
    },
    {
      id: 13,
      name: "产品实习生画像(B端产品)",
      position: "产品实习生", 
      duration: "3-6个月",
      location: "北京/深圳/杭州/上海",
      companies: ["阿里巴巴", "腾讯", "华为", "京东", "美团", "滴滴", "字节跳动", "百度"],
      academics: {
        gpa: "3.5+/4.0",
        courses: ["企业管理", "信息系统", "数据分析", "商业模式", "项目管理"]
      },
      skills: ["业务理解", "系统分析", "流程设计", "B端思维", "项目管理"],
      requirements: ["理解企业业务流程", "逻辑思维强", "沟通能力好", "有责任心"],
      benefits: ["B端产品经验", "企业业务理解", "系统性思维", "职业发展"],
      tags: ["产品", "B端", "企业服务", "实习"],
      description: "B端产品实习生将参与企业级产品设计，学习复杂业务系统的产品化，培养系统性思维和企业服务能力。",
      rating: 4.6,
      applications: 650
    }
  ],
  "运营实习": [
    {
      id: 4,
      name: "运营实习生画像(内容运营)",
      position: "运营实习生",
      duration: "3-6个月",
      location: "北京/深圳/杭州/上海",
      companies: ["字节跳动", "小红书", "哔哩哔哩", "快手", "阿里巴巴", "腾讯", "网易", "知乎", "豆瓣", "微博"],
      academics: {
        gpa: "3.3+/4.0",
        courses: ["市场营销", "新闻传播", "数据分析", "心理学", "创意写作"]
      },
      skills: ["内容创作", "数据分析", "用户洞察", "创意策划", "社交媒体运营"],
      requirements: ["对内容创作感兴趣", "文字功底好", "创意思维", "网感敏锐"],
      benefits: ["内容运营经验", "创意实践", "用户理解", "行业认知"],
      tags: ["运营", "内容", "创意", "实习"],
      description: "内容运营实习生将参与内容策划、创作和推广，学习社交媒体运营，培养用户洞察和创意能力。",
      rating: 4.6,
      applications: 750
    },
    {
      id: 14,
      name: "运营实习生画像(数据运营)",
      position: "运营实习生",
      duration: "3-6个月",
      location: "北京/深圳/杭州/上海",
      companies: ["阿里巴巴", "腾讯", "字节跳动", "美团", "京东", "滴滴", "百度", "快手"],
      academics: {
        gpa: "3.4+/4.0",
        courses: ["数据分析", "统计学", "市场营销", "商业分析", "Excel/SQL"]
      },
      skills: ["数据分析", "Excel/SQL", "业务理解", "逻辑思维", "报告撰写"],
      requirements: ["数据敏感度强", "逻辑思维好", "学习能力强", "细心负责"],
      benefits: ["数据分析能力", "业务理解", "工具使用", "职业发展"],
      tags: ["运营", "数据", "分析", "实习"],
      description: "数据运营实习生将学习业务数据分析，掌握数据驱动的运营方法，培养商业敏感度和分析能力。",
      rating: 4.5,
      applications: 600
    }
  ],
  "设计实习": [
    {
      id: 6,
      name: "设计实习生画像(UI/UX设计)",
      position: "设计实习生",
      duration: "3-6个月",
      location: "北京/深圳/杭州/上海",
      companies: ["腾讯", "阿里巴巴", "字节跳动", "网易", "小米", "OPPO", "vivo", "华为", "蔚来", "理想汽车"],
      academics: {
        gpa: "3.2+/4.0",
        courses: ["视觉传达", "交互设计", "用户体验", "心理学", "美术基础"]
      },
      skills: ["Figma/Sketch", "Photoshop", "设计思维", "用户研究", "原型设计"],
      requirements: ["有设计作品集", "审美能力强", "用户体验意识", "学习能力强"],
      benefits: ["设计经验", "作品集完善", "导师指导", "行业认知"],
      tags: ["设计", "UI/UX", "用户体验", "实习"],
      description: "UI/UX设计实习生将参与产品界面和用户体验设计，学习设计规范和用户研究方法，完善个人作品集。",
      rating: 4.7,
      applications: 700
    }
  ]
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
  companies: string[]
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
  companies: string[]
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

function InternshipCard({ model, onViewDetails }: { model: InternshipModel, onViewDetails: () => void }) {
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
            <Building className="h-4 w-4 text-muted-foreground" />
            <span><strong>{t('rolemodels.internships.companies')}：</strong>{translateCompanyList(model.companies.slice(0, 3), t).join("、")}等</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>GPA: {model.academics.gpa} | 时长: {model.duration}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span>{model.requirements.slice(0, 2).join("、")}等</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>{model.benefits.slice(0, 2).join("、")}等</span>
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
          <Button size="sm" onClick={onViewDetails}>
            {t('rolemodels.common.details')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CompanyCard({ model, onViewDetails }: { model: CompanyModel, onViewDetails: () => void }) {
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
            <Building className="h-4 w-4 text-muted-foreground" />
            <span><strong>{t('rolemodels.companies.employment')}：</strong>{translateCompanyList(model.companies.slice(0, 3), t).join("、")}等</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>GPA: {model.academics.gpa}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span>{model.competitions.slice(0, 2).join("、")}等</span>
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
          <Button size="sm" onClick={onViewDetails}>
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
  schools: string[]
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

function SchoolCard({ model, onViewDetails }: { model: SchoolModel, onViewDetails: () => void }) {
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
            <School className="h-4 w-4 text-muted-foreground" />
            <span><strong>{t('rolemodels.schools.admission')}：</strong>{translateSchoolList(model.schools.slice(0, 3), t).join("、")}等</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>GPA: {model.academics.gpa}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span>{model.competitions.slice(0, 2).join("、")}等</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>{model.research.slice(0, 2).join("、")}等</span>
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
          <Button size="sm" onClick={onViewDetails}>
            {t('rolemodels.common.details')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// 岗位行组件
function PositionRow({ position, models, onViewDetails }: { position: string, models: CompanyModel[], onViewDetails: (model: CompanyModel) => void }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold">{position}</h2>
      </div>
      <ScrollableContainer>
        {models.map((model) => (
          <div key={`${position}-${model.id}`} className="mr-4 min-w-[350px]">
            <CompanyCard model={model} onViewDetails={() => onViewDetails(model)} />
          </div>
        ))}
      </ScrollableContainer>
    </div>
  );
}

// 专业行组件
function MajorRow({ major, models, onViewDetails }: { major: string, models: SchoolModel[], onViewDetails: (model: SchoolModel) => void }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold">{major}</h2>
      </div>
      <ScrollableContainer>
        {models.map((model) => (
          <div key={`${major}-${model.id}`} className="mr-4 min-w-[350px]">
            <SchoolCard model={model} onViewDetails={() => onViewDetails(model)} />
          </div>
        ))}
      </ScrollableContainer>
    </div>
  );
}

// 实习行组件
function InternshipRow({ internshipType, models, onViewDetails }: { internshipType: string, models: InternshipModel[], onViewDetails: (model: InternshipModel) => void }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold">{internshipType}</h2>
      </div>
      <ScrollableContainer>
        {models.map((model) => (
          <div key={`${internshipType}-${model.id}`} className="mr-4 min-w-[350px]">
            <InternshipCard model={model} onViewDetails={() => onViewDetails(model)} />
          </div>
        ))}
      </ScrollableContainer>
    </div>
  );
}









export default function RoleModels() {
  const { t } = useLanguage()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("companies")
  
  // 创建URL参数的辅助函数
  const createDetailUrl = (type: 'company' | 'school' | 'internship', params: any) => {
    const searchParams = new URLSearchParams({ type, ...params })
    return `/role-models/detail?${searchParams.toString()}`
  }

  // 岗位详情导航
  const navigateToPositionDetail = (position: string, company: string, model: CompanyModel) => {
    const url = createDetailUrl('company', {
      position: encodeURIComponent(position),
      company: encodeURIComponent(company),
      id: model.id.toString()
    })
    router.push(url)
  }

  // 专业详情导航
  const navigateToMajorDetail = (major: string, school: string, model: SchoolModel) => {
    const url = createDetailUrl('school', {
      major: encodeURIComponent(major),
      school: encodeURIComponent(school),
      id: model.id.toString()
    })
    router.push(url)
  }

  // 类别详情导航
  const navigateToCategoryDetail = (category: string, company: string, model: InternshipModel) => {
    const url = createDetailUrl('internship', {
      category: encodeURIComponent(category),
      company: encodeURIComponent(company),
      id: model.id.toString()
    })
    router.push(url)
  }
  
  return (
    <div className="p-6">
      {/* 电脑端布局：标题和可能性卡片在同一行 */}
      <div className="mb-6 hidden md:flex justify-between items-start gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{t('rolemodels.title')}</h1>
          <p className="text-muted-foreground">{t('rolemodels.description')}</p>
        </div>
        <div className="flex-shrink-0">
          <PossibilityCard activeTab={activeTab} />
        </div>
      </div>
      
      {/* 手机端布局：标题和可能性卡片分开显示 */}
      <div className="mb-6 md:hidden">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">{t('rolemodels.title')}</h1>
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
          {Object.entries(positionModels).map(([position, models]) => (
            <PositionRow 
              key={position} 
              position={position} 
              models={models as CompanyModel[]} 
              onViewDetails={(model) => {
                navigateToPositionDetail(position, model.companies[0], model)
              }}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="schools">
          {Object.entries(majorModels).map(([major, models]) => (
            <MajorRow 
              key={major} 
              major={major} 
              models={models as SchoolModel[]} 
              onViewDetails={(model) => {
                navigateToMajorDetail(major, model.schools[0], model)
              }}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="internships">
          {Object.entries(internshipModels).map(([internshipType, models]) => (
            <InternshipRow 
              key={internshipType} 
              internshipType={internshipType} 
              models={models as InternshipModel[]} 
              onViewDetails={(model) => {
                navigateToCategoryDetail(internshipType, model.companies[0], model)
              }}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}