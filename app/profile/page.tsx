"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Briefcase, Languages, Plus, Edit, Trash2, X } from "lucide-react"
import { useState, FormEvent, useRef, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/AuthContext"
import { getStudentInfo } from "@/lib/dashboard-data"

// 定义各类考试成绩的接口
interface ToeflScore {
  total: number;
  reading: number;
  listening: number;
  speaking: number;
  writing: number;
}

interface IeltsScore {
  total: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

interface GreScore {
  total: number;
  math: number;
  verbal: number;
  writing: number;
}

// 定义获奖记录接口
interface Award {
  title: string;
  organization: string;
  level: string;
  date: string;
  colorIndex: number;
}

// 定义实习经历接口
interface Internship {
  title: string;
  company: string;
  period: string;
  description: string;
  colorIndex: number;
}

export default function Profile() {
  const { t } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [selectedScoreType, setSelectedScoreType] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ year: string; major: string } | null>(null)
  
  // 添加获奖记录和实习经历的表单状态
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [showInternshipForm, setShowInternshipForm] = useState(false);
  const [editingAward, setEditingAward] = useState<Award | null>(null);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  
  // 删除确认窗口状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<"award" | "internship" | "score" | null>(null);
  const [deleteItemIndex, setDeleteItemIndex] = useState<number | null>(null);
  const [deleteScoreType, setDeleteScoreType] = useState<string | null>(null);
  
  // 颜色数组，用于生成随机颜色
  const colorPairs = [
    { bg: "bg-red-100", text: "text-red-600" },
    { bg: "bg-blue-100", text: "text-blue-600" },
    { bg: "bg-green-100", text: "text-green-600" },
    { bg: "bg-yellow-100", text: "text-yellow-600" },
    { bg: "bg-purple-100", text: "text-purple-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-indigo-100", text: "text-indigo-600" },
    { bg: "bg-orange-100", text: "text-orange-600" },
    { bg: "bg-teal-100", text: "text-teal-600" },
    { bg: "bg-cyan-100", text: "text-cyan-600" },
  ];
  
  // 各类考试成绩的状态
  const [toeflScore, setToeflScore] = useState<ToeflScore>({
    total: 0,
    reading: 0,
    listening: 0,
    speaking: 0,
    writing: 0
  });
  
  const [ieltsScore, setIeltsScore] = useState<IeltsScore>({
    total: 0,
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0
  });
  
  const [greScore, setGreScore] = useState<GreScore>({
    total: 0,
    math: 0,
    verbal: 0,
    writing: 0
  });
  
  // 获奖记录和实习经历的状态
  const [awards, setAwards] = useState<Award[]>([
    {
      title: "三好学生",
      organization: "2023-2024学年",
      level: "校级",
      date: "2024年6月",
      colorIndex: 0
    },
    {
      title: "数学竞赛二等奖",
      organization: "全国高中数学联赛",
      level: "省级",
      date: "2023年10月",
      colorIndex: 1
    },
    {
      title: "优秀班干部",
      organization: "2022-2023学年",
      level: "校级",
      date: "2023年6月",
      colorIndex: 2
    }
  ]);
  
  const [internships, setInternships] = useState<Internship[]>([
    {
      title: "教学助理实习生",
      company: "新东方教育科技集团",
      period: "2024年7月 - 2024年8月",
      description: "协助数学老师进行课程准备和学生辅导，参与教学活动设计",
      colorIndex: 3
    },
    {
      title: "志愿者",
      company: "北京市图书馆",
      period: "2023年12月 - 2024年2月",
      description: "协助图书管理和读者服务，参与文化活动组织",
      colorIndex: 4
    }
  ]);
  
  // 表单引用
  const formRef = useRef<HTMLFormElement>(null);
  const awardFormRef = useRef<HTMLFormElement>(null);
  const internshipFormRef = useRef<HTMLFormElement>(null);

  // 加载学生信息
  useEffect(() => {
    if (authLoading) return;
    
    if (!user?.isLoggedIn || !user?.userHash) {
      setStudentInfo(null);
      return;
    }
    
    async function loadStudentInfo() {
      try {
        const info = await getStudentInfo(user.userHash);
        setStudentInfo(info);
      } catch (error) {
        console.error('Error loading student info:', error);
        setStudentInfo(null);
      }
    }
    
    loadStudentInfo();
  }, [user, authLoading]);
  
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
  
  // 添加获奖记录处理函数
  const handleAddAward = () => {
    setEditingAward(null);
    setShowAwardForm(true);
  };
  
  const handleEditAward = (award: Award) => {
    setEditingAward(award);
    setShowAwardForm(true);
  };
  
  const handleCancelAward = () => {
    setShowAwardForm(false);
    setEditingAward(null);
  };
  
  const handleAwardSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newAward: Award = {
      title: formData.get("title") as string,
      organization: formData.get("organization") as string,
      level: formData.get("level") as string,
      date: (formData.get("date") as string) || "",
      colorIndex: editingAward ? editingAward.colorIndex : getRandomColorIndex(awards.map(item => item.colorIndex))
    };
    
    if (editingAward) {
      // 更新现有奖项
      setAwards(awards.map(award => 
        award === editingAward ? newAward : award
      ));
    } else {
      // 添加新奖项
      setAwards([...awards, newAward]);
    }
    
    setShowAwardForm(false);
    setEditingAward(null);
  };
  
  // 添加实习经历处理函数
  const handleAddInternship = () => {
    setEditingInternship(null);
    setShowInternshipForm(true);
  };
  
  const handleEditInternship = (internship: Internship) => {
    setEditingInternship(internship);
    setShowInternshipForm(true);
  };
  
  const handleCancelInternship = () => {
    setShowInternshipForm(false);
    setEditingInternship(null);
  };
  
  const handleInternshipSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newInternship: Internship = {
      title: formData.get("title") as string,
      company: formData.get("company") as string,
      period: (formData.get("period") as string) || "",
      description: formData.get("description") as string,
      colorIndex: editingInternship ? editingInternship.colorIndex : getRandomColorIndex(internships.map(item => item.colorIndex))
    };
    
    if (editingInternship) {
      // 更新现有实习
      setInternships(internships.map(internship => 
        internship === editingInternship ? newInternship : internship
      ));
    } else {
      // 添加新实习
      setInternships([...internships, newInternship]);
    }
    
    setShowInternshipForm(false);
    setEditingInternship(null);
  };
  
  // 获取随机颜色索引，确保不与已有颜色相邻
  const getRandomColorIndex = (existingIndices: number[]): number => {
    // 如果没有现有颜色，返回随机颜色
    if (existingIndices.length === 0) {
      return Math.floor(Math.random() * colorPairs.length);
    }
    
    // 找出所有可用的颜色索引（与现有颜色不相邻）
    const availableIndices = [];
    for (let i = 0; i < colorPairs.length; i++) {
      // 检查该颜色是否与任何现有颜色相邻（差值为1）
      const isAdjacent = existingIndices.some(existingIndex => {
        return Math.abs(existingIndex - i) <= 1 || 
               (existingIndex === 0 && i === colorPairs.length - 1) ||
               (existingIndex === colorPairs.length - 1 && i === 0);
      });
      
      if (!isAdjacent && !existingIndices.includes(i)) {
        availableIndices.push(i);
      }
    }
    
    // 如果没有可用颜色，返回随机颜色
    if (availableIndices.length === 0) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * colorPairs.length);
      } while (existingIndices.includes(randomIndex));
      return randomIndex;
    }
    
    // 从可用颜色中随机选择一个
    return availableIndices[Math.floor(Math.random() * availableIndices.length)];
  };
  
  // 处理删除确认
  const handleDeleteConfirm = (type: "award" | "internship", index: number) => {
    setDeleteItemType(type);
    setDeleteItemIndex(index);
    setShowDeleteConfirm(true);
  };
  
  // 处理删除语言成绩确认
  const handleDeleteScoreConfirm = (type: string) => {
    setDeleteItemType("score");
    setDeleteScoreType(type);
    setShowDeleteConfirm(true);
  };
  
  // 执行删除操作
  const confirmDelete = () => {
    if (deleteItemType === "award" && deleteItemIndex !== null) {
      setAwards(awards.filter((_, index) => index !== deleteItemIndex));
    } else if (deleteItemType === "internship" && deleteItemIndex !== null) {
      setInternships(internships.filter((_, index) => index !== deleteItemIndex));
    } else if (deleteItemType === "score" && deleteScoreType) {
      if (deleteScoreType === "toefl") {
        setToeflScore({
          total: 0,
          reading: 0,
          listening: 0,
          speaking: 0,
          writing: 0
        });
      } else if (deleteScoreType === "ielts") {
        setIeltsScore({
          total: 0,
          listening: 0,
          reading: 0,
          writing: 0,
          speaking: 0
        });
      } else if (deleteScoreType === "gre") {
        setGreScore({
          total: 0,
          math: 0,
          verbal: 0,
          writing: 0
        });
      }
    }
    
    setShowDeleteConfirm(false);
    setDeleteItemType(null);
    setDeleteItemIndex(null);
    setDeleteScoreType(null);
  };
  
  // 取消删除操作
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteItemType(null);
    setDeleteItemIndex(null);
    setDeleteScoreType(null);
  };
  
  const handleScoreSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // 安全解析数值函数
    const parseNumericValue = (value: FormDataEntryValue | null): number => {
      if (value === null) return 0;
      const strValue = value.toString().trim();
      if (strValue === '') return 0;
      
      const numValue = parseFloat(strValue);
      return isNaN(numValue) ? 0 : numValue;
    };
    
    const total = parseNumericValue(formData.get("total"));
    
    if (selectedScoreType === "toefl") {
      const reading = parseNumericValue(formData.get("reading"));
      const listening = parseNumericValue(formData.get("listening"));
      const speaking = parseNumericValue(formData.get("speaking"));
      const writing = parseNumericValue(formData.get("writing"));
      
      setToeflScore({
        total,
        reading,
        listening,
        speaking,
        writing
      });
    } else if (selectedScoreType === "ielts") {
      const listening = parseNumericValue(formData.get("listening"));
      const reading = parseNumericValue(formData.get("reading"));
      const writing = parseNumericValue(formData.get("writing"));
      const speaking = parseNumericValue(formData.get("speaking"));
      
      setIeltsScore({
        total,
        listening,
        reading,
        writing,
        speaking
      });
    } else if (selectedScoreType === "gre") {
      const math = parseNumericValue(formData.get("math"));
      const verbal = parseNumericValue(formData.get("verbal"));
      const writing = parseNumericValue(formData.get("writing"));
      
      setGreScore({
        total,
        math,
        verbal,
        writing
      });
    }
    
    setShowScoreForm(false);
    setSelectedScoreType("");
    setEditMode(false);
  };

  return (
    <div className="p-6 relative">
      {showScoreForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editMode ? t('profile.language.form.edit') : t('profile.language.form.title')}</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelAdd} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form ref={formRef} onSubmit={handleScoreSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.language.form.type')}</label>
                  <select 
                    name="type"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={selectedScoreType}
                    onChange={(e) => setSelectedScoreType(e.target.value)}
                    disabled={editMode}
                    required
                  >
                    <option value="">{t('profile.language.form.type.placeholder')}</option>
                    <option value="toefl">托福 TOEFL</option>
                    <option value="ielts">雅思 IELTS</option>
                    <option value="gre">GRE</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.language.form.total')}</label>
                  <input 
                    name="total"
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={
                      editMode ? 
                      (selectedScoreType === "toefl" ? toeflScore.total : 
                       selectedScoreType === "ielts" ? ieltsScore.total : 
                       selectedScoreType === "gre" ? greScore.total : 0) : ""
                    }
                    required 
                  />
                </div>
                
                {selectedScoreType === "toefl" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.toefl.reading')}</label>
                      <input 
                        name="reading"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.toefl.max')}
                        defaultValue={editMode ? toeflScore.reading : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.toefl.listening')}</label>
                      <input 
                        name="listening"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.toefl.max')}
                        defaultValue={editMode ? toeflScore.listening : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.toefl.speaking')}</label>
                      <input 
                        name="speaking"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.toefl.max')}
                        defaultValue={editMode ? toeflScore.speaking : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.toefl.writing')}</label>
                      <input 
                        name="writing"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.toefl.max')}
                        defaultValue={editMode ? toeflScore.writing : ""}
                      />
                    </div>
                  </div>
                )}
                
                {selectedScoreType === "ielts" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.ielts.listening')}</label>
                      <input 
                        name="listening"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.ielts.example')}
                        defaultValue={editMode ? ieltsScore.listening : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.ielts.reading')}</label>
                      <input 
                        name="reading"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.ielts.example')}
                        defaultValue={editMode ? ieltsScore.reading : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.ielts.writing')}</label>
                      <input 
                        name="writing"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.ielts.example')}
                        defaultValue={editMode ? ieltsScore.writing : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.ielts.speaking')}</label>
                      <input 
                        name="speaking"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.ielts.example')}
                        defaultValue={editMode ? ieltsScore.speaking : ""}
                      />
                    </div>
                  </div>
                )}
                
                {selectedScoreType === "gre" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.gre.math')}</label>
                      <input 
                        name="math"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.gre.max')}
                        defaultValue={editMode ? greScore.math : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.gre.verbal')}</label>
                      <input 
                        name="verbal"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.gre.max')}
                        defaultValue={editMode ? greScore.verbal : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('profile.language.gre.writing')}</label>
                      <input 
                        name="writing"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder={t('profile.language.form.gre.writing.example')}
                        defaultValue={editMode ? greScore.writing : ""}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelAdd}>{t('profile.common.cancel')}</Button>
                  <Button type="submit">{t('profile.common.save')}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 获奖记录表单 */}
      {showAwardForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingAward ? t('profile.awards.form.edit') : t('profile.awards.form.title')}</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelAward} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form ref={awardFormRef} onSubmit={handleAwardSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.awards.form.name')}</label>
                  <input 
                    name="title"
                    type="text" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingAward?.title || ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.awards.form.organization')}</label>
                  <input 
                    name="organization"
                    type="text" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingAward?.organization || ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.awards.form.level')}</label>
                  <select 
                    name="level"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingAward?.level || ""}
                  >
                    <option value="">{t('profile.awards.form.level.placeholder')}</option>
                    <option value="国家级">{t('profile.awards.form.level.national')}</option>
                    <option value="省级">{t('profile.awards.form.level.provincial')}</option>
                    <option value="市级">{t('profile.awards.form.level.municipal')}</option>
                    <option value="校级">{t('profile.awards.form.level.school')}</option>
                    <option value="其他">{t('profile.awards.form.level.other')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.awards.form.date')}</label>
                  <input 
                    name="date"
                    type="text" 
                    placeholder={t('profile.awards.form.date.placeholder')}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingAward?.date || ""}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelAward}>{t('profile.common.cancel')}</Button>
                  <Button type="submit">{t('profile.common.save')}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 工作经历表单 */}
      {showInternshipForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingInternship ? t('profile.work.form.edit') : t('profile.work.form.title')}</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelInternship} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form ref={internshipFormRef} onSubmit={handleInternshipSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.work.form.position')}</label>
                  <input 
                    name="title"
                    type="text" 
                    required 
                    placeholder={t('profile.work.form.position.placeholder')}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingInternship?.title || ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.work.form.company')}</label>
                  <input 
                    name="company"
                    type="text" 
                    required 
                    placeholder={t('profile.work.form.company.placeholder')}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingInternship?.company || ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.work.form.period')}</label>
                  <input 
                    name="period"
                    type="text" 
                    placeholder={t('profile.work.form.period.placeholder')}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingInternship?.period || ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.work.form.description')}</label>
                  <textarea 
                    name="description"
                    required 
                      rows={4}
                      placeholder={t('profile.work.form.description.placeholder')}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      defaultValue={editingInternship?.description || ""}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelInternship}>{t('profile.common.cancel')}</Button>
                  <Button type="submit">{t('profile.common.save')}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 删除确认窗口 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 mx-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">{t('profile.common.confirm.delete')}</h3>
              <p className="text-muted-foreground mt-2">
                {deleteItemType === "award" ? t('profile.common.confirm.delete.award') : 
                 deleteItemType === "internship" ? t('profile.common.confirm.delete.work') :
                 deleteItemType === "score" && deleteScoreType === "toefl" ? t('profile.common.confirm.delete.toefl') :
                 deleteItemType === "score" && deleteScoreType === "ielts" ? t('profile.common.confirm.delete.ielts') :
                 deleteItemType === "score" && deleteScoreType === "gre" ? t('profile.common.confirm.delete.gre') : 
                 "您确定要删除这条记录吗？"}
                {t('profile.common.confirm.delete.note')}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={cancelDelete}>{t('profile.common.cancel')}</Button>
              <Button variant="destructive" onClick={confirmDelete}>{t('profile.common.delete')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground">
          {studentInfo 
            ? `${studentInfo.year}${studentInfo.major}-${user?.userId || ''}`
            : t('profile.description')
          }
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                {t('profile.awards.title')}
              </div>
              <Button size="sm" className="flex items-center gap-2" onClick={handleAddAward}>
                <Plus className="h-4 w-4" />
                {t('profile.awards.add')}
              </Button>
            </CardTitle>
            <CardDescription>{t('profile.awards.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {awards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('profile.awards.empty')}
                </div>
              ) : (
                <div className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 ${awards.length > 4 ? "max-h-[500px] overflow-y-auto pr-2" : ""}`}>
                  {awards.map((award, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg group hover:bg-gray-50">
                      <div className={`w-12 h-12 ${colorPairs[award.colorIndex].bg} rounded-full flex items-center justify-center`}>
                        <Award className={`h-6 w-6 ${colorPairs[award.colorIndex].text}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base">{award.title}</h4>
                        <p className="text-sm text-muted-foreground">{award.organization} • {award.level}</p>
                        <p className="text-sm text-muted-foreground mt-1">{award.date ? award.date : "——"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleEditAward(award)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteConfirm("award", index)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {t('profile.work.title')}
              </div>
              <Button size="sm" className="flex items-center gap-2" onClick={handleAddInternship}>
                <Plus className="h-4 w-4" />
                {t('profile.work.add')}
              </Button>
            </CardTitle>
            <CardDescription>{t('profile.work.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {internships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('profile.work.empty')}
                </div>
              ) : (
                <div className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 ${internships.length > 4 ? "max-h-[500px] overflow-y-auto pr-2" : ""}`}>
                  {internships.map((internship, index) => (
                    <div key={index} className="flex flex-col p-4 border rounded-lg group hover:bg-gray-50">
                      <div className="flex items-start gap-4 mb-2">
                      <div className={`w-12 h-12 ${colorPairs[internship.colorIndex].bg} rounded-full flex items-center justify-center`}>
                        <Briefcase className={`h-6 w-6 ${colorPairs[internship.colorIndex].text}`} />
                      </div>
                      <div className="flex-1">
                          <h4 className="font-semibold text-base">{internship.title}</h4>
                        <p className="text-sm text-muted-foreground mb-1">{internship.company}</p>
                          <p className="text-xs text-muted-foreground">{internship.period ? internship.period : "——"}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleEditInternship(internship)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteConfirm("internship", index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      </div>
                      <p className="text-sm mt-2 pl-16">{internship.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                {t('profile.language.title')}
              </div>
              <Button size="sm" className="flex items-center gap-2" onClick={handleAddScore}>
                <Plus className="h-4 w-4" />
                {t('profile.language.add')}
              </Button>
            </CardTitle>
            <CardDescription>{t('profile.language.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {toeflScore.total === 0 && ieltsScore.total === 0 && greScore.total === 0 ? (
                <div className="text-center py-8 text-muted-foreground md:col-span-2 lg:col-span-3">
                  {t('profile.language.empty')}
                </div>
              ) : (
                <>
                  {toeflScore.total > 0 && (
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
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleDeleteScoreConfirm("toefl")}>
                            <Trash2 className="h-2 w-2" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-red-600">{toeflScore.total}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('profile.language.toefl.reading')}:{toeflScore.reading} | {t('profile.language.toefl.listening')}:{toeflScore.listening} | {t('profile.language.toefl.speaking')}:{toeflScore.speaking} | {t('profile.language.toefl.writing')}:{toeflScore.writing}
                        </div>
                      </div>
                    </div>
                  )}

                  {ieltsScore.total > 0 && (
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
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleDeleteScoreConfirm("ielts")}>
                            <Trash2 className="h-2 w-2" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-blue-600">{ieltsScore.total}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('profile.language.ielts.listening')}:{ieltsScore.listening} | {t('profile.language.ielts.reading')}:{ieltsScore.reading} | {t('profile.language.ielts.writing')}:{ieltsScore.writing} | {t('profile.language.ielts.speaking')}:{ieltsScore.speaking}
                        </div>
                      </div>
                    </div>
                  )}

                  {greScore.total > 0 && (
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
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleDeleteScoreConfirm("gre")}>
                            <Trash2 className="h-2 w-2" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-purple-600">{greScore.total}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('profile.language.gre.math')}:{greScore.math} | {t('profile.language.gre.verbal')}:{greScore.verbal} | {t('profile.language.gre.writing')}:{greScore.writing}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}