import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, GraduationCap, Briefcase, MapPin, Star, MessageCircle, Building, School, Award, BookOpen, Layers, Globe, ChevronLeft, ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollableContainer } from "../../components/ui/scrollable-container"

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
        internships: ["腾讯AI Lab实习", "知名互联网公司AI实习"],
        englishScores: {
          toefl: "105+",
          ielts: "7.0+"
        },
        skills: ["大模型训练", "分布式计算", "算法优化", "团队协作"],
        tags: ["大模型", "AI", "深度学习"],
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
        tags: ["前端", "Web", "工程化"],
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
        tags: ["前端", "Web", "工程化"],
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
        internships: ["字节跳动算法实习", "AI研究实验室实习"],
        englishScores: {
          toefl: "110+",
          ielts: "7.5+"
        },
        skills: ["深度学习", "推荐系统", "Python/C++"],
        tags: ["AI", "算法", "推荐系统"],
        description: "字节算法工程师需有AI算法项目经验，熟悉推荐系统，参与过青训营等活动。",
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
        tags: ["前端", "Web", "工程化"],
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
        tags: ["计算机", "科研", "AI"],
        description: "哈佛计算机科学留学生需有扎实的算法和编程基础，积极参与国际竞赛和科研。",
        rating: 4.9,
        consultations: 90
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

function CompanyCard({ model }: { model: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow min-w-[350px] w-[350px] flex-shrink-0">
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
      <CardContent className="space-y-4">
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

        <p className="text-sm text-muted-foreground">
          {model.description}
        </p>

        <div className="flex items-center justify-between pt-2">
          <Button size="sm">
            查看详情
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SchoolCard({ model }: { model: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow min-w-[350px] w-[350px] flex-shrink-0">
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
      <CardContent className="space-y-4">
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

        <p className="text-sm text-muted-foreground">
          {model.description}
        </p>

        <div className="flex items-center justify-between pt-2">
          <Button size="sm">
            查看详情
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RoleModels() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Role Models</h1>
        <p className="text-muted-foreground">了解不同去向的典型人才特征，规划自己的职业和学业发展路径</p>
      </div>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="companies">按就业公司</TabsTrigger>
          <TabsTrigger value="schools">按升学学校</TabsTrigger>
        </TabsList>
        
        <TabsContent value="companies">
          {Object.entries(companyModels).map(([company, positions]) => (
            <div key={company} className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{company}</h2>
              </div>
              <ScrollableContainer>
                {Object.entries(positions).map(([position, models]) => (
                  models.map((model) => (
                    <div key={model.id} className="mr-4 min-w-[350px]">
                      <div className="mb-2 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-base font-medium">{position}</span>
                      </div>
                      <CompanyCard model={model} />
                    </div>
                  ))
                ))}
              </ScrollableContainer>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="schools">
          {Object.entries(schoolModels).map(([school, majors]) => (
            <div key={school} className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <School className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{school}</h2>
              </div>
              <ScrollableContainer>
                {Object.entries(majors).map(([major, models]) => (
                  models.map((model) => (
                    <div key={model.id} className="mr-4 min-w-[350px]">
                      <div className="mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-base font-medium">{major}</span>
                      </div>
                      <SchoolCard model={model} />
                    </div>
                  ))
                ))}
              </ScrollableContainer>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}