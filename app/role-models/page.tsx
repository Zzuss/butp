import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, GraduationCap, Briefcase, MapPin, Star, MessageCircle } from "lucide-react"

const roleModels = [
  {
    id: 1,
    name: "王学长",
    university: "清华大学",
    major: "计算机科学与技术",
    year: "2020级",
    location: "北京",
    score: "高考680分",
    tags: ["理科", "竞赛", "编程"],
    description: "高中期间多次获得编程竞赛奖项，现就读于清华大学计算机系，乐于分享学习经验。",
    rating: 4.9,
    consultations: 156
  },
  {
    id: 2,
    name: "李学姐",
    university: "北京大学",
    major: "数学与应用数学",
    year: "2019级",
    location: "北京",
    score: "高考685分",
    tags: ["理科", "数学", "保研"],
    description: "数学基础扎实，成功保研至北大数学系，擅长高中数学教学和学习方法指导。",
    rating: 4.8,
    consultations: 203
  },
  {
    id: 3,
    name: "陈学长",
    university: "复旦大学",
    major: "经济学",
    year: "2021级",
    location: "上海",
    score: "高考670分",
    tags: ["文科", "经济", "辩论"],
    description: "高中文科成绩优异，现就读于复旦大学经济学院，有丰富的学科竞赛和社团活动经验。",
    rating: 4.7,
    consultations: 89
  },
  {
    id: 4,
    name: "张学姐",
    university: "上海交通大学",
    major: "生物医学工程",
    year: "2020级",
    location: "上海",
    score: "高考678分",
    tags: ["理科", "生物", "医学"],
    description: "对生物医学领域有深入了解，高中生物竞赛获得省一等奖，现专注于生物医学工程研究。",
    rating: 4.9,
    consultations: 134
  },
  {
    id: 5,
    name: "刘学长",
    university: "中国科学技术大学",
    major: "物理学",
    year: "2019级",
    location: "合肥",
    score: "高考688分",
    tags: ["理科", "物理", "科研"],
    description: "物理基础扎实，多次参加物理竞赛，现在中科大从事基础物理研究，乐于分享科研经验。",
    rating: 4.8,
    consultations: 167
  },
  {
    id: 6,
    name: "孙学姐",
    university: "南京大学",
    major: "新闻传播学",
    year: "2021级",
    location: "南京",
    score: "高考665分",
    tags: ["文科", "传媒", "写作"],
    description: "文科全能型学霸，高中期间多次获得作文竞赛奖项，现就读于南大新闻传播学院。",
    rating: 4.6,
    consultations: 98
  }
]

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

export default function RoleModels() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Role Model - 学长学姐数据库</h1>
        <p className="text-muted-foreground">寻找优秀的学长学姐，获取学习和升学指导</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roleModels.map((model) => (
          <Card key={model.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {model.year}
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
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{model.university}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{model.major}</span>
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
                {model.tags.map((tag) => (
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
        ))}
      </div>
    </div>
  )
}