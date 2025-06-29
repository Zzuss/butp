import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Briefcase, Languages, Plus, Edit, Trash2 } from "lucide-react"

export default function Profile() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">我的信息</h1>
        <p className="text-muted-foreground">管理您的个人信息和设置</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                获奖记录
              </div>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                添加获奖
              </Button>
            </CardTitle>
            <CardDescription>您获得的奖项和荣誉</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg group hover:bg-gray-50">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">三好学生</h4>
                  <p className="text-sm text-muted-foreground">2023-2024学年 • 校级</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">2024年6月</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 border rounded-lg group hover:bg-gray-50">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">数学竞赛二等奖</h4>
                  <p className="text-sm text-muted-foreground">全国高中数学联赛 • 省级</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">2023年10月</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 border rounded-lg group hover:bg-gray-50">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">优秀班干部</h4>
                  <p className="text-sm text-muted-foreground">2022-2023学年 • 校级</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">2023年6月</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                实习经历
              </div>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                添加实习
              </Button>
            </CardTitle>
            <CardDescription>您的实习和工作经历</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg group hover:bg-gray-50">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">教学助理实习生</h4>
                  <p className="text-sm text-muted-foreground mb-1">新东方教育科技集团</p>
                  <p className="text-xs text-muted-foreground">2024年7月 - 2024年8月</p>
                  <p className="text-sm mt-2">协助数学老师进行课程准备和学生辅导，参与教学活动设计</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg group hover:bg-gray-50">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">志愿者</h4>
                  <p className="text-sm text-muted-foreground mb-1">北京市图书馆</p>
                  <p className="text-xs text-muted-foreground">2023年12月 - 2024年2月</p>
                  <p className="text-sm mt-2">协助图书管理和读者服务，参与文化活动组织</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                语言成绩
              </div>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                添加成绩
              </Button>
            </CardTitle>
            <CardDescription>托福、雅思、GRE等标准化考试成绩</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg group hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Languages className="h-4 w-4 text-red-600" />
                    </div>
                    <h4 className="font-semibold">托福 TOEFL</h4>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Edit className="h-2 w-2" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Trash2 className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">108</div>
                  <div className="text-xs text-muted-foreground">考试日期: 2024年3月15日</div>
                  <div className="text-xs text-muted-foreground">
                    阅读:28 | 听力:27 | 口语:26 | 写作:27
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg group hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Languages className="h-4 w-4 text-blue-600" />
                    </div>
                    <h4 className="font-semibold">雅思 IELTS</h4>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Edit className="h-2 w-2" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Trash2 className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">7.5</div>
                  <div className="text-xs text-muted-foreground">考试日期: 2024年1月20日</div>
                  <div className="text-xs text-muted-foreground">
                    听力:8.0 | 阅读:8.5 | 写作:7.0 | 口语:7.0
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg group hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Languages className="h-4 w-4 text-purple-600" />
                    </div>
                    <h4 className="font-semibold">GRE</h4>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Edit className="h-2 w-2" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Trash2 className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-purple-600">325</div>
                  <div className="text-xs text-muted-foreground">考试日期: 2024年5月10日</div>
                  <div className="text-xs text-muted-foreground">
                    数学:168 | 语文:157 | 写作:4.0
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}