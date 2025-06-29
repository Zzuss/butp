"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Briefcase, Languages, Plus, Edit, Trash2, X } from "lucide-react"
import { useState, FormEvent, useRef } from "react"

// 定义各类考试成绩的接口
interface ToeflScore {
  total: number;
  date: string;
  reading: number;
  listening: number;
  speaking: number;
  writing: number;
}

interface IeltsScore {
  total: number;
  date: string;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

interface GreScore {
  total: number;
  date: string;
  math: number;
  verbal: number;
  writing: number;
}

export default function Profile() {
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [selectedScoreType, setSelectedScoreType] = useState("");
  const [editMode, setEditMode] = useState(false);
  
  // 各类考试成绩的状态
  const [toeflScore, setToeflScore] = useState<ToeflScore>({
    total: 0,
    date: "",
    reading: 0,
    listening: 0,
    speaking: 0,
    writing: 0
  });
  
  const [ieltsScore, setIeltsScore] = useState<IeltsScore>({
    total: 0,
    date: "",
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0
  });
  
  const [greScore, setGreScore] = useState<GreScore>({
    total: 0,
    date: "",
    math: 0,
    verbal: 0,
    writing: 0
  });
  
  // 表单引用
  const formRef = useRef<HTMLFormElement>(null);
  
  const handleAddScore = () => {
    setEditMode(false);
    setShowScoreForm(true);
  };
  
  const handleEditScore = (type: string) => {
    setSelectedScoreType(type);
    setEditMode(true);
    setShowScoreForm(true);
  };
  
  const handleCancelAdd = () => {
    setShowScoreForm(false);
    setSelectedScoreType("");
    setEditMode(false);
  };
  
  const handleScoreSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const total = Number(formData.get("total"));
    const date = formData.get("date") as string;
    
    if (selectedScoreType === "toefl") {
      const reading = Number(formData.get("reading"));
      const listening = Number(formData.get("listening"));
      const speaking = Number(formData.get("speaking"));
      const writing = Number(formData.get("writing"));
      
      setToeflScore({
        total,
        date,
        reading,
        listening,
        speaking,
        writing
      });
    } else if (selectedScoreType === "ielts") {
      const listening = Number(formData.get("listening"));
      const reading = Number(formData.get("reading"));
      const writing = Number(formData.get("writing"));
      const speaking = Number(formData.get("speaking"));
      
      setIeltsScore({
        total,
        date,
        listening,
        reading,
        writing,
        speaking
      });
    } else if (selectedScoreType === "gre") {
      const math = Number(formData.get("math"));
      const verbal = Number(formData.get("verbal"));
      const writing = Number(formData.get("writing"));
      
      setGreScore({
        total,
        date,
        math,
        verbal,
        writing
      });
    }
    
    setShowScoreForm(false);
    setSelectedScoreType("");
    setEditMode(false);
  };
  
  // 格式化日期显示
  const formatDate = (dateString: string) => {
    if (!dateString) return "暂无";
    
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch (e) {
      return "暂无";
    }
  };

  return (
    <div className="p-6 relative">
      {showScoreForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editMode ? "更新成绩" : "添加成绩"}</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelAdd} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form ref={formRef} onSubmit={handleScoreSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">考试类型</label>
                  <select 
                    name="type"
                    className="w-full p-2 border rounded-md" 
                    value={selectedScoreType}
                    onChange={(e) => setSelectedScoreType(e.target.value)}
                    disabled={editMode}
                    required
                  >
                    <option value="">请选择考试类型</option>
                    <option value="toefl">托福 TOEFL</option>
                    <option value="ielts">雅思 IELTS</option>
                    <option value="gre">GRE</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">总分</label>
                  <input 
                    name="total"
                    type="number" 
                    className="w-full p-2 border rounded-md" 
                    defaultValue={
                      editMode ? 
                      (selectedScoreType === "toefl" ? toeflScore.total : 
                       selectedScoreType === "ielts" ? ieltsScore.total : 
                       selectedScoreType === "gre" ? greScore.total : 0) : ""
                    }
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">考试日期</label>
                  <input 
                    name="date"
                    type="date" 
                    className="w-full p-2 border rounded-md" 
                    defaultValue={
                      editMode ? 
                      (selectedScoreType === "toefl" ? toeflScore.date : 
                       selectedScoreType === "ielts" ? ieltsScore.date : 
                       selectedScoreType === "gre" ? greScore.date : "") : ""
                    }
                    required 
                  />
                </div>
                
                {selectedScoreType === "toefl" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">阅读</label>
                      <input 
                        name="reading"
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        max="30" 
                        defaultValue={editMode ? toeflScore.reading : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">听力</label>
                      <input 
                        name="listening"
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        max="30" 
                        defaultValue={editMode ? toeflScore.listening : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">口语</label>
                      <input 
                        name="speaking"
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        max="30" 
                        defaultValue={editMode ? toeflScore.speaking : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">写作</label>
                      <input 
                        name="writing"
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        max="30" 
                        defaultValue={editMode ? toeflScore.writing : ""}
                      />
                    </div>
                  </div>
                )}
                
                {selectedScoreType === "ielts" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">听力</label>
                      <input 
                        name="listening"
                        type="number" 
                        step="0.5" 
                        className="w-full p-2 border rounded-md" 
                        max="9" 
                        defaultValue={editMode ? ieltsScore.listening : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">阅读</label>
                      <input 
                        name="reading"
                        type="number" 
                        step="0.5" 
                        className="w-full p-2 border rounded-md" 
                        max="9" 
                        defaultValue={editMode ? ieltsScore.reading : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">写作</label>
                      <input 
                        name="writing"
                        type="number" 
                        step="0.5" 
                        className="w-full p-2 border rounded-md" 
                        max="9" 
                        defaultValue={editMode ? ieltsScore.writing : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">口语</label>
                      <input 
                        name="speaking"
                        type="number" 
                        step="0.5" 
                        className="w-full p-2 border rounded-md" 
                        max="9" 
                        defaultValue={editMode ? ieltsScore.speaking : ""}
                      />
                    </div>
                  </div>
                )}
                
                {selectedScoreType === "gre" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">数学</label>
                      <input 
                        name="math"
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        max="170" 
                        defaultValue={editMode ? greScore.math : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">语文</label>
                      <input 
                        name="verbal"
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        max="170" 
                        defaultValue={editMode ? greScore.verbal : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">写作</label>
                      <input 
                        name="writing"
                        type="number" 
                        step="0.5" 
                        className="w-full p-2 border rounded-md" 
                        max="6" 
                        defaultValue={editMode ? greScore.writing : ""}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelAdd}>取消</Button>
                  <Button type="submit">保存</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <Button size="sm" className="flex items-center gap-2" onClick={handleAddScore}>
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
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleEditScore("toefl")}>
                      <Edit className="h-2 w-2" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Trash2 className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">{toeflScore.total}</div>
                  <div className="text-xs text-muted-foreground">考试日期: {formatDate(toeflScore.date)}</div>
                  <div className="text-xs text-muted-foreground">
                    阅读:{toeflScore.reading} | 听力:{toeflScore.listening} | 口语:{toeflScore.speaking} | 写作:{toeflScore.writing}
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
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleEditScore("ielts")}>
                      <Edit className="h-2 w-2" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Trash2 className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">{ieltsScore.total}</div>
                  <div className="text-xs text-muted-foreground">考试日期: {formatDate(ieltsScore.date)}</div>
                  <div className="text-xs text-muted-foreground">
                    听力:{ieltsScore.listening} | 阅读:{ieltsScore.reading} | 写作:{ieltsScore.writing} | 口语:{ieltsScore.speaking}
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
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleEditScore("gre")}>
                      <Edit className="h-2 w-2" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Trash2 className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-purple-600">{greScore.total}</div>
                  <div className="text-xs text-muted-foreground">考试日期: {formatDate(greScore.date)}</div>
                  <div className="text-xs text-muted-foreground">
                    数学:{greScore.math} | 语文:{greScore.verbal} | 写作:{greScore.writing}
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