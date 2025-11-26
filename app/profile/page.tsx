"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Briefcase, Languages, Info, Plus, Edit, Trash2, X, Loader2, CheckCircle, AlertCircle, FileText, Shield, Trophy } from "lucide-react"
import { useState, FormEvent, useRef, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/AuthContext"
import { getStudentInfo } from "@/lib/dashboard-data"
import CompetitionForm from "@/components/competitions/CompetitionForm"
import { 
  getUserLanguageScores, 
  getUserAwards, 
  getUserInternships,
  getUserOtherInfo,
  getUserPapers,
  getUserPatents,
  saveLanguageScore,
  saveAward,
  saveInternship,
  saveOtherInfo,
  savePaper,
  savePatent,
  deleteLanguageScore,
  deleteAward,
  deleteInternship,
  deleteOtherInfo,
  deletePaper,
  deletePatent,
  convertToToeflScore,
  convertToIeltsScore,
  convertToGreScore,
  OTHER_INFO_CATEGORIES,
  type Award as DbAward,
  type Internship as DbInternship,
  type LanguageScore,
  type OtherInfo,
  type Paper,
  type Patent
} from "@/lib/profile-data"


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
  id?: string;
  title: string;
  organization: string;
  level: string;
  date: string;
  colorIndex: number;
}

// 定义实习经历接口
interface Internship {
  id?: string;
  title: string;
  company: string;
  period: string;
  description: string;
  colorIndex: number;
}

// 定义其他信息接口
interface OtherInfoLocal {
  id?: string;
  category: string;
  content: string;
  colorIndex: number;
}

// 定义论文接口
interface PaperLocal {
  id?: string;
  paper_title: string;
  journal_name?: string;
  journal_category?: string;
  bupt_student_id?: string;
  full_name?: string;
  class?: string;
  author_type?: string;
  publish_date?: string;
  note?: string;
  colorIndex: number;
}

// 定义专利接口
interface PatentLocal {
  id?: string;
  patent_name: string;
  patent_number?: string;
  patent_date?: string;
  bupt_student_id?: string;
  class?: string;
  full_name?: string;
  category_of_patent_owner?: string;
  note?: string;
  colorIndex: number;
}

// 定义竞赛记录接口
interface CompetitionRecord {
  id?: string;
  competition_region: string;
  competition_level: string;
  competition_name: string;
  bupt_student_id: string;
  full_name: string;
  class: string;
  note: string;
  score: number;
  colorIndex: number;
  award_type?: 'prize' | 'ranking';
  award_value?: string;
  competition_type?: 'individual' | 'team';
  team_leader_is_bupt?: boolean;
  is_main_member?: boolean;
  main_members_count?: number;
  coefficient?: number;
}

export default function Profile() {
  const { t } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [selectedScoreType, setSelectedScoreType] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ year: string; major: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  
  // 添加获奖记录和实习经历的表单状态
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [showInternshipForm, setShowInternshipForm] = useState(false);
  const [showOtherInfoForm, setShowOtherInfoForm] = useState(false);
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [showPatentForm, setShowPatentForm] = useState(false);
  const [showCompetitionForm, setShowCompetitionForm] = useState(false);
  const [editingAward, setEditingAward] = useState<Award | null>(null);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  const [editingOtherInfo, setEditingOtherInfo] = useState<OtherInfoLocal | null>(null);
  const [editingPaper, setEditingPaper] = useState<PaperLocal | null>(null);
  const [editingPatent, setEditingPatent] = useState<PatentLocal | null>(null);
  const [editingCompetition, setEditingCompetition] = useState<CompetitionRecord | null>(null);
  
  // 删除确认窗口状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<"award" | "internship" | "score" | "other" | "paper" | "patent" | "competition" | null>(null);
  const [deleteItemIndex, setDeleteItemIndex] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteScoreType, setDeleteScoreType] = useState<string | null>(null);

  // 表单错误状态
  const [paperErrors, setPaperErrors] = useState<{[key: string]: string}>({});
  const [patentErrors, setPatentErrors] = useState<{[key: string]: string}>({});
  
  // 自定义输入状态
  const [paperAuthorTypeCustom, setPaperAuthorTypeCustom] = useState(false);
  const [patentOwnerCategoryCustom, setPatentOwnerCategoryCustom] = useState(false);
  
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
      title: "校级奖学金",
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
      title: "XXX职位",
      company: "公司名称",
      period: "2024年7月 - 2024年8月",
      description: "职位描述",
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
  
  // 其他信息状态
  const [otherInfoList, setOtherInfoList] = useState<OtherInfoLocal[]>([]);
  
  // 论文和专利状态
  const [papers, setPapers] = useState<PaperLocal[]>([]);
  const [patents, setPatents] = useState<PatentLocal[]>([]);
  
  // 竞赛记录状态
  const [competitionRecords, setCompetitionRecords] = useState<CompetitionRecord[]>([]);
  
  // 学生审核状态
  const [approvalStatus, setApprovalStatus] = useState<string>('pending');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // 表单引用
  const formRef = useRef<HTMLFormElement>(null);
  const awardFormRef = useRef<HTMLFormElement>(null);
  const internshipFormRef = useRef<HTMLFormElement>(null);
  const otherInfoFormRef = useRef<HTMLFormElement>(null);
  const paperFormRef = useRef<HTMLFormElement>(null);
  const patentFormRef = useRef<HTMLFormElement>(null);

  const translateJournalCategory = (category: string) => {
    if (category === 'SCI') return t('profile.papers.form.journal_category.sci')
    if (category === 'EI') return t('profile.papers.form.journal_category.ei')
    if (category === 'CSCD') return t('profile.papers.form.journal_category.cscd')
    if (category === '核心期刊') return t('profile.papers.form.journal_category.core')
    if (category === '普通期刊') return t('profile.papers.form.journal_category.normal')
    if (category === '会议论文') return t('profile.papers.form.journal_category.conference')
    if (category === '其他') return t('profile.papers.form.journal_category.other')
    return category
  }

  const translateAuthorType = (type: string) => {
    if (type === '第一作者') return t('profile.papers.form.author_type.first')
    if (type === '通讯作者') return t('profile.papers.form.author_type.corresponding')
    if (type === '独立第一作者') return t('profile.papers.form.author_type.independent.first')
    if (type === '独立作者') return t('profile.papers.form.author_type.independent')
    if (type === '其他') return t('profile.papers.form.author_type.other')
    return type
  }
  
  // 获取竞赛记录的函数
  const getUserCompetitionRecords = async (userId: string): Promise<CompetitionRecord[]> => {
    try {
      const response = await fetch(`/api/competition-records?userId=${userId}`)
      const result = await response.json()
      
      if (result.success) {
        return result.data.map((record: any, index: number) => ({
          ...record,
          colorIndex: getRandomColorIndex(competitionRecords.map(r => r.colorIndex))
        }))
      }
      return []
    } catch (error) {
      console.error('获取竞赛记录失败:', error)
      return []
    }
  }

  // 获取学生审核状态的函数
  const getStudentApprovalStatus = async (studentId: string) => {
    try {
      const response = await fetch(`/api/student-approval-status?studentId=${studentId}`)
      const result = await response.json()
      
      if (result.success) {
        setApprovalStatus(result.data.approval_status)
        setIsLocked(result.data.is_locked)
      }
    } catch (error) {
      console.error('获取学生审核状态失败:', error)
      // 默认为未锁定状态
      setApprovalStatus('pending')
      setIsLocked(false)
    }
  }

  // 加载学生信息和用户个人资料数据
  useEffect(() => {
    if (authLoading) return;
    
    if (!user?.isLoggedIn || !user?.userHash) {
      setStudentInfo(null);
      return;
    }
    
    async function loadData() {
      if (!user?.userHash) return;
      
      setIsLoading(true);
      try {
        // 并行加载所有数据
        const [info, languageScores, userAwards, userInternships, userOtherInfo, userPapers, userPatents, userCompetitionRecords] = await Promise.all([
          getStudentInfo(user.userHash),
          getUserLanguageScores(user.userHash),
          getUserAwards(user.userHash),
          getUserInternships(user.userHash),
          getUserOtherInfo(user.userHash),
          getUserPapers(user.userId),
          getUserPatents(user.userId),
          getUserCompetitionRecords(user.userId)
        ]);

        // 获取学生审核状态
        if (user.userId) {
          await getStudentApprovalStatus(user.userId);
        }
        
        setStudentInfo(info);
        
        // 更新语言成绩
        languageScores.forEach(score => {
          if (score.scoreType === 'toefl') {
            setToeflScore(convertToToeflScore(score));
          } else if (score.scoreType === 'ielts') {
            setIeltsScore(convertToIeltsScore(score));
          } else if (score.scoreType === 'gre') {
            setGreScore(convertToGreScore(score));
          }
        });
        
        // 更新获奖记录、实习经历、其他信息、论文、专利和竞赛记录
        setAwards(userAwards);
        setInternships(userInternships);
        setOtherInfoList(userOtherInfo);
        setPapers(userPapers as PaperLocal[]);
        setPatents(userPatents as PatentLocal[]);
        setCompetitionRecords(userCompetitionRecords || []);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setStudentInfo(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
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
  
  const handleAwardSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saveStatus === 'saving') return;
    
    if (!user?.userHash) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    setSaveStatus('saving');
    
    const newAward: Award = {
      id: editingAward?.id,
      title: formData.get("title") as string,
      organization: formData.get("organization") as string,
      level: formData.get("level") as string,
      date: (formData.get("date") as string) || "",
      colorIndex: editingAward ? editingAward.colorIndex : getRandomColorIndex(awards.map(item => item.colorIndex))
    };
    
    try {
      const success = await saveAward(user.userHash, newAward);
      
      if (success) {
        if (editingAward) {
          // 更新现有奖项
          setAwards(awards.map(award => 
            award.id === editingAward.id ? newAward : award
          ));
        } else {
          // 重新加载获奖记录以获取新的ID
          const updatedAwards = await getUserAwards(user.userHash);
          setAwards(updatedAwards);
        }
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving award:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
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
  
  const handleInternshipSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saveStatus === 'saving') return;
    
    if (!user?.userHash) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    setSaveStatus('saving');
    
    const newInternship: Internship = {
      id: editingInternship?.id,
      title: formData.get("title") as string,
      company: formData.get("company") as string,
      period: (formData.get("period") as string) || "",
      description: formData.get("description") as string,
      colorIndex: editingInternship ? editingInternship.colorIndex : getRandomColorIndex(internships.map(item => item.colorIndex))
    };
    
    try {
      const success = await saveInternship(user.userHash, newInternship);
      
      if (success) {
        if (editingInternship) {
          // 更新现有实习
          setInternships(internships.map(internship => 
            internship.id === editingInternship.id ? newInternship : internship
          ));
        } else {
          // 重新加载实习记录以获取新的ID
          const updatedInternships = await getUserInternships(user.userHash);
          setInternships(updatedInternships);
        }
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving internship:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    
    setShowInternshipForm(false);
    setEditingInternship(null);
  };

  // 添加其他信息处理函数
  const handleAddOtherInfo = () => {
    setEditingOtherInfo(null);
    setShowOtherInfoForm(true);
  };
  
  const handleEditOtherInfo = (info: OtherInfoLocal) => {
    setEditingOtherInfo(info);
    setShowOtherInfoForm(true);
  };
  
  const handleCancelOtherInfo = () => {
    setShowOtherInfoForm(false);
    setEditingOtherInfo(null);
  };
  
  const handleOtherInfoSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saveStatus === 'saving') return;
    
    if (!user?.userHash) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    setSaveStatus('saving');
    
    const newOtherInfo: OtherInfoLocal = {
      id: editingOtherInfo?.id,
      category: formData.get("category") as string,
      content: formData.get("content") as string,
      colorIndex: editingOtherInfo ? editingOtherInfo.colorIndex : getRandomColorIndex(otherInfoList.map(item => item.colorIndex))
    };
    
    try {
      const success = await saveOtherInfo(user.userHash, newOtherInfo);
      
      if (success) {
        if (editingOtherInfo) {
          // 更新现有信息
          setOtherInfoList(otherInfoList.map(info => 
            info.id === editingOtherInfo.id ? newOtherInfo : info
          ));
        } else {
          // 重新加载其他信息以获取新的ID
          const updatedOtherInfo = await getUserOtherInfo(user.userHash);
          setOtherInfoList(updatedOtherInfo);
        }
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving other info:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    
    setShowOtherInfoForm(false);
    setEditingOtherInfo(null);
  };
  
  // 添加论文处理函数
  const handleAddPaper = () => {
    if (isLocked) {
      alert('您的推免资格已通过审核，无法修改保研相关信息');
      return;
    }
    setEditingPaper(null);
    setPaperErrors({});
    setPaperAuthorTypeCustom(false);
    setShowPaperForm(true);
  };
  
  const handleEditPaper = (paper: PaperLocal) => {
    if (isLocked) {
      alert('您的推免资格已通过审核，无法修改保研相关信息');
      return;
    }
    setEditingPaper(paper);
    setPaperErrors({});
    // 检查是否需要显示自定义输入框
    const predefinedAuthorTypes = ["第一作者", "通讯作者", "独立第一作者", "独立作者"];
    if (paper.author_type && !predefinedAuthorTypes.includes(paper.author_type)) {
      setPaperAuthorTypeCustom(true);
    } else {
      setPaperAuthorTypeCustom(false);
    }
    setShowPaperForm(true);
  };
  
  const handleCancelPaper = () => {
    setShowPaperForm(false);
    setEditingPaper(null);
    setPaperAuthorTypeCustom(false);
  };
  
  const handlePaperSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saveStatus === 'saving') return;
    
    if (!user?.userHash) {
      console.error('User hash is missing');
      return;
    }
    
    if (!user?.userId) {
      console.error('User ID is missing');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }
    
    if (!user?.name) {
      console.error('User name is missing');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // 清除之前的错误
    setPaperErrors({});
    
    // 验证表单
    const errors = validatePaperForm(formData);
    if (Object.keys(errors).length > 0) {
      setPaperErrors(errors);
      return;
    }
    
    setSaveStatus('saving');
    
    // 处理作者类型，如果选择了"其他"，使用自定义输入的值
    const authorType = formData.get("author_type") as string;
    const customAuthorType = formData.get("author_type_custom") as string;
    const finalAuthorType = authorType === "其他" && customAuthorType ? customAuthorType : authorType;

    const newPaper: PaperLocal = {
      id: editingPaper?.id,
      paper_title: formData.get("paper_title") as string,
      journal_name: formData.get("journal_name") as string,
      journal_category: formData.get("journal_category") as string,
      class: formData.get("class") as string,
      author_type: finalAuthorType,
      publish_date: formData.get("publish_date") as string,
      note: formData.get("note") as string,
      colorIndex: editingPaper ? editingPaper.colorIndex : getRandomColorIndex(papers.map(item => item.colorIndex))
    };
    
    try {
      const success = await savePaper(user.userId, user.name, newPaper);
      
      if (success) {
        if (editingPaper) {
          // 更新现有论文
          setPapers(papers.map(paper => 
            paper.id === editingPaper.id ? newPaper : paper
          ));
        } else {
          // 重新加载论文记录以获取新的ID
          const updatedPapers = await getUserPapers(user.userId);
          setPapers(updatedPapers as PaperLocal[]);
        }
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving paper:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    
    setShowPaperForm(false);
    setEditingPaper(null);
    setPaperAuthorTypeCustom(false);
  };
  
  // 添加专利处理函数
  const handleAddPatent = () => {
    if (isLocked) {
      alert('您的推免资格已通过审核，无法修改保研相关信息');
      return;
    }
    setEditingPatent(null);
    setPatentErrors({});
    setPatentOwnerCategoryCustom(false);
    setShowPatentForm(true);
  };
  
  const handleEditPatent = (patent: PatentLocal) => {
    if (isLocked) {
      alert('您的推免资格已通过审核，无法修改保研相关信息');
      return;
    }
    setEditingPatent(patent);
    setPatentErrors({});
    // 检查是否需要显示自定义输入框
    const predefinedPatentOwnerCategories = ["独立发明人", "第一发明人（多人）"];
    if (patent.category_of_patent_owner && !predefinedPatentOwnerCategories.includes(patent.category_of_patent_owner)) {
      setPatentOwnerCategoryCustom(true);
    } else {
      setPatentOwnerCategoryCustom(false);
    }
    setShowPatentForm(true);
  };
  
  const handleCancelPatent = () => {
    setShowPatentForm(false);
    setEditingPatent(null);
    setPatentOwnerCategoryCustom(false);
  };
  
  const handlePatentSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saveStatus === 'saving') return;
    
    if (!user?.userHash) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // 清除之前的错误
    setPatentErrors({});
    
    // 验证表单
    const errors = validatePatentForm(formData);
    if (Object.keys(errors).length > 0) {
      setPatentErrors(errors);
      return;
    }
    
    setSaveStatus('saving');
    
    // 处理专利权人类别，如果选择了"其他"，使用自定义输入的值
    const patentOwnerCategory = formData.get("category_of_patent_owner") as string;
    const customPatentOwnerCategory = formData.get("category_of_patent_owner_custom") as string;
    const finalPatentOwnerCategory = patentOwnerCategory === "其他" && customPatentOwnerCategory ? customPatentOwnerCategory : patentOwnerCategory;
    
    const newPatent: PatentLocal = {
      id: editingPatent?.id,
      patent_name: formData.get("patent_name") as string,
      patent_number: formData.get("patent_number") as string,
      patent_date: formData.get("patent_date") as string,
      class: formData.get("class") as string,
      category_of_patent_owner: finalPatentOwnerCategory,
      note: formData.get("note") as string,
      colorIndex: editingPatent ? editingPatent.colorIndex : getRandomColorIndex(patents.map(item => item.colorIndex))
    };
    
    try {
      const success = await savePatent(user.userId, user.name, newPatent);
      
      if (success) {
        if (editingPatent) {
          // 更新现有专利
          setPatents(patents.map(patent => 
            patent.id === editingPatent.id ? newPatent : patent
          ));
        } else {
          // 重新加载专利记录以获取新的ID
          const updatedPatents = await getUserPatents(user.userId);
          setPatents(updatedPatents as PatentLocal[]);
        }
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving patent:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    
    setShowPatentForm(false);
    setEditingPatent(null);
    setPatentOwnerCategoryCustom(false);
  };
  
  // 添加竞赛处理函数
  const handleAddCompetition = () => {
    if (isLocked) {
      alert('您的推免资格已通过审核，无法修改保研相关信息');
      return;
    }
    setEditingCompetition(null);
    setShowCompetitionForm(true);
  };
  
  const handleEditCompetition = (competition: CompetitionRecord) => {
    if (isLocked) {
      alert('您的推免资格已通过审核，无法修改保研相关信息');
      return;
    }
    setEditingCompetition(competition);
    setShowCompetitionForm(true);
  };
  
  const handleCancelCompetition = () => {
    setShowCompetitionForm(false);
    setEditingCompetition(null);
  };
  
  const handleCompetitionSubmit = async (record: CompetitionRecord) => {
    if (saveStatus === 'saving') return;
    if (!user?.userId || !user?.name) return;
    
    setSaveStatus('saving');
    
    try {
      const requestData = {
        competition_region: record.competition_region,
        competition_level: record.competition_level,
        competition_name: record.competition_name,
        bupt_student_id: user.userId,
        full_name: user.name,
        class: record.class,
        award_type: (record as any).award_type,
        award_value: (record as any).award_value,
        competition_type: record.competition_type,
        team_leader_is_bupt: record.team_leader_is_bupt,
        is_main_member: record.is_main_member,
        main_members_count: record.main_members_count,
        coefficient: record.coefficient,
        note: record.note
      };
      
      const response = await fetch('/api/competition-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 重新加载竞赛记录
        const updatedRecords = await getUserCompetitionRecords(user.userId);
        setCompetitionRecords(updatedRecords);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving competition record:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    
    setShowCompetitionForm(false);
    setEditingCompetition(null);
  };
  
  // 表单验证函数
  const validatePaperForm = (formData: FormData): {[key: string]: string} => {
    const errors: {[key: string]: string} = {};
    
    const paperTitle = formData.get("paper_title") as string;
    
    if (!paperTitle || paperTitle.trim() === '') {
      errors.paper_title = '论文标题不能为空';
    }
    
    return errors;
  };

  const validatePatentForm = (formData: FormData): {[key: string]: string} => {
    const errors: {[key: string]: string} = {};
    
    const patentName = formData.get("patent_name") as string;
    
    if (!patentName || patentName.trim() === '') {
      errors.patent_name = '专利名称不能为空';
    }
    
    return errors;
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
  const handleDeleteConfirm = (type: "award" | "internship" | "other" | "paper" | "patent" | "competition", index: number, id?: string) => {
    setDeleteItemType(type);
    setDeleteItemIndex(index);
    setDeleteItemId(id || null);
    setShowDeleteConfirm(true);
  };
  
  // 处理删除语言成绩确认
  const handleDeleteScoreConfirm = (type: string) => {
    setDeleteItemType("score");
    setDeleteScoreType(type);
    setShowDeleteConfirm(true);
  };
  
  // 执行删除操作
  const confirmDelete = async () => {
    if (saveStatus === 'saving') return;
    if (!user?.userHash) return;
    
    setSaveStatus('saving');
    
    try {
      let success = false;
      
      if (deleteItemType === "award" && deleteItemId) {
        success = await deleteAward(user.userHash, deleteItemId);
        if (success) {
          setAwards(awards.filter(award => award.id !== deleteItemId));
        }
      } else if (deleteItemType === "internship" && deleteItemId) {
        success = await deleteInternship(user.userHash, deleteItemId);
        if (success) {
          setInternships(internships.filter(internship => internship.id !== deleteItemId));
        }
      } else if (deleteItemType === "other" && deleteItemId) {
        success = await deleteOtherInfo(user.userHash, deleteItemId);
        if (success) {
          setOtherInfoList(otherInfoList.filter(info => info.id !== deleteItemId));
        }
      } else if (deleteItemType === "paper" && deleteItemId) {
        success = await deletePaper(user.userId, deleteItemId);
        if (success) {
          setPapers(papers.filter(paper => paper.id !== deleteItemId));
        }
      } else if (deleteItemType === "patent" && deleteItemId) {
        success = await deletePatent(user.userId, deleteItemId);
        if (success) {
          setPatents(patents.filter(patent => patent.id !== deleteItemId));
        }
      } else if (deleteItemType === "competition" && deleteItemId) {
        const response = await fetch(`/api/competition-records?id=${deleteItemId}&userId=${user.userId}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        success = result.success;
        if (success) {
          setCompetitionRecords(competitionRecords.filter(record => record.id !== deleteItemId));
        }
      } else if (deleteItemType === "score" && deleteScoreType) {
        success = await deleteLanguageScore(user.userHash, deleteScoreType);
        if (success) {
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
      }
      
      if (success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    
    setShowDeleteConfirm(false);
    setDeleteItemType(null);
    setDeleteItemIndex(null);
    setDeleteItemId(null);
    setDeleteScoreType(null);
  };
  
  // 取消删除操作
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteItemType(null);
    setDeleteItemIndex(null);
    setDeleteItemId(null);
    setDeleteScoreType(null);
  };
  
  const handleScoreSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user?.userHash) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    setSaveStatus('saving');
    
    // 安全解析数值函数
    const parseNumericValue = (value: FormDataEntryValue | null): number => {
      if (value === null) return 0;
      const strValue = value.toString().trim();
      if (strValue === '') return 0;
      
      const numValue = parseFloat(strValue);
      return isNaN(numValue) ? 0 : numValue;
    };
    
    const total = parseNumericValue(formData.get("total"));
    let languageScore: LanguageScore;
    
    // 在编辑模式下，需要获取现有记录的ID
    let existingScoreId: string | undefined;
    if (editMode) {
      const existingScores = await getUserLanguageScores(user.userHash);
      const existingScore = existingScores.find(score => score.scoreType === selectedScoreType);
      existingScoreId = existingScore?.id;
    }
    
    if (selectedScoreType === "toefl") {
      const reading = parseNumericValue(formData.get("reading"));
      const listening = parseNumericValue(formData.get("listening"));
      const speaking = parseNumericValue(formData.get("speaking"));
      const writing = parseNumericValue(formData.get("writing"));
      
      languageScore = {
        id: existingScoreId,
        scoreType: 'toefl',
        totalScore: total,
        readingScore: reading,
        listeningScore: listening,
        speakingScore: speaking,
        writingScore: writing
      };
      
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
      
      languageScore = {
        id: existingScoreId,
        scoreType: 'ielts',
        totalScore: total,
        listeningScore: listening,
        readingScore: reading,
        writingScore: writing,
        speakingScore: speaking
      };
      
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
      
      languageScore = {
        id: existingScoreId,
        scoreType: 'gre',
        totalScore: total,
        mathScore: math,
        verbalScore: verbal,
        writingScore: writing
      };
      
      setGreScore({
        total,
        math,
        verbal,
        writing
      });
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }
    
    try {
      const success = await saveLanguageScore(user.userHash, languageScore);
      
      if (success) {
        // 重新加载语言成绩数据以确保页面显示最新数据
        const updatedLanguageScores = await getUserLanguageScores(user.userHash);
        
        // 更新本地状态
        updatedLanguageScores.forEach(score => {
          if (score.scoreType === 'toefl') {
            setToeflScore(convertToToeflScore(score));
          } else if (score.scoreType === 'ielts') {
            setIeltsScore(convertToIeltsScore(score));
          } else if (score.scoreType === 'gre') {
            setGreScore(convertToGreScore(score));
          }
        });
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving language score:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    
    setShowScoreForm(false);
    setSelectedScoreType("");
    setEditMode(false);
  };

  // 状态提示组件
  const StatusAlert = () => {
    if (saveStatus === 'idle') return null;
    
    return (
      <div className="fixed top-4 right-4 z-50">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>保存中...</span>
          </div>
        )}
        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg">
            <CheckCircle className="h-4 w-4" />
            <span>保存成功！</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <span>保存失败，请重试</span>
          </div>
        )}
      </div>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.isLoggedIn) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">请先登录查看个人资料</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      <StatusAlert />
      
      {/* 锁定状态提示 */}
      {isLocked && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-800">推免资格已锁定</h3>
              <p className="text-sm text-orange-700 mt-1">
                您的推免资格已通过审核，所有保研相关信息（论文、专利、竞赛记录）已被锁定，无法进行修改。
                如需修改，请联系管理员。
              </p>
            </div>
          </div>
        </div>
      )}
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
                  <Button type="submit" disabled={saveStatus === 'saving'}>{t('profile.common.save')}</Button>
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
                  <Button type="submit" disabled={saveStatus === 'saving'}>{t('profile.common.save')}</Button>
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
                  <Button type="submit" disabled={saveStatus === 'saving'}>{t('profile.common.save')}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 其他信息表单 */}
      {showOtherInfoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingOtherInfo ? t('profile.other.form.edit') : t('profile.other.form.title')}</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelOtherInfo} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form ref={otherInfoFormRef} onSubmit={handleOtherInfoSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.other.form.category')}</label>
                  <select 
                    name="category"
                    required 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingOtherInfo?.category || ""}
                  >
                    <option value="">{t('profile.other.form.category.placeholder')}</option>
                    {OTHER_INFO_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.other.form.content')}</label>
                  <textarea 
                    name="content"
                    required 
                    rows={4}
                    placeholder={t('profile.other.form.content.placeholder')}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingOtherInfo?.content || ""}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelOtherInfo}>{t('profile.common.cancel')}</Button>
                  <Button type="submit" disabled={saveStatus === 'saving'}>{t('profile.common.save')}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 论文表单 */}
      {showPaperForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingPaper ? t('profile.papers.form.edit') : t('profile.papers.form.title')}</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelPaper} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form key={editingPaper?.id || 'new'} ref={paperFormRef} onSubmit={handlePaperSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.papers.form.paper_title')}</label>
                  <input 
                    name="paper_title"
                    type="text" 
                    required
                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${paperErrors.paper_title ? 'border-red-500' : ''}`}
                    defaultValue={editingPaper?.paper_title || ""}
                    placeholder={t('profile.papers.form.paper_title.placeholder')}
                  />
                  {paperErrors.paper_title && (
                    <p className="text-red-500 text-sm mt-1">{t('profile.papers.form.error.paper_title.required')}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.papers.form.journal_name')}</label>
                  <input 
                    name="journal_name"
                    type="text" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper?.journal_name || ""}
                    placeholder={t('profile.papers.form.journal_name.placeholder')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.papers.form.journal_category')}</label>
                  <select 
                    name="journal_category"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper?.journal_category || ""}
                  >
                    <option value="">{t('profile.papers.form.journal_category.placeholder')}</option>
                    <option value="SCI">{t('profile.papers.form.journal_category.sci')}</option>
                    <option value="EI">{t('profile.papers.form.journal_category.ei')}</option>
                    <option value="CSCD">{t('profile.papers.form.journal_category.cscd')}</option>
                    <option value="核心期刊">{t('profile.papers.form.journal_category.core')}</option>
                    <option value="普通期刊">{t('profile.papers.form.journal_category.normal')}</option>
                    <option value="会议论文">{t('profile.papers.form.journal_category.conference')}</option>
                    <option value="其他">{t('profile.papers.form.journal_category.other')}</option>
                  </select>
                </div>
                
                
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.common.class')}</label>
                  <select 
                    name="class"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper?.class ? `${editingPaper.class}班` : ""}
                  >
                    <option value="">{t('profile.common.class.placeholder')}</option>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={`${num}班`}>{t('profile.common.class.option', { num })}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.papers.form.author_type')}</label>
                  <select 
                    name="author_type"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={(() => {
                      const predefinedTypes = ["第一作者", "通讯作者", "独立第一作者", "独立作者"];
                      const authorType = editingPaper?.author_type || "";
                      return predefinedTypes.includes(authorType) ? authorType : (authorType ? "其他" : "");
                    })()}
                    onChange={(e) => {
                      setPaperAuthorTypeCustom(e.target.value === "其他");
                    }}
                  >
                    <option value="">{t('profile.papers.form.author_type.placeholder')}</option>
                    <option value="第一作者">{t('profile.papers.form.author_type.first')}</option>
                    <option value="通讯作者">{t('profile.papers.form.author_type.corresponding')}</option>
                    <option value="独立第一作者">{t('profile.papers.form.author_type.independent.first')}</option>
                    <option value="独立作者">{t('profile.papers.form.author_type.independent')}</option>
                    <option value="其他">{t('profile.papers.form.author_type.other')}</option>
                  </select>
                  {paperAuthorTypeCustom && (
                    <div className="mt-2">
                      <input 
                        name="author_type_custom"
                        type="text" 
                        placeholder={t('profile.papers.form.author_type.custom.placeholder')}
                        defaultValue={(() => {
                          const predefinedTypes = ["第一作者", "通讯作者", "独立第一作者", "独立作者"];
                          const authorType = editingPaper?.author_type || "";
                          return predefinedTypes.includes(authorType) ? "" : authorType;
                        })()}
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.papers.form.publish_date')}</label>
                  <input 
                    name="publish_date"
                    type="month" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper?.publish_date || ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.common.note')}</label>
                  <textarea 
                    name="note"
                    rows={3}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper?.note || ""}
                    placeholder={t('profile.common.note.placeholder')}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelPaper}>{t('profile.common.cancel')}</Button>
                  <Button type="submit" disabled={saveStatus === 'saving'}>{t('profile.common.save')}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 专利表单 */}
      {showPatentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingPatent ? t('profile.patents.form.edit') : t('profile.patents.form.title')}</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelPatent} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form key={editingPatent?.id || 'new'} ref={patentFormRef} onSubmit={handlePatentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.patents.form.patent_name')}</label>
                  <input 
                    name="patent_name"
                    type="text" 
                    required
                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${patentErrors.patent_name ? 'border-red-500' : ''}`}
                    defaultValue={editingPatent?.patent_name || ""}
                    placeholder={t('profile.patents.form.patent_name.placeholder')}
                  />
                  {patentErrors.patent_name && (
                    <p className="text-red-500 text-sm mt-1">{t('profile.patents.form.error.patent_name.required')}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.patents.form.patent_number')}</label>
                  <input 
                    name="patent_number"
                    type="text" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent?.patent_number || ""}
                    placeholder={t('profile.patents.form.patent_number.placeholder')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.patents.form.patent_date')}</label>
                  <input 
                    name="patent_date"
                    type="month" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent?.patent_date || ""}
                  />
                </div>
                
                
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.common.class')}</label>
                  <select 
                    name="class"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent?.class ? `${editingPatent.class}班` : ""}
                  >
                    <option value="">{t('profile.common.class.placeholder')}</option>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={`${num}班`}>{t('profile.common.class.option', { num })}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.patents.form.owner_category')}</label>
                  <select 
                    name="category_of_patent_owner"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={(() => {
                      const predefinedCategories = ["独立发明人", "第一发明人（多人）"];
                      const category = editingPatent?.category_of_patent_owner || "";
                      return predefinedCategories.includes(category) ? category : (category ? "其他" : "");
                    })()}
                    onChange={(e) => {
                      setPatentOwnerCategoryCustom(e.target.value === "其他");
                    }}
                  >
                    <option value="">{t('profile.patents.form.owner_category.placeholder')}</option>
                    <option value="独立发明人">{t('profile.patents.form.owner_category.independent')}</option>
                    <option value="第一发明人（多人）">{t('profile.patents.form.owner_category.first.multi')}</option>
                    <option value="其他">{t('profile.patents.form.owner_category.other')}</option>
                  </select>
                  {patentOwnerCategoryCustom && (
                    <div className="mt-2">
                      <input 
                        name="category_of_patent_owner_custom"
                        type="text" 
                        placeholder={t('profile.patents.form.owner_category.custom.placeholder')}
                        defaultValue={(() => {
                          const predefinedCategories = ["独立发明人", "第一发明人（多人）"];
                          const category = editingPatent?.category_of_patent_owner || "";
                          return predefinedCategories.includes(category) ? "" : category;
                        })()}
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.common.note')}</label>
                  <textarea 
                    name="note"
                    rows={3}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent?.note || ""}
                    placeholder={t('profile.common.note.placeholder')}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelPatent}>{t('profile.common.cancel')}</Button>
                  <Button type="submit" disabled={saveStatus === 'saving'}>{t('profile.common.save')}</Button>
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
                 deleteItemType === "other" ? t('profile.common.confirm.delete.other') :
                 deleteItemType === "paper" ? t('profile.common.confirm.delete.paper') :
                 deleteItemType === "patent" ? t('profile.common.confirm.delete.patent') :
                 deleteItemType === "competition" ? t('profile.common.confirm.delete.competition') :
                 deleteItemType === "score" && deleteScoreType === "toefl" ? t('profile.common.confirm.delete.toefl') :
                 deleteItemType === "score" && deleteScoreType === "ielts" ? t('profile.common.confirm.delete.ielts') :
                 deleteItemType === "score" && deleteScoreType === "gre" ? t('profile.common.confirm.delete.gre') : 
                 "您确定要删除这条记录吗？"}
                {t('profile.common.confirm.delete.note')}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={cancelDelete}>{t('profile.common.cancel')}</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={saveStatus === 'saving'}>{t('profile.common.delete')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="mt-3 text-sm text-gray-500">{t('profile.hint')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center justify-between">
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
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteConfirm("award", index, award.id)}>
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
            <CardTitle className="text-base md:text-lg flex items-center justify-between">
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
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteConfirm("internship", index, internship.id)}>
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
            <CardTitle className="text-base md:text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('profile.papers.title')}
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                  保研相关
                </span>
                {isLocked && (
                  <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                    已锁定
                  </span>
                )}
              </div>
              <Button 
                size="sm" 
                className="flex items-center gap-2" 
                onClick={handleAddPaper}
                disabled={isLocked}
              >
                <Plus className="h-4 w-4" />
                {t('profile.papers.add')}
              </Button>
            </CardTitle>
            <CardDescription>{t('profile.papers.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {papers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('profile.papers.empty')}
                </div>
              ) : (
                <div className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 ${papers.length > 4 ? "max-h-[500px] overflow-y-auto pr-2" : ""}`}>
                  {papers.map((paper, index) => (
                    <div key={index} className="flex flex-col p-4 border rounded-lg group hover:bg-gray-50">
                      <div className="flex items-start gap-4 mb-2">
                        <div className={`w-12 h-12 ${colorPairs[paper.colorIndex].bg} rounded-full flex items-center justify-center`}>
                          <FileText className={`h-6 w-6 ${colorPairs[paper.colorIndex].text}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">{paper.paper_title}</h4>
                          {paper.journal_name && <p className="text-sm text-muted-foreground">{paper.journal_name}</p>}
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            {paper.journal_category && <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">{translateJournalCategory(paper.journal_category)}</span>}
                            {paper.author_type && <span className="bg-green-100 text-green-600 px-2 py-1 rounded">{translateAuthorType(paper.author_type)}</span>}
                          </div>
                          {paper.publish_date && <p className="text-xs text-muted-foreground mt-1">{paper.publish_date}</p>}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          {isLocked ? (
                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">已锁定</span>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleEditPaper(paper)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteConfirm("paper", index, paper.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {paper.note && <p className="text-sm mt-2 pl-16 text-muted-foreground">{paper.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('profile.patents.title')}
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                  保研相关
                </span>
                {isLocked && (
                  <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                    已锁定
                  </span>
                )}
              </div>
              <Button 
                size="sm" 
                className="flex items-center gap-2" 
                onClick={handleAddPatent}
                disabled={isLocked}
              >
                <Plus className="h-4 w-4" />
                {t('profile.patents.add')}
              </Button>
            </CardTitle>
            <CardDescription>{t('profile.patents.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('profile.patents.empty')}
                </div>
              ) : (
                <div className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 ${patents.length > 4 ? "max-h-[500px] overflow-y-auto pr-2" : ""}`}>
                  {patents.map((patent, index) => (
                    <div key={index} className="flex flex-col p-4 border rounded-lg group hover:bg-gray-50">
                      <div className="flex items-start gap-4 mb-2">
                        <div className={`w-12 h-12 ${colorPairs[patent.colorIndex].bg} rounded-full flex items-center justify-center`}>
                          <Shield className={`h-6 w-6 ${colorPairs[patent.colorIndex].text}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">{patent.patent_name}</h4>
                          {patent.patent_number && <p className="text-sm text-muted-foreground">{t('profile.patents.patent_number.label')}{patent.patent_number}</p>}
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            {patent.category_of_patent_owner && <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded">{patent.category_of_patent_owner}</span>}
                          </div>
                          {patent.patent_date && <p className="text-xs text-muted-foreground mt-1">{patent.patent_date}</p>}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          {isLocked ? (
                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">已锁定</span>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleEditPatent(patent)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteConfirm("patent", index, patent.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {patent.note && <p className="text-sm mt-2 pl-16 text-muted-foreground">{patent.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {t('profile.competitions.title')}
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                  保研相关
                </span>
                {isLocked && (
                  <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                    已锁定
                  </span>
                )}
              </div>
              <Button 
                size="sm" 
                className="flex items-center gap-2" 
                onClick={handleAddCompetition}
                disabled={isLocked}
              >
                <Plus className="h-4 w-4" />
                {t('profile.competitions.add')}
              </Button>
            </CardTitle>
            <CardDescription>{t('profile.competitions.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {competitionRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('profile.competitions.empty')}
                </div>
              ) : (
                <div className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 ${competitionRecords.length > 4 ? "max-h-[500px] overflow-y-auto pr-2" : ""}`}>
                  {competitionRecords.map((record, index) => (
                    <div key={index} className="flex flex-col p-4 border rounded-lg group hover:bg-gray-50">
                      <div className="flex items-start gap-4 mb-2">
                        <div className={`w-12 h-12 ${colorPairs[record.colorIndex].bg} rounded-full flex items-center justify-center`}>
                          <Trophy className={`h-6 w-6 ${colorPairs[record.colorIndex].text}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">{record.competition_name}</h4>
                          <p className="text-sm text-muted-foreground">{record.competition_region} • {record.competition_level}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded">{record.class}</span>
                            {record.score === 0 ? (
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">{t('profile.competitions.score.dependent')}</span>
                            ) : (
                              <span className="bg-green-100 text-green-600 px-2 py-1 rounded">{t('profile.competitions.score.plus', { score: record.score })}</span>
                            )}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          {isLocked ? (
                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">已锁定</span>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleEditCompetition(record)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteConfirm("competition", index, record.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {record.note && <p className="text-sm mt-2 pl-16 text-muted-foreground">{record.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center justify-between">
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t('profile.other.title')}
              </div>
              <Button size="sm" className="flex items-center gap-2" onClick={handleAddOtherInfo}>
                <Plus className="h-4 w-4" />
                {t('profile.other.add')}
              </Button>
            </CardTitle>
            <CardDescription>{t('profile.other.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {otherInfoList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('profile.other.empty')}
                </div>
              ) : (
                <div className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${otherInfoList.length > 6 ? "max-h-[500px] overflow-y-auto pr-2" : ""}`}>
                  {otherInfoList.map((info, index) => (
                    <div key={index} className="p-4 border rounded-lg group hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 ${colorPairs[info.colorIndex].bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <Info className={`h-5 w-5 ${colorPairs[info.colorIndex].text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">{info.category}</div>
                            <p className="text-sm text-gray-700 break-words">{info.content}</p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0 ml-2">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleEditOtherInfo(info)}>
                            <Edit className="h-2 w-2" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleDeleteConfirm("other", index, info.id)}>
                            <Trash2 className="h-2 w-2" />
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
      </div>
      
      

      {/* 竞赛记录表单 */}
      <CompetitionForm
        isOpen={showCompetitionForm}
        onClose={handleCancelCompetition}
        onSubmit={handleCompetitionSubmit}
        editingRecord={editingCompetition}
        studentId={user?.userId || ''}
        studentName={user?.name || ''}
        loading={saveStatus === 'saving'}
      />
    </div>
  )
}