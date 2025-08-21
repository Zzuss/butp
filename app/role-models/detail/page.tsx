"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  GraduationCap, 
  Briefcase, 
  MapPin, 
  Star, 
  Building, 
  School, 
  Award, 
  BookOpen, 
  Layers, 
  Globe, 
  ArrowLeft, 
  Users, 
  Calendar, 
  Target, 
  CheckCircle 
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { Suspense } from "react"

// Badge组件
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

// 公司数据（从原页面复制）
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
        id: 9,
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
        id: 10,
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
        id: 11,
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
        id: 12,
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
        id: 101,
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
        id: 102,
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
        id: 103,
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
        id: 104,
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
        id: 105,
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
        id: 106,
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
        id: 107,
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
        id: 108,
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
        id: 109,
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
        id: 201,
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
        id: 202,
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
        id: 203,
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
        id: 204,
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
        id: 205,
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
        id: 206,
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

// 接口定义
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

// 查找数据的辅助函数
function findCompanyModel(company: string, position: string, id: number): CompanyModel | null {
  const companyData = companyModels[company as keyof typeof companyModels]
  if (!companyData) return null
  
  const positionData = companyData[position as keyof typeof companyData] as CompanyModel[] | undefined
  if (!positionData) return null
  
  return positionData.find((model: CompanyModel) => model.id === id) || null
}

function findSchoolModel(school: string, major: string, id: number): SchoolModel | null {
  const schoolData = schoolModels[school as keyof typeof schoolModels]
  if (!schoolData) return null
  
  const majorData = schoolData[major as keyof typeof schoolData] as SchoolModel[] | undefined
  if (!majorData) return null
  
  return majorData.find((model: SchoolModel) => model.id === id) || null
}

function findInternshipModel(company: string, category: string, id: number): InternshipModel | null {
  const companyData = internshipModels[company as keyof typeof internshipModels]
  if (!companyData) return null
  
  const categoryData = companyData[category as keyof typeof companyData] as InternshipModel[] | undefined
  if (!categoryData) return null
  
  return categoryData.find((model: InternshipModel) => model.id === id) || null
}

// 公司详情内容组件
function CompanyDetailContent({ model }: { model: CompanyModel }) {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">工作地点：</span>
              <span>{model.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">评分：</span>
              <span>{model.rating}/5.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">咨询次数：</span>
              <span>{model.consultations}次</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              学术要求
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">GPA要求：</span>
              <span className="ml-2">{model.academics.gpa}</span>
            </div>
            <div>
              <span className="font-medium">核心课程：</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {model.academics.courses.map((course, index) => (
                  <Badge key={index} variant="secondary">{course}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 能力技能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            能力技能
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {model.skills.map((skill, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{skill}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 竞赛经历 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            竞赛经历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {model.competitions.map((competition, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <Award className="h-4 w-4 text-yellow-600" />
                <span>{competition}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 实习经历 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            实习经历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {model.internships.map((internship, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <Building className="h-4 w-4 text-green-600" />
                <span>{internship}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 英语成绩 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            英语成绩要求
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium">TOEFL</div>
              <div className="text-2xl font-bold text-green-600">{model.englishScores.toefl}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium">IELTS</div>
              <div className="text-2xl font-bold text-blue-600">{model.englishScores.ielts}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细描述 */}
      <Card>
        <CardHeader>
          <CardTitle>详细描述</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 leading-relaxed">{model.description}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// 学校详情内容组件
function SchoolDetailContent({ model }: { model: SchoolModel }) {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">专业：</span>
              <span>{model.graduateMajor}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">地点：</span>
              <span>{model.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">评分：</span>
              <span>{model.rating}/5.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">咨询次数：</span>
              <span>{model.consultations}次</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              学术要求
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">GPA要求：</span>
              <span className="ml-2">{model.academics.gpa}</span>
            </div>
            <div>
              <span className="font-medium">核心课程：</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {model.academics.courses.map((course, index) => (
                  <Badge key={index} variant="secondary">{course}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 能力技能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            能力技能
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {model.skills.map((skill, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{skill}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 竞赛经历 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            竞赛经历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {model.competitions.map((competition, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <Award className="h-4 w-4 text-yellow-600" />
                <span>{competition}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 科研经历 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            科研经历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {model.research.map((research, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <span>{research}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 标准化考试成绩 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            标准化考试成绩要求
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium">TOEFL</div>
              <div className="text-xl font-bold text-green-600">{model.englishScores.toefl}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium">IELTS</div>
              <div className="text-xl font-bold text-blue-600">{model.englishScores.ielts}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="font-medium">GRE</div>
              <div className="text-xl font-bold text-purple-600">{model.englishScores.gre}</div>
            </div>
            {model.englishScores.sat && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="font-medium">SAT</div>
                <div className="text-xl font-bold text-orange-600">{model.englishScores.sat}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 详细描述 */}
      <Card>
        <CardHeader>
          <CardTitle>详细描述</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 leading-relaxed">{model.description}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// 实习详情内容组件
function InternshipDetailContent({ model }: { model: InternshipModel }) {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">职位：</span>
              <span>{model.position}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">时长：</span>
              <span>{model.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">地点：</span>
              <span>{model.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">评分：</span>
              <span>{model.rating}/5.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">申请数：</span>
              <span>{model.applications}人</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              学术要求
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">GPA要求：</span>
              <span className="ml-2">{model.academics.gpa}</span>
            </div>
            <div>
              <span className="font-medium">相关课程：</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {model.academics.courses.map((course, index) => (
                  <Badge key={index} variant="secondary">{course}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 技能要求 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            技能要求
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {model.skills.map((skill, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{skill}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 申请要求 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            申请要求
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {model.requirements.map((requirement, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{requirement}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 实习收益 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            实习收益
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {model.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 详细描述 */}
      <Card>
        <CardHeader>
          <CardTitle>详细描述</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 leading-relaxed">{model.description}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// 详情页面主组件
function DetailPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()
  
  const type = searchParams.get('type') || 'company'
  const company = searchParams.get('company') || ''
  const position = searchParams.get('position') || ''
  const school = searchParams.get('school') || ''
  const major = searchParams.get('major') || ''
  const category = searchParams.get('category') || ''
  const id = parseInt(searchParams.get('id') || '0')
  
  let model: CompanyModel | SchoolModel | InternshipModel | null = null
  let title = ''
  
  if (type === 'company') {
    model = findCompanyModel(decodeURIComponent(company), decodeURIComponent(position), id)
    title = model?.name || '公司职位详情'
  } else if (type === 'school') {
    model = findSchoolModel(decodeURIComponent(school), decodeURIComponent(major), id)
    title = model?.name || '学校专业详情'
  } else if (type === 'internship') {
    model = findInternshipModel(decodeURIComponent(company), decodeURIComponent(category), id)
    title = model?.name || '实习机会详情'
  }
  
  if (!model) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">未找到相关信息</h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回职业模型
        </Button>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">
          {type === 'company' && '公司职位详细信息'}
          {type === 'school' && '学校专业详细信息'}
          {type === 'internship' && '实习机会详细信息'}
        </p>
      </div>
      
      {/* 详情内容 */}
      {type === 'company' && (
        <CompanyDetailContent model={model as CompanyModel} />
      )}
      {type === 'school' && (
        <SchoolDetailContent model={model as SchoolModel} />
      )}
      {type === 'internship' && (
        <InternshipDetailContent model={model as InternshipModel} />
      )}
    </div>
  )
}

// 主页面组件
export default function DetailPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>加载中...</p>
        </div>
      </div>
    }>
      <DetailPageContent />
    </Suspense>
  )
}
