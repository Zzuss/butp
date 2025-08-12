"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { useLanguage } from "@/contexts/language-context"
import { getTopPercentageGPAThreshold, getStudentInfo } from "@/lib/dashboard-data"
import { getStudentAbilityData } from "@/lib/ability-data"
import { RadarChart } from "@/components/ui/radar-chart"
import { EnhancedPDFExport } from '@/components/pdf/EnhancedPDFExport'
import { useAuth } from "@/contexts/AuthContext"

// 能力标签（支持中英文）
const abilityLabels = {
  zh: ['公共课程', '实践课程', '数学科学', '政治课程', '基础学科', '创新课程', '英语课程', '基础专业', '专业课程'],
  en: ['Public Courses', 'Practice Courses', 'Math & Science', 'Political Courses', 'Basic Subjects', 'Innovation Courses', 'English Courses', 'Basic Major', 'Major Courses']
}

export default function Analysis() {
  const { t, language } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  

  
  // GPA门槛值状态
  const [gpaThresholds, setGpaThresholds] = useState<{
    top10: number | null;
    top20: number | null;
    top30: number | null;
  }>({
    top10: null,
    top20: null,
    top30: null
  });
  const [loadingGPA, setLoadingGPA] = useState(false);
  
  // 按钮选择状态
  const [selectedButton, setSelectedButton] = useState<'graduation' | 'overseas' | 'domestic' | null>(null);

  // 能力数据状态
  const [abilityData, setAbilityData] = useState<number[]>([50, 70, 80, 50, 70, 80, 50, 70, 80]);
  const [loadingAbility, setLoadingAbility] = useState(false);

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
  
  // 目标分数状态（带缓存）
  const [targetScores, setTargetScores] = useState<{
    target1_score: number | null;
    target2_score: number | null;
  } | null>(null);
  const [loadingTargetScores, setLoadingTargetScores] = useState(false);
  const [targetScoresCache, setTargetScoresCache] = useState<Record<string, any>>({});
  
  // Original缓存状态
  const [originalScoresCache, setOriginalScoresCache] = useState<Record<string, any>>({});
  const [loadingOriginalScores, setLoadingOriginalScores] = useState(false);
  
  // Modified缓存状态
  const [modifiedScoresCache, setModifiedScoresCache] = useState<Record<string, any>>({});
  const [loadingModifiedScores, setLoadingModifiedScores] = useState(false);
  
  // Source2缓存状态
  const [source2ScoresCache, setSource2ScoresCache] = useState<Record<string, any>>({});
  const [loadingSource2Scores, setLoadingSource2Scores] = useState(false);



  // 课程成绩状态
  const [courseScores, setCourseScores] = useState<Array<{
    courseName: string;
    score: number | null;
    semester: number | null;
    category: string | null;
    courseId?: string;
    credit?: number;
  }>>([]);
  const [loadingCourseScores, setLoadingCourseScores] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 原始课程数据（只在初始化时设置一次，永远不变）
  const [originalScores, setOriginalScores] = useState<Array<{
    courseName: string;
    score: number | null;
    semester: number | null;
    category: string | null;
    courseId?: string;
    credit?: number;
  }>>([]);
  
  // 修改后的课程数据（初始时复制原始数据，每次确认修改时更新）
  const [modifiedScores, setModifiedScores] = useState<Array<{
    courseName: string;
    score: number | null | string;
    semester: number | null;
    category: string | null;
    courseId?: string;
    credit?: number;
  }>>([]);
  
  // 提示窗状态
  const [showNotification, setShowNotification] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // 所有课程数据状态
  const [allCourseData, setAllCourseData] = useState<any>(null);
  const [loadingAllCourseData, setLoadingAllCourseData] = useState(false);
  const [showAllCourseData, setShowAllCourseData] = useState(false);
  
  // 特征值状态
  const [calculatedFeatures, setCalculatedFeatures] = useState<Record<string, number> | null>(null);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  
  // 预测结果状态
  const [predictionResult, setPredictionResult] = useState<{
    domesticPercentage: number | null;
    overseasPercentage: number | null;
  } | null>(null);

  // 学生信息状态
  const [studentInfo, setStudentInfo] = useState<{ year: string; major: string } | null>(null)
  


  // 获取GPA门槛值
  const loadGPAThresholds = async () => {
    setLoadingGPA(true);
    try {
      // 并行加载三个百分比的数据
      const promises = [10, 20, 30].map(async (percentage) => {
        const threshold = await getTopPercentageGPAThreshold(percentage);
        return { percentage, gpa: threshold };
      });
      
      const results = await Promise.all(promises);
      const newThresholds: {
        top10: number | null;
        top20: number | null;
        top30: number | null;
      } = {
        top10: null,
        top20: null,
        top30: null
      };
      
      results.forEach(({ percentage, gpa }) => {
        if (percentage === 10) newThresholds.top10 = gpa;
        if (percentage === 20) newThresholds.top20 = gpa;
        if (percentage === 30) newThresholds.top30 = gpa;
      });
      
      setGpaThresholds(newThresholds);
    } catch (error) {
      console.error('Failed to load GPA thresholds:', error);
      setGpaThresholds({
        top10: null,
        top20: null,
        top30: null
      });
    } finally {
      setLoadingGPA(false);
    }
  };

  // 加载能力数据
  const loadAbilityData = async () => {
    if (!user?.userHash) return;
    
    setLoadingAbility(true);
    try {
      const data = await getStudentAbilityData(user.userHash);
      setAbilityData(data);
    } catch (error) {
      console.error('Failed to load ability data:', error);
      // 保持默认值，不重新设置
    } finally {
      setLoadingAbility(false);
    }
  };



  // 处理毕业要求编辑
  const handleGraduationEdit = (requirementKey: keyof typeof graduationRequirements) => {
    setSubmitting(true);
    
    // 模拟编辑操作
    setTimeout(() => {
      setGraduationRequirements(prev => ({
        ...prev,
        [requirementKey]: {
          ...prev[requirementKey],
          completed: true
        }
      }));
      setSubmitting(false);
      setIsEditing(false);
    }, 1000);
  };



  // 获取当前显示的成绩数据（带排序）
  const getCurrentScores = () => {
    let scores = [];
    if (isEditMode && modifiedScores.length > 0) {
      scores = [...modifiedScores];
    } else {
      scores = [...courseScores];
    }

    // 排序逻辑：
    // 1. 有成绩的课程排在前面（score !== null）
    // 2. 在第一条基础上，学期越小的课程越靠上
    return scores.sort((a, b) => {
      // 首先按是否有成绩排序
      const aHasScore = a.score !== null;
      const bHasScore = b.score !== null;
      
      if (aHasScore && !bHasScore) return -1; // a有成绩，b没有成绩，a排在前面
      if (!aHasScore && bHasScore) return 1;  // a没有成绩，b有成绩，b排在前面
      
      // 如果都有成绩或都没有成绩，按学期排序
      const aSemester = a.semester !== null ? a.semester : Infinity;
      const bSemester = b.semester !== null ? b.semester : Infinity;
      
      if (aSemester !== bSemester) {
        return aSemester - bSemester; // 学期小的排在前面
      }
      
      // 如果学期相同，按课程名称排序
      return (a.courseName || '').localeCompare(b.courseName || '');
    });
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
      
      // 初始化modified缓存（如果还没有的话）
      if (user?.userHash && !modifiedScoresCache[user.userHash]) {
        const originalScores = getOriginalScores();
        if (originalScores.length > 0) {
          setModifiedScoresCache(prev => ({
            ...prev,
            [user.userHash]: JSON.parse(JSON.stringify(originalScores)) // 深拷贝原始数据
          }));
        }
      }
      
      // 清除之前的预测结果
      setPredictionResult(null);
    }
    setIsEditMode(!isEditMode);
  };

  // 处理按钮选择切换
  const handleButtonSelect = (buttonType: 'graduation' | 'overseas' | 'domestic' | null) => {
    // 如果切换按钮，重置编辑模式
    if (selectedButton !== buttonType) {
      setIsEditMode(false);
      setPredictionResult(null);
    }
    setSelectedButton(selectedButton === buttonType ? null : buttonType);
  };

  // 处理成绩修改
  const handleScoreChange = (courseName: string, newScore: string) => {
    // 允许用户输入任意内容，包括多位小数
    if (!user?.userHash) return;
    
    // 更新modified缓存
    setModifiedScoresCache(prev => {
      const currentModifiedScores = prev[user.userHash] || [];
      const updatedScores = currentModifiedScores.map((course: any) => 
        course.courseName === courseName 
          ? { ...course, score: newScore }
          : course
      );
      
      return {
        ...prev,
        [user.userHash]: updatedScores
      };
    });
  };

  // 处理成绩输入完成（失去焦点或按回车）
  const handleScoreBlur = (courseName: string, newScore: string) => {
    if (!user?.userHash) return;
    
    const score = parseFloat(newScore);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      // 输入完成后保留一位小数
      const roundedScore = Math.round(score * 10) / 10;
      
      setModifiedScoresCache(prev => {
        const currentModifiedScores = prev[user.userHash] || [];
        const updatedScores = currentModifiedScores.map((course: any) => 
          course.courseName === courseName 
            ? { ...course, score: roundedScore }
            : course
        );
        
        return {
          ...prev,
          [user.userHash]: updatedScores
        };
      });
    } else {
      // 如果输入无效，恢复原始成绩
      const originalScores = getOriginalScores();
      const originalCourse = originalScores.find((course: any) => course.courseName === courseName);
      if (originalCourse && originalCourse.score !== null) {
        setModifiedScoresCache(prev => {
          const currentModifiedScores = prev[user.userHash] || [];
          const updatedScores = currentModifiedScores.map((course: any) => 
            course.courseName === courseName 
              ? { ...course, score: originalCourse.score }
              : course
          );
          
          return {
            ...prev,
            [user.userHash]: updatedScores
          };
        });
      }
    }
  };

  // 处理确认修改
  const handleConfirmModification = async () => {
    if (!user?.userHash) return;
    

    
    // 获取当前的修改数据
    const currentModifiedScores = getModifiedScores();
    
    // 确保所有成绩都是数字类型
    const updatedScores = currentModifiedScores.map((course: any) => ({
      ...course,
      score: typeof course.score === 'string' ? parseFloat(course.score) : course.score
    }));
    
    // 1. 同步到modified表 - 更新modified缓存
    setModifiedScoresCache(prev => ({
      ...prev,
      [user.userHash]: updatedScores
    }));
    
    // 2. 同步到总表 - 调用all-course-data API生成新的总表
    setLoadingFeatures(true);
    try {
      // 获取来源2数据
      const source2Scores = await loadSource2Scores();
      
      // 调用all-course-data API，传入修改后的成绩
      const response = await fetch('/api/all-course-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentHash: user.userHash,
          modifiedScores: updatedScores, // 使用修改后的成绩
          source2Scores: source2Scores.map((score: any) => ({
            ...score,
            source: 'academic_results'
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // 3. 重新计算特征值 - 使用新的总表数据
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
          
          // 4. 调用预测API - 使用计算出的特征值进行预测
          // 将中文特征名称映射为英文
          const featureMapping: Record<string, string> = {
            '公共课程': 'public',
            '实践课程': 'practice',
            '数学科学': 'math_science',
            '政治课程': 'political',
            '基础学科': 'basic_subject',
            '创新课程': 'innovation',
            '英语课程': 'english',
            '基础专业': 'basic_major',
            '专业课程': 'major'
          };
          
          const englishFeatureValues: Record<string, number> = {};
          Object.entries(featureData.data.featureValues).forEach(([chineseName, value]) => {
            const englishName = featureMapping[chineseName];
            if (englishName && typeof value === 'number') {
              englishFeatureValues[englishName] = value;
            }
          });
          
          const predictionResponse = await fetch('/api/predict-possibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              featureValues: englishFeatureValues
            })
          });

          if (predictionResponse.ok) {
            const predictionData = await predictionResponse.json();
            if (predictionData.success && predictionData.data) {
              // 解析预测结果：第一个是国内读研，第二个是海外读研，第三个忽略
              const probabilities = predictionData.data.probabilities;
              console.log('预测概率:', probabilities);
              console.log('预测类别:', predictionData.data.predictedClass);
              setPredictionResult({
                domesticPercentage: Math.round(probabilities[0] * 100), // 国内读研百分比
                overseasPercentage: Math.round(probabilities[1] * 100)  // 海外读研百分比
              });
            }
          } else {
            console.error('Failed to predict possibility');
            setPredictionResult(null);
          }
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
    }
    
    // 退出编辑模式
    setIsEditMode(false);
  };

  // 加载目标分数（带缓存）
  const loadTargetScores = async () => {
    if (!user?.userHash) return;

    // 检查缓存
    if (targetScoresCache[user.userHash]) {
      setTargetScores(targetScoresCache[user.userHash]);
      return;
    }

    setLoadingTargetScores(true);
    try {
      const response = await fetch('/api/target-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentHash: user.userHash }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTargetScores(result.data);
          // 缓存数据
          setTargetScoresCache(prev => ({
            ...prev,
            [user.userHash]: result.data
          }));
        } else {
          setTargetScores(null);
        }
      } else {
        setTargetScores(null);
      }
    } catch (error) {
      console.error('Failed to load target scores:', error);
      setTargetScores(null);
    } finally {
      setLoadingTargetScores(false);
    }
  };

  // 加载Original缓存（从student-course-scores API，对标模板）
  const loadOriginalScores = async () => {
    if (!user?.userHash) return;

    // 检查缓存
    if (originalScoresCache[user.userHash]) {
      console.log('Using cached original scores');
      return originalScoresCache[user.userHash];
    }

    setLoadingOriginalScores(true);
    try {
      const response = await fetch('/api/student-course-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentHash: user.userHash }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const originalScores = result.data.courseScores || [];
          
          // 先缓存original数据
          setOriginalScoresCache(prev => ({
            ...prev,
            [user.userHash]: originalScores
          }));
          
          // 等待缓存更新完成
          await new Promise(resolve => setTimeout(resolve, 0));
          
          // 初始化modified缓存（复制original数据）
          setModifiedScoresCache(prev => ({
            ...prev,
            [user.userHash]: JSON.parse(JSON.stringify(originalScores)) // 深拷贝
          }));
          
          console.log('Original scores loaded and cached:', originalScores.length, 'courses');
          console.log('Modified cache initialized with original data');
          return originalScores;
        } else {
          console.log('No original scores found');
          return [];
        }
      } else {
        console.error('Failed to load original scores');
        return [];
      }
    } catch (error) {
      console.error('Error loading original scores:', error);
      return [];
    } finally {
      setLoadingOriginalScores(false);
    }
  };

  // 加载Source2缓存
  const loadSource2Scores = async () => {
    if (!user?.userHash) return [];

    // 检查缓存
    if (source2ScoresCache[user.userHash]) {
      console.log('Using cached source2 scores');
      return source2ScoresCache[user.userHash];
    }

    setLoadingSource2Scores(true);
    try {
      console.log('Loading source2 scores from API...');
      
      const response = await fetch('/api/source2-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentHash: user.userHash })
      });

      if (response.ok) {
        const data = await response.json();
        const scores = data.data.source2Scores;
        
        // 更新缓存
        setSource2ScoresCache(prev => ({
          ...prev,
          [user.userHash]: scores
        }));
        
        console.log('Source2 scores loaded:', scores.length, 'courses');
        return scores;
      } else {
        console.error('Failed to load source2 scores');
        return [];
      }
    } catch (error) {
      console.error('Error loading source2 scores:', error);
      return [];
    } finally {
      setLoadingSource2Scores(false);
    }
  };

  // 获取Modified缓存数据
  const getModifiedScores = () => {
    if (!user?.userHash) return [];
    
    // 检查modified缓存
    if (modifiedScoresCache[user.userHash]) {
      console.log('Using cached modified scores');
      return modifiedScoresCache[user.userHash];
    }
    
    // 如果没有modified缓存，返回original缓存（作为初始值）
    if (originalScoresCache[user.userHash]) {
      console.log('No modified cache, using original scores as initial value');
      return originalScoresCache[user.userHash];
    }
    
    console.log('No cache available');
    return [];
  };

  // 获取Original缓存数据
  const getOriginalScores = () => {
    if (!user?.userHash) return [];
    
    // 检查original缓存
    if (originalScoresCache[user.userHash]) {
      console.log('Using cached original scores');
      return originalScoresCache[user.userHash];
    }
    
    console.log('No original cache available');
    return [];
  };

  // 获取Source2成绩数据
  const getSource2Scores = () => {
    if (!user?.userHash) return [];
    
    // 检查source2缓存
    if (source2ScoresCache[user.userHash]) {
      console.log('Using cached source2 scores');
      return source2ScoresCache[user.userHash];
    }
    
    console.log('No source2 cache available');
    return [];
  };

  // 更新Modified缓存数据
  const updateModifiedScores = (newScores: any[]) => {
    if (!user?.userHash) return;
    
    setModifiedScoresCache(prev => ({
      ...prev,
      [user.userHash]: JSON.parse(JSON.stringify(newScores)) // 深拷贝
    }));
    console.log('Modified cache updated with', newScores.length, 'courses');
  };

  // 加载所有课程数据
  const loadAllCourseData = async () => {
    if (!user?.userHash) return;

    // 获取modified缓存数据
    const modifiedScoresData = getModifiedScores();
    
    // 确保original缓存已加载
    const originalScoresData = await loadOriginalScores();
    
    // 加载来源2数据
    const source2ScoresData = await loadSource2Scores();

    setLoadingAllCourseData(true);
    try {
      console.log('发送到API的数据:', {
        studentHash: user.userHash,
        modifiedScoresData: modifiedScoresData.length,
        originalScoresData: originalScoresData.length,
        source2ScoresData: source2ScoresData.length
      });
      
      // 调用API获取所有课程数据
      const response = await fetch('/api/all-course-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentHash: user.userHash,
          modifiedScores: modifiedScoresData,
          source2Scores: source2ScoresData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAllCourseData(data.data);
        setShowAllCourseData(true);
        
        // 计算特征值
        setLoadingFeatures(true);
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
        } finally {
          setLoadingFeatures(false);
        }
      } else {
        console.error('Failed to load all course data');
      }
    } catch (error) {
      console.error('Error loading all course data:', error);
    } finally {
      setLoadingAllCourseData(false);
    }
  };



  // 初始加载时更新GPA门槛值
  useEffect(() => {
    if (authLoading) return;
    
    loadGPAThresholds();
  }, [authLoading]);

  // 加载能力数据
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.userHash) {
      loadAbilityData();
    }
  }, [user?.userHash, authLoading]);

  // 加载目标分数
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.userHash) {
      loadTargetScores();
    }
  }, [user?.userHash, authLoading]);

  // 加载Original缓存
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.userHash) {
      loadOriginalScores();
    }
  }, [user?.userHash, authLoading]);

  // 加载Source2缓存
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.userHash) {
      loadSource2Scores();
    }
  }, [user?.userHash, authLoading]);

  // 加载学生信息
  useEffect(() => {
    if (authLoading) return;
    
    if (!user?.isLoggedIn || !user?.userHash) {
      setStudentInfo(null);
      return;
    }
    
    async function loadStudentInfo() {
      try {
        const info = await getStudentInfo(user!.userHash);
        setStudentInfo(info);
      } catch (error) {
        console.error('Error loading student info:', error);
        setStudentInfo(null);
      }
    }
    
    loadStudentInfo();
  }, [user, authLoading]);





  // 获取当前语言的能力标签
  const currentAbilityLabels = abilityLabels[language as keyof typeof abilityLabels] || abilityLabels.zh;

  // 如果未登录，显示登录提示
  if (!authLoading && !user?.isLoggedIn) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('analysis.title')}</h1>
          <p className="text-muted-foreground">{t('analysis.login.required')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('analysis.title')}</h1>
          <p className="text-muted-foreground">
            {studentInfo 
              ? `${studentInfo.year}${studentInfo.major}-${user?.userId || ''}`
              : t('analysis.description')
            }
          </p>
        </div>
        <EnhancedPDFExport 
          pageTitle="学习分析报告"
          fileName={`learning_analysis_${new Date().toISOString().split('T')[0]}.pdf`}
          contentSelector=".analysis-content"
        />
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
          onClick={() => handleButtonSelect('graduation')}
        >
          <span>毕业</span>
          <span className="text-xs text-red-500 mt-1 px-1 text-center leading-tight break-words whitespace-normal">
            您还有毕业要求未完成
          </span>
        </Button>
                 <Button
           variant={selectedButton === 'overseas' ? 'default' : 'outline'}
           className={`h-22 md:h-16 text-base font-medium transition-transform duration-200 p-0 overflow-hidden ${
             selectedButton === 'overseas' 
               ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
               : 'hover:scale-95'
           }`}
           onClick={() => handleButtonSelect('overseas')}
         >
           <div className="grid grid-rows-2 md:grid-cols-2 w-4/5 h-4/5 mx-auto my-auto">
             <div className="flex items-end md:items-center justify-center border-b md:border-b-0 md:border-r border-gray-300 pb-2 md:pb-0">
               <span>海外读研</span>
             </div>
             <div className="flex items-end md:items-center justify-center pb-2 md:pb-0">
               <span className="text-base text-blue-500 font-medium">
                 {loadingTargetScores ? '加载中...' : 
                  targetScores && targetScores.target2_score !== null ? 
                  `${targetScores.target2_score}%` : 
                  '暂无数据'}
               </span>
             </div>
           </div>
         </Button>
                 <Button
           variant={selectedButton === 'domestic' ? 'default' : 'outline'}
           className={`h-22 md:h-16 text-base font-medium transition-transform duration-200 p-0 overflow-hidden ${
             selectedButton === 'domestic' 
               ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
               : 'hover:scale-95'
           }`}
           onClick={() => handleButtonSelect('domestic')}
         >
           <div className="grid grid-rows-2 md:grid-cols-2 w-4/5 h-4/5 mx-auto my-auto">
             <div className="flex items-end md:items-center justify-center border-b md:border-b-0 md:border-r border-gray-300 pb-2 md:pb-0">
               <span>国内读研</span>
             </div>
             <div className="flex items-end md:items-center justify-center pb-2 md:pb-0">
               <span className="text-base text-blue-500 font-medium">
                 {loadingTargetScores ? '加载中...' : 
                  targetScores && targetScores.target1_score !== null ? 
                  `${targetScores.target1_score}%` : 
                  '暂无数据'}
               </span>
             </div>
           </div>
         </Button>
      </div>

      <div className="analysis-content">
        {/* 初始界面内容 - 仅在未选择按钮时显示 */}
        {!selectedButton && (
          <>
            {/* GPA门槛值分析 - 独立卡片，填满整个宽度 */}
            <div className="mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{t('analysis.tops.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* 前10% GPA */}
                <div className="text-center py-4 border-r border-gray-200 last:border-r-0">
                  <div className="text-lg font-medium mb-2">
                    {loadingGPA ? '计算中...' : (gpaThresholds.top10 !== null ? gpaThresholds.top10.toFixed(2) : '暂无数据')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('analysis.tops.top10')} GPA
                  </p>
                </div>
                
                {/* 前20% GPA */}
                <div className="text-center py-4 border-r border-gray-200 last:border-r-0">
                  <div className="text-lg font-medium mb-2">
                    {loadingGPA ? '计算中...' : (gpaThresholds.top20 !== null ? gpaThresholds.top20.toFixed(2) : '暂无数据')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('analysis.tops.top20')} GPA
                  </p>
                </div>
                
                {/* 前30% GPA */}
                <div className="text-center py-4 border-r border-gray-200 last:border-r-0">
                  <div className="text-lg font-medium mb-2">
                    {loadingGPA ? '计算中...' : (gpaThresholds.top30 !== null ? gpaThresholds.top30.toFixed(2) : '暂无数据')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('analysis.tops.top30')} GPA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

            {/* 能力评估雷达图 - 在2列网格中显示 */}
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
                    <CardTitle>培养方案</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm"
                  >
                    查看完整方案
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="text-lg font-medium mb-2">专业培养方案</div>
                    <p className="text-sm text-muted-foreground">
                      点击查看完整的专业培养方案
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* 毕业要求检查界面 - 当选择毕业按钮时显示 */}
        {selectedButton === 'graduation' && (
          <div className="mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>毕业要求检查</CardTitle>
                  <CardDescription>检查您的毕业要求完成情况</CardDescription>
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
                        <h3 className="font-medium">学分要求</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.credits.required} 学分，已获得 {graduationRequirements.credits.earned} 学分
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
                        <h3 className="font-medium">GPA要求</h3>
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          待完成
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        需要 GPA {graduationRequirements.gpa.required}，当前 GPA {graduationRequirements.gpa.current}
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
                        <h3 className="font-medium">毕业论文</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要完成毕业论文并通过答辩
                      </p>
                    </div>
                  )}

                  {/* 证书要求 - 仅显示未完成的 */}
                  {!graduationRequirements.certificates.completed && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">证书要求</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要获得相关专业证书
                      </p>
                    </div>
                  )}

                  {/* 思政课程 - 仅显示未完成的 */}
                  {!graduationRequirements.political.completed && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">思政课程</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.political.required} 学分，已获得 {graduationRequirements.political.earned} 学分
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
                        <h3 className="font-medium">军训学分</h3>
                    <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.military.required} 学分，已获得 {graduationRequirements.military.earned} 学分
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
                        <h3 className="font-medium">创新创业学分</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            待完成
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
                        需要 {graduationRequirements.innovation.required} 学分，已获得 {graduationRequirements.innovation.earned} 学分
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

        {/* 海外读研分析界面 - 仿照模板设计 */}
        {selectedButton === 'overseas' && (
          <div className="space-y-6">
            {/* 目标分数显示 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-center">
                    <p className="text-blue-800 font-medium">
                      最低目标分数：{' '}
                      <span className="text-blue-600 font-bold">
                        {loadingTargetScores ? '加载中...' : 
                         targetScores && targetScores.target2_score !== null ? 
                         `${targetScores.target2_score}%` : 
                         '暂无数据'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={loadAllCourseData}
                    disabled={loadingAllCourseData}
                  >
                    {loadingAllCourseData ? '加载中...' : '查看所有课程数据'}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* 预测结果显示框 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-center">
                    <p className="text-blue-800 font-medium">
                      {predictionResult ? (
                        selectedButton === 'overseas' ? (
                          `当前去向的新可能性为${predictionResult.overseasPercentage}%，另一去向的新可能性为${predictionResult.domesticPercentage}%`
                        ) : selectedButton === 'domestic' ? (
                          `当前去向的新可能性为${predictionResult.domesticPercentage}%，另一去向的新可能性为${predictionResult.overseasPercentage}%`
                        ) : (
                          `当前去向的新可能性为${predictionResult.overseasPercentage}%，另一去向的新可能性为${predictionResult.domesticPercentage}%`
                        )
                      ) : (
                        '还未开始计算新百分比'
                      )}
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="w-20"></div>
                </div>
              </div>
            </div>
                
            {/* 课程成绩表格 */}
          <Card>
            <CardHeader>
                {/* 手机端布局 - 上下排列 */}
                <div className="flex flex-col space-y-4 md:hidden">
                  <div>
                    <CardTitle className="text-lg font-medium">为达到{loadingTargetScores ? '加载中...' : targetScores && targetScores.target2_score !== null ? `${targetScores.target2_score}` : '暂无数据'}% 海外读研的目标，推荐的各科目成绩如下：</CardTitle>
                    <CardDescription>查看和修改您的课程推荐成绩</CardDescription>
                  </div>
                  <div className="flex flex-col space-y-3">
                    {isEditMode ? (
                      <>
                        <Button 
                          variant="default"
                          size="lg"
                          className="w-full px-8 py-3 text-lg font-semibold transition-all duration-200 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                          onClick={handleConfirmModification}
                          disabled={loadingFeatures}
                        >
                          {loadingFeatures ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>计算中...</span>
                            </div>
                          ) : (
                            '确认修改'
                          )}
                        </Button>
                        <Button 
                          variant="destructive"
                          size="lg"
                          className="w-full px-6 py-3 text-lg font-semibold transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                          onClick={handleEditModeToggle}
                        >
                          退出修改
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="default"
                        size="lg"
                        className="w-full px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                        onClick={handleEditModeToggle}
                      >
                        修改未来
                      </Button>
                    )}
                  </div>
                </div>

                {/* PC端布局 - 保持原有的左右排列 */}
                <div className="hidden md:flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-medium">为达到{loadingTargetScores ? '加载中...' : targetScores && targetScores.target2_score !== null ? `${targetScores.target2_score}` : '暂无数据'}% 海外读研的目标，推荐的各科目成绩如下：</CardTitle>
                    <CardDescription>查看和修改您的课程推荐成绩</CardDescription>
                  </div>
                  <div className="flex-1 flex justify-center items-center gap-4">
                    {isEditMode ? (
                      <Button 
                        variant="default"
                        size="lg"
                        className="px-8 py-3 text-lg font-semibold transition-all duration-200 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl scale-110"
                        onClick={handleConfirmModification}
                        disabled={loadingFeatures}
                      >
                        {loadingFeatures ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>计算中...</span>
                          </div>
                        ) : (
                          '确认修改'
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="default"
                        size="lg"
                        className="px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl scale-105"
                        onClick={handleEditModeToggle}
                      >
                        修改未来
                      </Button>
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
                        退出修改
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">排名</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学期</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程名称</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">类别</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学分</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">成绩</th>
                        {isEditMode && (
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">
                            修改成绩可查看趋势变化
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const originalScores = getOriginalScores();
                        // 过滤掉没有成绩的课程
                        const filteredScores = originalScores.filter((course: any) => 
                          course.score !== null && course.score !== undefined
                        );
                        
                        if (filteredScores.length === 0) {
                          return (
                            <tr>
                              <td colSpan={isEditMode ? 7 : 6} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                                {loadingOriginalScores ? '加载中...' : '暂无有成绩的课程数据'}
                              </td>
                            </tr>
                          );
                        }
                        
                        return filteredScores.map((course: any, index: number) => {
                          const score = course.score;
                          let scoreColor = 'text-gray-600';
                          if (score !== null && score !== undefined) {
                            if (score >= 90) scoreColor = 'text-green-600';
                            else if (score >= 80) scoreColor = 'text-blue-600';
                            else if (score >= 70) scoreColor = 'text-yellow-600';
                            else if (score >= 60) scoreColor = 'text-orange-600';
                            else scoreColor = 'text-red-600';
                          }
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">
                                {index + 1}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                                {course.semester ? `第${course.semester}学期` : '未知学期'}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                {course.courseName}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                                {course.category || '未分类'}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-mono text-gray-600">
                                {course.credit || '0.0'}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                                {score !== null && score !== undefined ? (
                                  <span className={`font-bold ${scoreColor}`}>{score}</span>
                                ) : (
                                  <span className="text-gray-400">暂无成绩</span>
                                )}
                              </td>
                              {isEditMode && (
                                <td className="border border-gray-200 px-4 py-2 text-sm min-w-[150px] md:min-w-0">
                                  {score !== null && score !== undefined ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={(() => {
                                        // 从modified缓存中查找当前课程的最新成绩
                                        const modifiedScores = getModifiedScores();
                                        const modifiedCourse = modifiedScores.find((c: any) => c.courseName === course.courseName);
                                        if (modifiedCourse && modifiedCourse.score !== null && modifiedCourse.score !== undefined) {
                                          return modifiedCourse.score;
                                        }
                                        return score; // 如果没有修改，显示原始成绩
                                      })()}
                                      placeholder="输入新成绩"
                                      onChange={(e) => handleScoreChange(course.courseName, e.target.value)}
                                      onBlur={(e) => handleScoreBlur(course.courseName, e.target.value)}
                                    />
                                  ) : (
                                    <span className="text-gray-400 italic text-xs">无原始成绩</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    共{getOriginalScores().filter((course: any) => course.score !== null && course.score !== undefined).length}门课程
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source2 课程成绩表格 - 只读 */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-orange-700">已修成绩</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">排名</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学期</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">类别</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学分</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">成绩</th>
                      {isEditMode && (
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">
                          修改状态
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const source2Scores = getSource2Scores();
                      // 过滤掉没有成绩的课程
                      const filteredSource2Scores = source2Scores.filter((course: any) => 
                        course.score !== null && course.score !== undefined
                      );
                      
                      if (filteredSource2Scores.length === 0) {
                        return (
                          <tr>
                            <td colSpan={isEditMode ? 7 : 6} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                              {loadingSource2Scores ? '加载中...' : '暂无有成绩的课程数据'}
                            </td>
                          </tr>
                        );
                      }
                      
                      return filteredSource2Scores.map((course: any, index: number) => {
                        const score = course.score;
                        let scoreColor = 'text-gray-600';
                        if (score !== null && score !== undefined) {
                          if (score >= 90) scoreColor = 'text-green-600';
                          else if (score >= 80) scoreColor = 'text-blue-600';
                          else if (score >= 70) scoreColor = 'text-yellow-600';
                          else if (score >= 60) scoreColor = 'text-orange-600';
                          else scoreColor = 'text-red-600';
                        }
                        
                        return (
                          <tr key={index} className="hover:bg-orange-50">
                            <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">
                              {index + 1}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-500">
                              {course.semester ? `第${course.semester}学期` : '未知学期'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm">
                              {course.courseName}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                              {course.category || '未分类'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-mono text-gray-600">
                              {course.credit || '0.0'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                              {score !== null && score !== undefined ? (
                                <span className={`font-bold ${scoreColor}`}>{score}</span>
                              ) : (
                                <span className="text-gray-400">暂无成绩</span>
                              )}
                            </td>
                            {isEditMode && (
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                <span className="text-gray-400 italic text-xs bg-gray-100 px-2 py-1 rounded">
                                  无法修改
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                <div className="text-center text-sm text-muted-foreground mt-4">
                  共{getSource2Scores().filter((course: any) => course.score !== null && course.score !== undefined).length}门课程
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* 国内读研分析界面 - 仿照模板设计 */}
        {selectedButton === 'domestic' && (
          <div className="space-y-6">
            {/* 目标分数显示 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-center">
                    <p className="text-blue-800 font-medium">
                      最低目标分数：{' '}
                      <span className="text-blue-600 font-bold">
                        {loadingTargetScores ? '加载中...' : 
                         targetScores && targetScores.target1_score !== null ? 
                         `${targetScores.target1_score}%` : 
                         '暂无数据'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={loadAllCourseData}
                    disabled={loadingAllCourseData}
                  >
                    {loadingAllCourseData ? '加载中...' : '查看所有课程数据'}
                  </Button>
                </div>
              </div>
            </div>

            {/* 预测结果显示框 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-center">
                    <p className="text-blue-800 font-medium">
                      {predictionResult ? (
                        `当前去向的新可能性为${predictionResult.domesticPercentage}%，另一去向的新可能性为${predictionResult.overseasPercentage}%`
                      ) : (
                        '还未开始计算新百分比'
                      )}
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="w-20"></div>
                </div>
              </div>
            </div>

            {/* 课程成绩表格 */}
          <Card>
            <CardHeader>
                {/* 手机端布局 - 上下排列 */}
                <div className="flex flex-col space-y-4 md:hidden">
                  <div>
                    <CardTitle className="text-lg font-medium">为达到{loadingTargetScores ? '加载中...' : targetScores && targetScores.target1_score !== null ? `${targetScores.target1_score}` : '暂无数据'}% 国内读研的目标，推荐的各科目成绩如下：</CardTitle>
                    <CardDescription>查看和修改您的课程推荐成绩</CardDescription>
                  </div>
                  <div className="flex flex-col space-y-3">
                    {isEditMode ? (
                      <>
                        <Button 
                          variant="default"
                          size="lg"
                          className="w-full px-8 py-3 text-lg font-semibold transition-all duration-200 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                          onClick={handleConfirmModification}
                          disabled={loadingFeatures}
                        >
                          {loadingFeatures ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>计算中...</span>
                            </div>
                          ) : (
                            '确认修改'
                          )}
                        </Button>
                        <Button 
                          variant="destructive"
                          size="lg"
                          className="w-full px-6 py-3 text-lg font-semibold transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                          onClick={handleEditModeToggle}
                        >
                          退出修改
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="default"
                        size="lg"
                        className="w-full px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                        onClick={handleEditModeToggle}
                      >
                        修改未来
                      </Button>
                    )}
                  </div>
                </div>

                {/* PC端布局 - 保持原有的左右排列 */}
                <div className="hidden md:flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-medium">为达到{loadingTargetScores ? '加载中...' : targetScores && targetScores.target1_score !== null ? `${targetScores.target1_score}` : '暂无数据'}% 国内读研的目标，推荐的各科目成绩如下：</CardTitle>
                    <CardDescription>查看和修改您的课程推荐成绩</CardDescription>
                  </div>
                  <div className="flex-1 flex justify-center items-center gap-4">
                    {isEditMode ? (
                      <Button 
                        variant="default"
                        size="lg"
                        className="px-8 py-3 text-lg font-semibold transition-all duration-200 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl scale-110"
                        onClick={handleConfirmModification}
                        disabled={loadingFeatures}
                      >
                        {loadingFeatures ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>计算中...</span>
                          </div>
                        ) : (
                          '确认修改'
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="default"
                        size="lg"
                        className="px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl scale-105"
                        onClick={handleEditModeToggle}
                      >
                        修改未来
                      </Button>
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
                        退出修改
                      </Button>
                    )}
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">排名</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学期</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程名称</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">类别</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学分</th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">成绩</th>
                        {isEditMode && (
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">
                            修改成绩可查看趋势变化
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const originalScores = getOriginalScores();
                        // 过滤掉没有成绩的课程
                        const filteredScores = originalScores.filter((course: any) => 
                          course.score !== null && course.score !== undefined
                        );
                        
                        if (filteredScores.length === 0) {
                          return (
                            <tr>
                              <td colSpan={isEditMode ? 7 : 6} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                                {loadingOriginalScores ? '加载中...' : '暂无有成绩的课程数据'}
                              </td>
                            </tr>
                          );
                        }
                        
                        return filteredScores.map((course: any, index: number) => {
                          const score = course.score;
                          let scoreColor = 'text-gray-600';
                          if (score !== null && score !== undefined) {
                            if (score >= 90) scoreColor = 'text-green-600';
                            else if (score >= 80) scoreColor = 'text-blue-600';
                            else if (score >= 70) scoreColor = 'text-yellow-600';
                            else if (score >= 60) scoreColor = 'text-orange-600';
                            else scoreColor = 'text-red-600';
                          }
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">{index + 1}</td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                                {course.semester ? `第${course.semester}学期` : '-'}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm">{course.courseName}</td>
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">{course.category || '-'}</td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-mono text-gray-600">{course.credit || '-'}</td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                                {course.score !== null ? (
                                  <span className={`font-bold ${scoreColor}`}>{course.score}</span>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">{t('analysis.course.scores.no.original.score')}</span>
                                )}
                              </td>
                              {isEditMode && (
                                <td className="border border-gray-200 px-4 py-2 text-sm min-w-[150px] md:min-w-0">
                                  {course.score !== null ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={(() => {
                                        // 从modified缓存中查找当前课程的最新成绩
                                        const modifiedScores = getModifiedScores();
                                        const modifiedCourse = modifiedScores.find((c: any) => c.courseName === course.courseName);
                                        if (modifiedCourse && modifiedCourse.score !== null && modifiedCourse.score !== undefined) {
                                          return modifiedCourse.score;
                                        }
                                        return course.score; // 如果没有修改，显示原始成绩
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
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                                     <div className="text-center text-sm text-muted-foreground mt-4">
                     共{getOriginalScores().filter((course: any) => course.score !== null && course.score !== undefined).length}门课程
                </div>
                 </div>
            </CardContent>
          </Card>

          {/* Source2 课程成绩表格 - 只读 */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-orange-700">已修成绩</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">排名</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学期</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">类别</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学分</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">成绩</th>
                      {isEditMode && (
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">
                          修改状态
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const source2Scores = getSource2Scores();
                      // 过滤掉没有成绩的课程
                      const filteredSource2Scores = source2Scores.filter((course: any) => 
                        course.score !== null && course.score !== undefined
                      );
                      
                      if (filteredSource2Scores.length === 0) {
                        return (
                          <tr>
                            <td colSpan={isEditMode ? 7 : 6} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                              {loadingSource2Scores ? '加载中...' : '暂无有成绩的课程数据'}
                            </td>
                          </tr>
                        );
                      }
                      
                      return filteredSource2Scores.map((course: any, index: number) => {
                        const score = course.score;
                        let scoreColor = 'text-gray-600';
                        if (score !== null && score !== undefined) {
                          if (score >= 90) scoreColor = 'text-green-600';
                          else if (score >= 80) scoreColor = 'text-blue-600';
                          else if (score >= 70) scoreColor = 'text-yellow-600';
                          else if (score >= 60) scoreColor = 'text-orange-600';
                          else scoreColor = 'text-red-600';
                        }
                        
                        return (
                          <tr key={index} className="hover:bg-orange-50">
                            <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">
                              {index + 1}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                              {course.semester ? `第${course.semester}学期` : '未知学期'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm">
                              {course.courseName}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                              {course.category || '未分类'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-mono text-gray-600">
                              {course.credit || '0.0'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                              {score !== null && score !== undefined ? (
                                <span className={`font-bold ${scoreColor}`}>{score}</span>
                              ) : (
                                <span className="text-gray-400">暂无成绩</span>
                              )}
                            </td>
                            {isEditMode && (
                              <td className="border border-gray-200 px-4 py-2 text-sm">
                                <span className="text-gray-400 italic text-xs bg-gray-100 px-2 py-1 rounded">
                                  无法修改
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                <div className="text-center text-sm text-muted-foreground mt-4">
                  共{getSource2Scores().filter((course: any) => course.score !== null && course.score !== undefined).length}门课程
                </div>
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
              欢迎进入编辑模式
            </h3>
            <p className="text-lg text-gray-600">
              您现在可以修改课程成绩，探索不同的人生可能性
            </p>
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
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">基于当前数据计算出的9个特征值</h4>
              {loadingFeatures ? (
                <div className="text-center py-4">
                  <div className="text-blue-600">计算特征值中...</div>
                </div>
              ) : calculatedFeatures ? (
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(calculatedFeatures).map(([category, value]) => (
                    <div key={category} className="p-3 border border-blue-300 rounded-lg bg-white">
                      <div className="text-sm font-medium text-blue-700 mb-1">{category}</div>
                      <div className="text-xl font-bold text-blue-600">{value.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-500">暂无特征值数据</div>
                </div>
              )}
              <div className="mt-3 text-xs text-blue-600">
                计算方法：按类别分组，计算加权平均值（成绩×学分/总学分）
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}