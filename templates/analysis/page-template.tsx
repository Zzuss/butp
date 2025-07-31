"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, Brain, ChevronDown } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getTopPercentageGPAThreshold } from "@/lib/dashboard-data"
import { getStudentAbilityData } from "@/lib/ability-data"
import { RadarChart } from "@/components/ui/radar-chart"
import { useSimpleAuth } from "@/contexts/simple-auth-context"

// 能力标签（支持中英文）
const abilityLabels = {
  zh: ['公共课程', '实践课程', '数学科学', '政治课程', '基础学科', '创新课程', '英语课程', '基础专业', '专业课程'],
  en: ['Public Courses', 'Practice Courses', 'Math & Science', 'Political Courses', 'Basic Subjects', 'Innovation Courses', 'English Courses', 'Basic Major', 'Major Courses']
}

export default function Analysis() {
  const { t } = useLanguage()
  const { currentStudent, studentDataCache, setStudentDataCache } = useSimpleAuth()
  const router = useRouter()
  
  // 下拉菜单状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('top30');
  
  // GPA门槛值状态
  const [gpaThreshold, setGpaThreshold] = useState<number | null>(null);
  const [loadingGPA, setLoadingGPA] = useState(false);
  const [gpaCache, setGpaCache] = useState<Record<string, number>>({});
  
  // 能力数据状态
  const [abilityData, setAbilityData] = useState<number[]>([50, 70, 80, 50, 70, 80, 50, 70, 80]);
  const [loadingAbility, setLoadingAbility] = useState(false);
  
  // 按钮选择状态
  const [selectedButton, setSelectedButton] = useState<'graduation' | 'overseas' | 'domestic' | null>(null);
  
  // 毕业要求状态
  const [graduationRequirements, setGraduationRequirements] = useState({
    credits: { required: 160, earned: 145, completed: false },
    gpa: { required: 2.0, current: 3.2, completed: true },
    thesis: { completed: false },
    certificates: { completed: false },
    military: { required: 2, earned: 1, completed: false },
    political: { required: 16, earned: 12, completed: false },
    innovation: { required: 2, earned: 1, completed: false }
  });
  
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // 概率数据状态
  const [probabilityData, setProbabilityData] = useState<{
    proba_1: number | null;
    proba_2: number | null;
  } | null>(null);
  const [loadingProbability, setLoadingProbability] = useState(false);
  
  // 培养方案状态
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [studentMajor, setStudentMajor] = useState<string | null>(null);
  const [loadingMajor, setLoadingMajor] = useState(false);
  
  // 目标分数状态
  const [targetScores, setTargetScores] = useState<{
    target1_score: number | null;
    target2_score: number | null;
  } | null>(null);
  const [loadingTargetScores, setLoadingTargetScores] = useState(false);
  
  // 课程成绩状态
  const [loadingCourseScores, setLoadingCourseScores] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 原始课程数据（只在初始化时设置一次，永远不变）
  const [originalScores, setOriginalScores] = useState<Array<{
    courseName: string;
    score: number | null;
    semester: number | null;
    category: string | null;
    courseId?: string;
    credit?: number; // 新增学分字段
  }>>([]);
  
  // 修改后的课程数据（初始时复制原始数据，每次确认修改时更新）
  const [modifiedScores, setModifiedScores] = useState<Array<{
    courseName: string;
    score: number | null | string;
    semester: number | null;
    category: string | null;
    courseId?: string;
    credit?: number; // 新增学分字段
  }>>([]);
  
  // 来源二课程数据（academic_results表数据，只在初始化时设置一次，永远不变）
  const [source2Scores, setSource2Scores] = useState<Array<{
    courseName: string;
    score: number | null;
    semester: number | null;
    category: string | null;
    courseId?: string;
    credit?: number;
    courseType?: string;
    courseAttribute?: string;
    examType?: string;
  }>>([]);
  
  // 所有课程数据状态
  const [allCourseData, setAllCourseData] = useState<any>(null);
  const [loadingAllCourseData, setLoadingAllCourseData] = useState(false);
  const [showAllCourseData, setShowAllCourseData] = useState(false);
  
  // 特征值状态
  const [calculatedFeatures, setCalculatedFeatures] = useState<Record<string, number> | null>(null);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  
  // 当前去向的新可能
  const [newPossibility, setNewPossibility] = useState<{
    current: string;
    other: string;
  } | null>(null);
  

  
  // 获取当前应该显示的成绩数据
  const getCurrentScores = () => {
    return modifiedScores;
  };


  
  // 获取GPA门槛值
  const loadGPAThreshold = async (percentage: number) => {
    // 检查缓存
    const cacheKey = `${percentage}`;
    if (gpaCache[cacheKey]) {
      setGpaThreshold(gpaCache[cacheKey]);
      return;
    }

    setLoadingGPA(true);
    try {
      const threshold = await getTopPercentageGPAThreshold(percentage);
      setGpaThreshold(threshold);
      // 保存到缓存（只保存非null值）
      if (threshold !== null) {
        setGpaCache(prev => ({
          ...prev,
          [cacheKey]: threshold
        }));
      }
    } catch (error) {
      setGpaThreshold(null);
    } finally {
      setLoadingGPA(false);
    }
  };

  // 获取能力数据
  const loadAbilityData = async () => {
    if (!currentStudent?.id) return;
    
    setLoadingAbility(true);
    try {
      const data = await getStudentAbilityData(currentStudent.id);
      setAbilityData(data);
    } catch (error) {
      setAbilityData([50, 70, 80, 50, 70, 80, 50, 70, 80]);
    } finally {
      setLoadingAbility(false);
    }
  };

  // 处理下拉菜单选择
  const handleOptionSelect = (optionKey: string) => {
    setSelectedOption(optionKey);
    setIsDropdownOpen(false);
  };

  // 处理毕业要求编辑
  const handleGraduationEdit = (requirementKey: keyof typeof graduationRequirements) => {
    setSubmitting(true);
    setShowNotification(true);
    
    // 仅显示提示，不改变实际状态
    setTimeout(() => {
      setSubmitting(false);
      setIsEditing(false);
    }, 1000); // 1秒后退出编辑模式，但提示继续显示
  };

  // 获取学生专业
  const loadStudentMajor = async () => {
    if (!currentStudent?.id) return;
    
    // 检查全局缓存
    if (studentDataCache[currentStudent.id]?.major !== undefined) {
      setStudentMajor(studentDataCache[currentStudent.id].major);
      return;
    }
    
    setLoadingMajor(true);
    try {
      const response = await fetch('/api/student-major', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: currentStudent.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudentMajor(data.major);
        // 保存到全局缓存
        setStudentDataCache(prev => ({
          ...prev,
          [currentStudent.id]: {
            ...prev[currentStudent.id],
            major: data.major
          }
        }));
      } else {
        setStudentMajor(null);
      }
    } catch (error) {
      setStudentMajor(null);
    } finally {
      setLoadingMajor(false);
    }
  };

  // 获取目标分数
  const loadTargetScores = async () => {
    if (!currentStudent?.id) return;
    
    // 检查全局缓存
    if (studentDataCache[currentStudent.id]?.targetScores) {
      setTargetScores(studentDataCache[currentStudent.id].targetScores);
      return;
    }
    
    setLoadingTargetScores(true);
    try {
      const response = await fetch('/api/target-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: currentStudent.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTargetScores(data);
        // 保存到全局缓存
        setStudentDataCache(prev => ({
          ...prev,
          [currentStudent.id]: {
            ...prev[currentStudent.id],
            targetScores: data
          }
        }));
      } else {
        setTargetScores(null);
      }
    } catch (error) {
      setTargetScores(null);
    } finally {
      setLoadingTargetScores(false);
    }
  };

  // 获取概率数据
  const loadProbabilityData = async () => {
    if (!currentStudent?.id) return;
    
    // 检查全局缓存
    if (studentDataCache[currentStudent.id]?.probabilityData) {
      setProbabilityData(studentDataCache[currentStudent.id].probabilityData);
      return;
    }
    
    setLoadingProbability(true);
    try {
      const response = await fetch('/api/probability-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: currentStudent.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setProbabilityData(data);
        // 保存到全局缓存
        setStudentDataCache(prev => ({
          ...prev,
          [currentStudent.id]: {
            ...prev[currentStudent.id],
            probabilityData: data
          }
        }));
      } else {
        setProbabilityData(null);
      }
    } catch (error) {
      setProbabilityData(null);
    } finally {
      setLoadingProbability(false);
    }
  };

  // 处理编辑模式切换
  const handleEditModeToggle = () => {
    if (!isEditMode) {
      // 进入编辑模式，显示欢迎提示
      setShowEditModal(true);
      // 3秒后自动关闭悬浮窗
      setTimeout(() => {
        setShowEditModal(false);
      }, 3000);
    }
    setIsEditMode(!isEditMode);
  };

  // 处理确认修改
  const handleConfirmModification = async () => {
    // 确保所有成绩都是数字类型，并等待更新完成
    const updatedScores = modifiedScores.map(course => ({
      ...course,
      score: typeof course.score === 'string' ? parseFloat(course.score) : course.score
    }));
    
    // 立即更新状态
    setModifiedScores(updatedScores);
    
    // 计算特征值
    setLoadingFeatures(true);
    try {
      // 使用更新后的数据
      const response = await fetch('/api/all-course-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentHash: currentStudent?.id,
          modifiedScores: updatedScores, // 直接使用更新后的数据
          source2Scores: source2Scores.map(score => ({
            ...score,
            source: 'academic_results'
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // 使用合成后的数据计算特征值
        const featureResponse = await fetch('/api/calculate-features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allCourses: data.data.allCourses
          })
        });

        if (featureResponse.ok) {
          const featureData = await featureResponse.json();
          setCalculatedFeatures(featureData.data.featureValues);
        } else {
          console.error('Failed to calculate features');
        }
      } else {
        console.error('Failed to load all course data');
      }
    } catch (error) {
      console.error('Error calculating features:', error);
    } finally {
      setLoadingFeatures(false);
      setShowConfirmModal(true);
    }
    
    // 清除缓存，确保下次加载时使用新的数据
    if (currentStudent?.id) {
      const cacheKey = currentStudent.id;
      setStudentDataCache(prev => {
        const newCache = { ...prev };
        // 删除所有包含该学生ID的缓存
        Object.keys(newCache).forEach(key => {
          if (key.startsWith(cacheKey)) {
            delete newCache[key];
          }
        });
        return newCache;
      });
    }
  };

  // 处理成绩修改
  const handleScoreChange = (courseName: string, newScore: string) => {
    // 允许用户输入任意内容，包括多位小数
    setModifiedScores(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map(course => 
        course.courseName === courseName 
          ? { ...course, score: newScore }
          : course
      );
    });
  };

  // 处理成绩输入完成（失去焦点或按回车）
  const handleScoreBlur = (courseName: string, newScore: string) => {
    const score = parseFloat(newScore);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      // 输入完成后保留一位小数
      const roundedScore = Math.round(score * 10) / 10;
      setModifiedScores(prev => {
        if (!Array.isArray(prev)) return prev;
        return prev.map(course => 
          course.courseName === courseName 
            ? { ...course, score: roundedScore }
            : course
        );
      });
    } else {
      // 如果输入无效，恢复原始成绩
      const originalCourse = originalScores.find(course => course.courseName === courseName);
      if (originalCourse && originalCourse.score !== null) {
        setModifiedScores(prev => {
          if (!Array.isArray(prev)) return prev;
          return prev.map(course => 
            course.courseName === courseName 
              ? { ...course, score: originalCourse.score }
              : course
          );
        });
      }
    }
  };

  // 加载课程成绩数据
  const loadCourseScores = async () => {
    if (!currentStudent?.id) return;

    // 检查缓存
    const cacheKey = currentStudent.id;
    const cachedData = studentDataCache[cacheKey];
    if (cachedData?.courseScores && cachedData?.source2Scores) {
      // 初始化原始课程数据（只在第一次加载时设置）
      if (originalScores.length === 0) {
        setOriginalScores(cachedData.courseScores);
        
        // 同时初始化修改后的课程数据为原始数据
        setModifiedScores(cachedData.courseScores);
      }
      
      // 初始化来源二课程数据（只在第一次加载时设置）
      if (source2Scores.length === 0) {
        setSource2Scores(cachedData.source2Scores);
      }
      return;
    }

    setLoadingCourseScores(true);
    try {
      // 并行获取来源一和来源二数据
      const [source1Response, source2Response] = await Promise.all([
        fetch('/api/student-course-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentHash: currentStudent.id })
        }),
        fetch('/api/source2-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentHash: currentStudent.id })
        })
      ]);

      if (source1Response.ok && source2Response.ok) {
        const source1Data = await source1Response.json();
        const source2Data = await source2Response.json();
        
        const courseScoresData = source1Data.data.courseScores || [];
        const source2ScoresData = source2Data.data.source2Scores || [];
        
        // 初始化原始课程数据（只在第一次加载时设置）
        if (originalScores.length === 0) {
          setOriginalScores(courseScoresData);
          
          // 同时初始化修改后的课程数据为原始数据
          setModifiedScores(courseScoresData);
        }
        
        // 初始化来源二课程数据（只在第一次加载时设置）
        if (source2Scores.length === 0) {
          setSource2Scores(source2ScoresData);
        }
        
        // 保存到缓存
        setStudentDataCache(prev => ({
          ...prev,
          [cacheKey]: {
            ...prev[cacheKey],
            courseScores: courseScoresData,
            source2Scores: source2ScoresData
          }
        }));
      } else {
        setOriginalScores([]);
        setModifiedScores([]);
        setSource2Scores([]);
      }
    } catch (error) {
      setOriginalScores([]);
      setModifiedScores([]);
      setSource2Scores([]);
    } finally {
      setLoadingCourseScores(false);
    }
  };

  // 加载所有课程数据
  const loadAllCourseData = async () => {
    if (!currentStudent?.id) return;

    // 使用当前的修改数据
    const scoresToUse = modifiedScores;

    // 检查缓存 - 使用修改后的成绩作为缓存键的一部分
    const cacheKey = currentStudent.id;
    const hasModifications = scoresToUse.length > 0;
    const modifiedScoresHash = hasModifications ? 
      btoa(unescape(encodeURIComponent(JSON.stringify(scoresToUse)))).slice(0, 8) : 'original';
    const fullCacheKey = `${cacheKey}_${modifiedScoresHash}`;
    
    const cachedData = studentDataCache[fullCacheKey];
    if (cachedData?.allCourseData) {
      setAllCourseData(cachedData.allCourseData);
      setShowAllCourseData(true);
      return;
    }

    setLoadingAllCourseData(true);
    try {
      // 添加调试信息
      console.log('发送到API的数据:', {
        studentHash: currentStudent.id,
        scoresToUse,
        modifiedScores
      });
      
              // 使用缓存的来源二数据，只发送来源一数据到API
        const response = await fetch('/api/all-course-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            studentHash: currentStudent.id,
            modifiedScores: scoresToUse,
            source2Scores: source2Scores.map(score => ({
              ...score,
              source: 'academic_results' // 添加source字段
            })) // 发送缓存的来源二数据
          })
        });

      if (response.ok) {
        const data = await response.json();
        setAllCourseData(data.data);
        setShowAllCourseData(true);
        
        // 计算特征值
        try {
          const featureResponse = await fetch('/api/calculate-features', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              allCourses: data.data.allCourses
            })
          });

          if (featureResponse.ok) {
            const featureData = await featureResponse.json();
            setCalculatedFeatures(featureData.data.featureValues);
          } else {
            console.error('Failed to calculate features');
          }
        } catch (error) {
          console.error('Error calculating features:', error);
        }
        
        // 保存到缓存
        setStudentDataCache(prev => ({
          ...prev,
          [fullCacheKey]: {
            ...prev[fullCacheKey],
            allCourseData: data.data
          }
        }));
      } else {
        console.error('Failed to load all course data');
      }
    } catch (error) {
      console.error('Error loading all course data:', error);
    } finally {
      setLoadingAllCourseData(false);
    }
  };

  // 初始加载和选项变化时更新GPA门槛值
  useEffect(() => {
    const percentageOptions = [
      { key: 'top10', label: t('analysis.tops.top10'), value: 10 },
      { key: 'top20', label: t('analysis.tops.top20'), value: 20 },
      { key: 'top30', label: t('analysis.tops.top30'), value: 30 }
    ];
    
    const selectedPercentage = percentageOptions.find(opt => opt.key === selectedOption)?.value || 30;
    loadGPAThreshold(selectedPercentage);
  }, [selectedOption, t]);

  // 加载能力数据
  useEffect(() => {
    loadAbilityData();
  }, [currentStudent?.id]);

  // 加载概率数据
  useEffect(() => {
    loadProbabilityData();
  }, [currentStudent?.id]);

  // 加载学生专业
  useEffect(() => {
    loadStudentMajor();
  }, [currentStudent?.id]);

  // 加载目标分数
  useEffect(() => {
    loadTargetScores();
  }, [currentStudent?.id]);

  // 当选择海外读研或国内读研时加载课程成绩
  useEffect(() => {
    if (selectedButton === 'overseas' || selectedButton === 'domestic') {
      loadCourseScores();
    }
  }, [selectedButton, currentStudent?.id]);

  // 页面卸载时清理缓存（可选，如果需要的话）
  useEffect(() => {
    return () => {
      // 页面卸载时的清理逻辑
      // 目前我们选择保留缓存，因为用户可能会重新进入页面
    };
  }, []);

  const percentageOptions = [
    { key: 'top10', label: t('analysis.tops.top10'), value: 10 },
    { key: 'top20', label: t('analysis.tops.top20'), value: 20 },
    { key: 'top30', label: t('analysis.tops.top30'), value: 30 }
  ];

  // 获取当前语言的能力标签
  const currentLanguage = t('language') === 'en' ? 'en' : 'zh';
  const currentAbilityLabels = abilityLabels[currentLanguage];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('analysis.title')}</h1>
        <p className="text-muted-foreground">{t('analysis.description')}</p>
      </div>

      {/* 免责声明 */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 text-center">
          {t('disclaimer.data.accuracy')}
        </p>
      </div>

      {/* 三个交互按钮 */}
      <div className="mb-6 grid grid-cols-3 gap-2 md:gap-4">
        <Button
          variant={selectedButton === 'graduation' ? 'default' : 'outline'}
          className={`h-22 md:h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'graduation' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'hover:scale-95'
          }`}
          onClick={() => setSelectedButton(selectedButton === 'graduation' ? null : 'graduation')}
        >
          <span>毕业</span>
          <span className="text-xs text-red-500 mt-1 px-1 text-center leading-tight break-words whitespace-normal">
            您还有毕业要求未完成
          </span>
        </Button>
        <Button
          variant={selectedButton === 'overseas' ? 'default' : 'outline'}
          className={`h-22 md:h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'overseas' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'hover:scale-95'
          }`}
          onClick={() => setSelectedButton(selectedButton === 'overseas' ? null : 'overseas')}
        >
          <span>海外读研</span>
          <span className="text-xs text-blue-500 mt-1">
            {loadingProbability ? '加载中...' : 
             probabilityData && probabilityData.proba_2 !== null ? 
             `${(probabilityData.proba_2 * 100).toFixed(1)}%` : 
             '暂无数据'}
          </span>
        </Button>
        <Button
          variant={selectedButton === 'domestic' ? 'default' : 'outline'}
          className={`h-22 md:h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
            selectedButton === 'domestic' 
              ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
              : 'hover:scale-95'
          }`}
          onClick={() => setSelectedButton(selectedButton === 'domestic' ? null : 'domestic')}
        >
          <span>国内读研</span>
          <span className="text-xs text-blue-500 mt-1">
            {loadingProbability ? '加载中...' : 
             probabilityData && probabilityData.proba_1 !== null ? 
             `${(probabilityData.proba_1 * 100).toFixed(1)}%` : 
             '暂无数据'}
          </span>
        </Button>
      </div>

      {/* 目标分数显示 */}
      {(selectedButton === 'overseas' || selectedButton === 'domestic') && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              {loadingTargetScores ? (
                <div className="text-center text-blue-600">{t('analysis.target.score.loading')}</div>
              ) : targetScores ? (
                <div className="text-center">
                  <p className="text-blue-800 font-medium">
                    {t('analysis.target.score.minimum')}{' '}
                    <span className="text-blue-600 font-bold">
                      {selectedButton === 'overseas' 
                        ? (targetScores.target2_score !== null ? targetScores.target2_score.toFixed(1) : '暂无数据')
                        : (targetScores.target1_score !== null ? targetScores.target1_score.toFixed(1) : '暂无数据')
                      }
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-center text-blue-600">{t('analysis.target.score.no.data')}</div>
              )}
            </div>
            <div className="ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAllCourseData}
                disabled={loadingAllCourseData}
                className="text-xs"
              >
                {loadingAllCourseData ? '加载中...' : '查看所有课程数据'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 海外读研/国内读研课程成绩表格 */}
      {(selectedButton === 'overseas' || selectedButton === 'domestic') && (
        <div className="mt-6">
        <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium">{t('analysis.course.scores.title')}</CardTitle>
                  <CardDescription>{t('analysis.course.scores.description')}</CardDescription>
                </div>
                <div className="flex-1 flex justify-center items-center gap-4">
                  {isEditMode ? (
                    <Button 
                      variant="default"
                      size="lg"
                      className="px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl scale-110"
                      onClick={handleConfirmModification}
                    >
                      {t('analysis.course.scores.confirm.modify')}
                    </Button>
                  ) : (
                    <Button 
                      variant="default"
                      size="lg"
                      className="px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl scale-105"
                      onClick={handleEditModeToggle}
                    >
                      {t('analysis.course.scores.modify.future')}
                    </Button>
                  )}
                  {newPossibility && (
                    <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium">
                      当前去向的新可能为：{newPossibility.current}，另一去向的新可能为：{newPossibility.other}
                    </div>
                  )}
                </div>
                <div className="w-32 flex justify-end">
                  {isEditMode && (
                    <Button 
                      variant="destructive"
                      size="lg"
                      className="px-6 py-3 text-lg font-semibold transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                      onClick={handleEditModeToggle}
                    >
                      {t('analysis.course.scores.exit.modify')}
                    </Button>
                  )}
                </div>
              </div>
          </CardHeader>
          <CardContent>
              {loadingCourseScores ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">{t('analysis.course.scores.loading')}</div>
                </div>
              ) : originalScores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">{t('analysis.course.scores.table.ranking')}</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">{t('analysis.course.scores.table.semester')}</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">{t('analysis.course.scores.table.course.name')}</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">{t('analysis.course.scores.table.category')}</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">{t('analysis.course.scores.table.credit')}</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">{t('analysis.course.scores.table.score')}</th>
                        {isEditMode && (
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">
                            {t('analysis.course.scores.table.modify.score')}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {getCurrentScores().map((course, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">
                            {index + 1}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                            {course.semester !== null ? t('analysis.course.scores.semester.format', { semester: course.semester }) : '-'}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm">
                            {course.courseName}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                            {course.category || '-'}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm font-mono text-gray-600">
                            {course.credit || '-'}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                            {course.score !== null ? (
                              <span className={`font-bold ${
                                course.score >= 90 ? 'text-green-600' :
                                course.score >= 80 ? 'text-blue-600' :
                                course.score >= 70 ? 'text-yellow-600' :
                                course.score >= 60 ? 'text-orange-600' :
                                'text-red-600'
                              }`}>
                                {course.score}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">{t('analysis.course.scores.no.score')}</span>
                            )}
                          </td>
                          {isEditMode && (
                            <td className="border border-gray-200 px-4 py-2 text-sm">
                              {course.score !== null ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={(() => {
                                    if (!Array.isArray(modifiedScores) || modifiedScores.length === 0) {
                                      return course.score !== null ? course.score : '';
                                    }
                                    const modifiedCourse = modifiedScores.find(c => c.courseName === course.courseName);
                                    if (modifiedCourse) {
                                      return modifiedCourse.score !== null && modifiedCourse.score !== undefined ? modifiedCourse.score : '';
                                    }
                                    return course.score !== null ? course.score : '';
                                  })()}
                                  onChange={(e) => handleScoreChange(course.courseName, e.target.value)}
                                  onBlur={(e) => handleScoreBlur(course.courseName, e.target.value)}
                                  placeholder={t('analysis.course.scores.input.placeholder')}
                                />
                                                              ) : (
                                  <span className="text-gray-400 italic text-xs">{t('analysis.course.scores.no.original.score')}</span>
                                )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">{t('analysis.course.scores.no.data')}</div>
                </div>
              )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* 平均成绩模块 - 仅在非毕业、非海外读研、非国内读研状态显示 */}
      {selectedButton !== 'graduation' && selectedButton !== 'overseas' && selectedButton !== 'domestic' && (
        <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">{t('analysis.tops.title')}</CardTitle>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="h-7 px-3 text-sm"
              >
                {percentageOptions.find(opt => opt.key === selectedOption)?.label}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  {percentageOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => handleOptionSelect(option.key)}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-lg font-medium mb-2">
                GPA：{loadingGPA ? '计算中...' : (gpaThreshold !== null ? gpaThreshold.toFixed(2) : '暂无数据')}
              </div>
              <p className="text-sm text-muted-foreground">
                {percentageOptions.find(opt => opt.key === selectedOption)?.label} 门槛值
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* 能力评估模块 - 仅在非毕业、非海外读研、非国内读研状态显示 */}
      {selectedButton !== 'graduation' && selectedButton !== 'overseas' && selectedButton !== 'domestic' && (
        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
              <CardTitle>{t('analysis.ability.title')}</CardTitle>
              <CardDescription>{t('analysis.ability.description')}</CardDescription>
          </CardHeader>
          <CardContent>
              {loadingAbility ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-muted-foreground">加载中...</div>
                  </div>
                           ) : (
                 <RadarChart 
                   data={abilityData} 
                   labels={currentAbilityLabels}
                   className="mt-4"
                 />
               )}
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-800">
                  {t('analysis.ability.overall', { 
                    score: Math.round(abilityData.reduce((acc, item) => acc + item, 0) / abilityData.length) 
                  })}
                    </div>
                      </div>
            </CardContent>
          </Card>
          
          {/* 培养方案卡片 - 填满右边空缺 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>{t('analysis.curriculum.title')}</CardTitle>
                    </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/curriculum')}
                className="h-8 px-3 text-sm"
              >
                {t('analysis.curriculum.view.full')}
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMajor ? (
                <div className="text-center py-4">
                  <div className="text-muted-foreground">加载中...</div>
                  </div>
              ) : studentMajor ? (
                <div className="text-center py-4">
                  <div className="text-lg font-medium mb-2">{t('analysis.curriculum.major', { major: studentMajor })}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('analysis.curriculum.click.hint')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-muted-foreground">{t('analysis.curriculum.no.major')}</div>
            </div>
              )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* 毕业要求模块 - 仅在毕业状态显示 */}
      {selectedButton === 'graduation' && (
        <div className="mb-6">
        <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>{t('analysis.graduation.title')}</CardTitle>
              <CardDescription>{t('analysis.graduation.description')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={submitting}
              className="h-8 px-3 text-sm"
            >
              {isEditing ? '取消编辑' : '编辑'}
            </Button>
          </CardHeader>
          <CardContent>
              <div className="space-y-6">
                {/* 学分要求 - 仅显示未完成的 */}
                {!graduationRequirements.credits.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.credits')}</h3>
                  <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('credits')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.credits', { 
                        required: graduationRequirements.credits.required, 
                        earned: graduationRequirements.credits.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.credits.earned / graduationRequirements.credits.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* GPA要求 - 仅显示未完成的 */}
                {!graduationRequirements.gpa.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.gpa')}</h3>
                      <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                        {t('analysis.graduation.pending')}
                      </span>
                </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.gpa', { 
                        required: graduationRequirements.gpa.required, 
                        current: graduationRequirements.gpa.current 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.gpa.current / graduationRequirements.gpa.required) * 100)}%` }}
                      ></div>
                </div>
              </div>
                )}

                {/* 毕业论文 - 仅显示未完成的 */}
                {!graduationRequirements.thesis.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.thesis')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('thesis')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
            </div>
      </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.thesis')}
                    </p>
                  </div>
                )}

                {/* 证书要求 - 仅显示未完成的 */}
                {!graduationRequirements.certificates.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.certificates')}</h3>
              <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('certificates')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                </Button>
                        )}
              </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.certificates')}
                    </p>
                  </div>
                )}


              
                {/* 思政课程 - 仅显示未完成的 */}
                {!graduationRequirements.political.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.political')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('political')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                </div>
              </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.political', { 
                        required: graduationRequirements.political.required, 
                        earned: graduationRequirements.political.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.political.earned / graduationRequirements.political.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* 军训学分 - 仅显示未完成的 */}
                {!graduationRequirements.military.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.military')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('military')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.military', { 
                        required: graduationRequirements.military.required, 
                        earned: graduationRequirements.military.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.military.earned / graduationRequirements.military.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* 创新创业学分 - 仅显示未完成的 */}
                {!graduationRequirements.innovation.completed && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t('analysis.graduation.innovation')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          {t('analysis.graduation.pending')}
                        </span>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGraduationEdit('innovation')}
                            disabled={submitting}
                            className="h-7 px-2 text-xs"
                          >
                            标记完成
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.graduation.required.innovation', { 
                        required: graduationRequirements.innovation.required, 
                        earned: graduationRequirements.innovation.earned 
                      })}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (graduationRequirements.innovation.earned / graduationRequirements.innovation.required) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 悬浮提示窗 */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50 md:scale-150 md:origin-bottom-right">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">提交成功</p>
              <p className="text-sm text-gray-600 mt-1">已提交修改，请您耐心等待后台反馈。</p>
            </div>
                      <button 
              onClick={() => setShowNotification(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                      >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
                      </button>
                    </div>
        </div>
      )}

      {/* 编辑模式悬浮提示窗 */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('analysis.edit.modal.title')}
            </h3>
            <p className="text-lg text-gray-600">
              {t('analysis.edit.modal.description')}
            </p>
          </div>
        </div>
      )}

      {/* 确认修改悬浮窗 - 显示九个特征值 */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('analysis.confirm.modal.title')}</h3>
                    <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-500 hover:text-gray-700"
                    >
                ✕
                    </button>
                  </div>
            
                        <div className="grid grid-cols-3 gap-4">
              {loadingFeatures ? (
                <div className="col-span-3 text-center py-8">
                  <div className="text-muted-foreground">{t('analysis.confirm.modal.loading')}</div>
                </div>
              ) : calculatedFeatures ? (
                Object.entries(calculatedFeatures).map(([category, value]) => (
                  <div key={category} className="p-4 border border-gray-200 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-2">{category}</div>
                    <div className="text-2xl font-bold text-blue-600">{value.toFixed(3)}</div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8">
                  <div className="text-muted-foreground">暂无特征值数据</div>
                </div>
              )}
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={async () => {
                  try {
                    // 检查是否有计算出的特征值
                    if (!calculatedFeatures) {
                      console.error('没有可用的特征值');
                      return;
                    }

                    // 准备特征数据（按顺序：公共课程、政治理论、基础学科、专业课程、实践课程、创新创业、人文素养、科学素养、身心健康）
                    const featureOrder = [
                      '公共课程', '政治理论', '基础学科', '专业课程', 
                      '实践课程', '创新创业', '人文素养', '科学素养', '身心健康'
                    ];
                    
                    const features = featureOrder.map(feature => calculatedFeatures[feature] || 0);

                    // 调用预测API
                    const response = await fetch('/api/predict-possibility', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ features }),
                    });

                    if (!response.ok) {
                      throw new Error('预测请求失败');
                    }

                    const result = await response.json();

                    if (result.error) {
                      throw new Error(result.error);
                    }

                    // 根据当前界面类型确定当前去向和另一去向
                    let currentPossibility, otherPossibility;
                    
                    if (selectedButton === 'overseas') {
                      // 海外读研界面
                      currentPossibility = result.probabilities.overseas.toFixed(1) + '%';
                      otherPossibility = result.probabilities.domestic.toFixed(1) + '%';
                    } else if (selectedButton === 'domestic') {
                      // 国内读研界面
                      currentPossibility = result.probabilities.domestic.toFixed(1) + '%';
                      otherPossibility = result.probabilities.overseas.toFixed(1) + '%';
                    } else {
                      throw new Error('未知的界面类型');
                    }

                    // 设置新可能值
                    setNewPossibility({
                      current: currentPossibility,
                      other: otherPossibility
                    });

                    // 关闭确认模态框
                    setShowConfirmModal(false);
                    // 退出编辑模式，回到修改未来按钮界面
                    setIsEditMode(false);

                  } catch (error) {
                    console.error('计算人生新可能失败:', error);
                    alert('计算失败，请重试');
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                计算人生新可能
              </button>
            </div>
                  </div>
                </div>
      )}

      {/* 所有课程数据模态框 */}
      {showAllCourseData && allCourseData && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAllCourseData(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 max-w-6xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">所有课程数据收集结果</h3>
              <button 
                onClick={() => setShowAllCourseData(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
                  </div>
            
            {/* 数据摘要 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">数据摘要</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">总课程数：</span>
                  <span className="text-blue-600">{allCourseData.summary?.totalCourses || 0}</span>
                  </div>
                <div>
                  <span className="font-medium">来源1课程：</span>
                  <span className="text-green-600">{allCourseData.summary?.source1Count || 0}</span>
                </div>
                <div>
                  <span className="font-medium">来源2课程：</span>
                  <span className="text-orange-600">{allCourseData.summary?.source2Count || 0}</span>
                </div>
                <div>
                  <span className="font-medium">唯一课程：</span>
                  <span className="text-purple-600">{allCourseData.summary?.uniqueCourses || 0}</span>
                </div>
              </div>
              {allCourseData.cacheInfo && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="font-medium mb-2">缓存信息</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">数据状态：</span>
                      <span className={allCourseData.cacheInfo.hasModifications ? 'text-yellow-600' : 'text-green-600'}>
                        {allCourseData.cacheInfo.hasModifications ? '已修改' : '原始数据'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">修改课程数：</span>
                      <span className="text-blue-600">{allCourseData.cacheInfo.modifiedCoursesCount}</span>
                    </div>
                    <div>
                      <span className="font-medium">缓存键：</span>
                      <span className="text-gray-600 font-mono text-xs">{allCourseData.cacheInfo.cacheKey}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 来源1数据表格 */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-green-700">来源1：cohort_predictions 表（包含修改后的成绩）</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">课程名称</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">课程编号</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">成绩</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">学期</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">类别</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">学分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCourseData.source1Data?.map((course: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2">{course.courseName}</td>
                        <td className="border border-gray-200 px-3 py-2 font-mono text-xs">{course.courseId || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2 font-mono">
                          <span className={`font-bold ${
                            course.score >= 90 ? 'text-green-600' :
                            course.score >= 80 ? 'text-blue-600' :
                            course.score >= 70 ? 'text-yellow-600' :
                            course.score >= 60 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {course.score}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2">{course.semester || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2">{course.category || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2">{course.credit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
      </div>

            {/* 来源2数据表格 */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-orange-700">来源2：academic_results 表</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">课程名称</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">课程编号</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">成绩</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">学期</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">类别</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">学分</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">课程类型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCourseData.source2Data?.map((course: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2">{course.courseName}</td>
                        <td className="border border-gray-200 px-3 py-2 font-mono text-xs">{course.courseId || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2 font-mono">
                          {course.score !== null ? (
                            <span className={`font-bold ${
                              course.score >= 90 ? 'text-green-600' :
                              course.score >= 80 ? 'text-blue-600' :
                              course.score >= 70 ? 'text-yellow-600' :
                              course.score >= 60 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {course.score}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">暂无成绩</span>
                          )}
                        </td>
                        <td className="border border-gray-200 px-3 py-2">{course.semester || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2">{course.category || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2">{course.credit || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2">{course.courseType || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 合并后的所有课程数据 */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-blue-700">合并后的所有课程数据（来源1优先，包含修改）</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">来源</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">课程名称</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">课程编号</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">成绩</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">学期</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">类别</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">学分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCourseData.allCourses?.map((course: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            course.source === 'cohort_predictions' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {course.source === 'cohort_predictions' ? '来源1' : '来源2'}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2">{course.courseName}</td>
                        <td className="border border-gray-200 px-3 py-2 font-mono text-xs">{course.courseId || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2 font-mono">
                          {course.score !== null ? (
                            <span className={`font-bold ${
                              course.score >= 90 ? 'text-green-600' :
                              course.score >= 80 ? 'text-blue-600' :
                              course.score >= 70 ? 'text-yellow-600' :
                              course.score >= 60 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {course.score}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">暂无成绩</span>
                          )}
                        </td>
                        <td className="border border-gray-200 px-3 py-2">{course.semester || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2">{course.category || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2">{course.credit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 计算出的特征值显示 */}
            {calculatedFeatures && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-3 text-blue-800">基于当前数据计算出的9个特征值</h4>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(calculatedFeatures).map(([category, value]) => (
                    <div key={category} className="p-3 border border-blue-300 rounded-lg bg-white">
                      <div className="text-sm font-medium text-blue-700 mb-1">{category}</div>
                      <div className="text-xl font-bold text-blue-600">{value.toFixed(3)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-blue-600">
                  计算方法：按类别分组，计算加权平均值（成绩×学分/总学分）
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}