import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, GraduationCap, Briefcase, MapPin, Star, MessageCircle, Building, School } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 按公司和学校分类的角色模型数据
const companyModels = {
  "腾讯": [
    {
      id: 1,
      name: "王学长",
      university: "清华大学",
      major: "计算机科学与技术",
      graduationYear: "2020",
      company: "腾讯",
      position: "高级工程师",
      location: "深圳",
      score: "高考680分",
      tags: ["理科", "计算机", "算法"],
      description: "毕业于清华大学计算机系，现就职于腾讯，负责后台开发工作，乐于分享求职经验。",
      rating: 4.9,
      consultations: 156
    },
    {
      id: 2,
      name: "张学姐",
      university: "北京大学",
      major: "软件工程",
      graduationYear: "2019",
      company: "腾讯",
      position: "产品经理",
      location: "深圳",
      score: "高考675分",
      tags: ["理科", "产品", "设计"],
      description: "毕业于北京大学软件工程专业，现就职于腾讯，担任产品经理，擅长产品设计和用户体验。",
      rating: 4.8,
      consultations: 134
    }
  ],
  "阿里巴巴": [
    {
      id: 3,
      name: "李学长",
      university: "浙江大学",
      major: "计算机科学与技术",
      graduationYear: "2018",
      company: "阿里巴巴",
      position: "技术专家",
      location: "杭州",
      score: "高考670分",
      tags: ["理科", "编程", "大数据"],
      description: "毕业于浙江大学计算机系，现就职于阿里巴巴，从事大数据平台开发，有丰富的技术经验。",
      rating: 4.7,
      consultations: 189
    }
  ],
  "字节跳动": [
    {
      id: 4,
      name: "刘学姐",
      university: "复旦大学",
      major: "人工智能",
      graduationYear: "2021",
      company: "字节跳动",
      position: "算法工程师",
      location: "北京",
      score: "高考688分",
      tags: ["理科", "AI", "机器学习"],
      description: "毕业于复旦大学人工智能专业，现就职于字节跳动，负责推荐算法研发，对AI领域有深入研究。",
      rating: 4.9,
      consultations: 167
    }
  ]
}

const schoolModels = {
  "清华大学": [
    {
      id: 5,
      name: "陈学长",
      university: "北京大学",
      major: "数学与应用数学",
      graduationYear: "2020",
      graduateSchool: "清华大学",
      graduateMajor: "人工智能",
      location: "北京",
      score: "高考685分",
      tags: ["理科", "数学", "保研"],
      description: "本科毕业于北京大学数学系，成功保研至清华大学人工智能专业，擅长数学建模和算法设计。",
      rating: 4.8,
      consultations: 203
    },
    {
      id: 6,
      name: "赵学姐",
      university: "上海交通大学",
      major: "电子工程",
      graduationYear: "2019",
      graduateSchool: "清华大学",
      graduateMajor: "电子科学与技术",
      location: "北京",
      score: "高考678分",
      tags: ["理科", "电子", "直博"],
      description: "本科毕业于上海交通大学电子工程专业，现为清华大学电子系直博生，研究方向为集成电路设计。",
      rating: 4.7,
      consultations: 145
    }
  ],
  "北京大学": [
    {
      id: 7,
      name: "孙学长",
      university: "中国科学技术大学",
      major: "物理学",
      graduationYear: "2021",
      graduateSchool: "北京大学",
      graduateMajor: "理论物理",
      location: "北京",
      score: "高考690分",
      tags: ["理科", "物理", "科研"],
      description: "本科毕业于中科大物理系，现为北京大学理论物理专业研究生，对基础物理研究有浓厚兴趣。",
      rating: 4.9,
      consultations: 178
    }
  ],
  "哈佛大学": [
    {
      id: 8,
      name: "钱学姐",
      university: "复旦大学",
      major: "生物科学",
      graduationYear: "2018",
      graduateSchool: "哈佛大学",
      graduateMajor: "分子生物学",
      location: "波士顿",
      score: "高考695分",
      tags: ["理科", "生物", "留学"],
      description: "本科毕业于复旦大学生物科学专业，成功申请哈佛大学分子生物学博士项目，擅长留学申请规划。",
      rating: 5.0,
      consultations: 256
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

function CompanyCard({ model }: { model: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
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
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{model.company}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span>{model.university} · {model.major}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{model.location}</span>
          </div>
        </div>

        <div className="text-sm">
          <span className="font-medium text-primary">{model.score}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {model.tags.map((tag: string) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {model.description}
        </p>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{model.consultations}次咨询</span>
          </div>
          <Button size="sm">
            联系咨询
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SchoolCard({ model }: { model: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{model.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <School className="h-3 w-3" />
                {model.graduateSchool}
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
            <School className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{model.graduateSchool} · {model.graduateMajor}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span>{model.university} · {model.major}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{model.location}</span>
          </div>
        </div>

        <div className="text-sm">
          <span className="font-medium text-primary">{model.score}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {model.tags.map((tag: string) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {model.description}
        </p>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{model.consultations}次咨询</span>
          </div>
          <Button size="sm">
            联系咨询
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
        <h1 className="text-3xl font-bold">Role Model - 学长学姐数据库</h1>
        <p className="text-muted-foreground">寻找优秀的学长学姐，获取职业发展和升学指导</p>
      </div>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="companies">按就业公司</TabsTrigger>
          <TabsTrigger value="schools">按升学学校</TabsTrigger>
        </TabsList>
        
        <TabsContent value="companies">
          {Object.entries(companyModels).map(([company, models]) => (
            <div key={company} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{company}</h2>
                <span className="text-sm text-muted-foreground">({models.length}人)</span>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {models.map((model) => (
                  <CompanyCard key={model.id} model={model} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="schools">
          {Object.entries(schoolModels).map(([school, models]) => (
            <div key={school} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <School className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{school}</h2>
                <span className="text-sm text-muted-foreground">({models.length}人)</span>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {models.map((model) => (
                  <SchoolCard key={model.id} model={model} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}