import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">关于BuTP</h1>
        <p className="text-muted-foreground">Build Your Toolbox Program</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>关于我们</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 空白内容区域 */}
        </CardContent>
      </Card>
    </div>
  )
} 