import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Briefcase, MapPin, Star, MessageCircle, Building, School, Award, BookOpen, Layers, Globe } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollableContainer } from "../../components/ui/scrollable-container"

// 按公司和学校分类的虚拟角色模型数据
const companyModels = {
  "腾讯": [
    {
      id: 1,
      name: "腾讯典型人才画像",
      position: "高级工程师/产品经理",
      location: "深圳/北京",
      academics: {
        gpa: "3.8+/4.0",
        courses: ["数据结构与算法", "计算机网络", "操作系统", "软件工程"]
      },
      competitions: ["ACM程序设计大赛", "互联网+创新创业大赛"],
      internships: ["BAT实习经历", "知名互联网公司产品/研发实习"],
      englishScores: {
        toefl: "105+",
        ielts: "7.0+"
      },
      skills: ["全栈开发", "算法设计", "产品思维", "团队协作"],
      tags: ["计算机", "软件工程", "人工智能"],
      description: "腾讯典型人才具有扎实的计算机基础知识和编程能力，在校期间积极参与ACM等算法竞赛，有1-2段BAT或知名互联网公司实习经历，对产品和技术都有较深理解。课程成绩优秀，特别是在算法、数据结构等核心课程上表现突出。",
      rating: 4.9,
      consultations: 356
    }
  ],
  "阿里巴巴": [
    {
      id: 2,
      name: "阿里巴巴典型人才画像",
      position: "技术专家/算法工程师",
      location: "杭州/北京",
      academics: {
        gpa: "3.7+/4.0",
        courses: ["分布式系统", "大数据处理", "机器学习", "数据挖掘"]
      },
      competitions: ["天池大数据竞赛", "阿里云创新大赛"],
      internships: ["阿里巴巴技术实习", "数据分析/大数据相关实习"],
      englishScores: {
        toefl: "100+",
        ielts: "6.5+"
      },
      skills: ["Java开发", "分布式系统", "大数据技术", "机器学习算法"],
      tags: ["大数据", "分布式", "云计算"],
      description: "阿里巴巴典型人才在分布式系统和大数据处理方面有深入研究，参与过天池等数据竞赛并取得优异成绩，熟悉Java生态系统和阿里技术栈，有大规模分布式系统开发经验。在校期间GPA保持在3.7以上，对技术有浓厚兴趣和自驱力。",
      rating: 4.8,
      consultations: 289
    }
  ],
  "字节跳动": [
    {
      id: 3,
      name: "字节跳动典型人才画像",
      position: "算法工程师/后端开发",
      location: "北京/上海",
      academics: {
        gpa: "3.9+/4.0",
        courses: ["人工智能", "计算机视觉", "自然语言处理", "推荐系统"]
      },
      competitions: ["全国大学生数学建模竞赛", "字节跳动青训营"],
      internships: ["字节跳动算法实习", "AI研究实验室实习"],
      englishScores: {
        toefl: "110+",
        ielts: "7.5+"
      },
      skills: ["机器学习算法", "深度学习", "Python/C++", "推荐系统"],
      tags: ["AI", "算法", "机器学习"],
      description: "字节跳动典型人才在AI算法方面有突出表现，熟悉计算机视觉或自然语言处理技术，有推荐系统相关项目经验。学术成绩优异，GPA通常在3.9以上，核心课程成绩优秀。积极参与字节跳动青训营等活动，有相关实习经历，编程能力强。",
      rating: 4.9,
      consultations: 267
    }
  ]
}

const schoolModels = {
  "清华大学": [
    {
      id: 4,
      name: "清华大学研究生典型画像",
      graduateMajor: "人工智能/电子科学与技术",
      location: "北京",
      academics: {
        gpa: "3.8+/4.0",
        courses: ["高等数学", "线性代数", "概率论", "数据结构与算法"]
      },
      competitions: ["全国大学生数学竞赛一等奖", "挑战杯学术竞赛"],
      research: ["发表SCI/EI检索论文", "参与国家级科研项目"],
      englishScores: {
        toefl: "110+",
        ielts: "7.5+",
        gre: "325+"
      },
      skills: ["科研能力", "数学建模", "学术写作", "编程实现"],
      tags: ["保研", "科研", "数学"],
      description: "清华大学研究生通常本科就读于985/211重点高校，学术成绩优异，GPA保持在3.8以上。在校期间积极参与科研，有1-2篇高质量论文发表或在投。数学和专业基础扎实，在数学或学科竞赛中获得省级以上奖项。英语能力强，能流利阅读英文文献。",
      rating: 4.8,
      consultations: 303
    }
  ],
  "北京大学": [
    {
      id: 5,
      name: "北京大学研究生典型画像",
      graduateMajor: "理论物理/计算机科学",
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
      description: "北京大学研究生在基础学科领域有扎实功底，特别是数学和物理等基础学科成绩突出。本科期间积极参与科研，有较强的科研兴趣和能力。学术成绩优异，GPA通常在3.9以上，在重要学科竞赛中获奖。英语能力出色，能熟练阅读和撰写英文学术论文。",
      rating: 4.9,
      consultations: 278
    }
  ],
  "哈佛大学": [
    {
      id: 6,
      name: "哈佛大学留学生典型画像",
      graduateMajor: "分子生物学/公共政策",
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
      description: "哈佛大学留学生不仅学术成绩极为优秀（GPA通常在3.95以上），还在科研、社会活动和领导力方面有突出表现。托福/雅思成绩优异，有国际竞赛获奖经历。本科期间参与高水平科研项目并有成果，具备出色的学术写作和批判性思维能力。申请材料全面展现个人特色和成就。",
      rating: 5.0,
      consultations: 356
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

function CompanyCard({ model }: { model: CompanyModel }) {
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
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{model.consultations}次咨询</span>
          </div>
          <Button size="sm">
            查看详情
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
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{model.consultations}次咨询</span>
          </div>
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
        <h1 className="text-3xl font-bold">Role Model - 求职升学参考画像</h1>
        <p className="text-muted-foreground">了解不同去向的典型人才特征，规划自己的职业和学业发展路径</p>
      </div>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="companies">按就业公司</TabsTrigger>
          <TabsTrigger value="schools">按升学学校</TabsTrigger>
        </TabsList>
        
        <TabsContent value="companies">
          {Object.entries(companyModels).map(([company, models]) => (
            <div key={company} className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{company}</h2>
              </div>
              
              <ScrollableContainer>
                {models.map((model) => (
                  <CompanyCard key={model.id} model={model} />
                ))}
              </ScrollableContainer>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="schools">
          {Object.entries(schoolModels).map(([school, models]) => (
            <div key={school} className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <School className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{school}</h2>
              </div>
              
              <ScrollableContainer>
                {models.map((model) => (
                  <SchoolCard key={model.id} model={model} />
                ))}
              </ScrollableContainer>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}