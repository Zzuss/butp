"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { useLanguage } from "@/contexts/language-context"
import { getTopPercentageGPAThreshold, getStudentInfo, calculateDashboardStats, getStudentResults, type CourseResult } from "@/lib/dashboard-data"
import { getStudentAbilityData } from "@/lib/ability-data"
import { RadarChart } from "@/components/ui/radar-chart"
import { Slider } from "@/components/ui/slider"
import GraduationRequirementsTable from "@/components/GraduationRequirementsTable"

import { useAuth } from "@/contexts/AuthContext"
import { listEducationPlans, getEducationPlanUrl } from "@/lib/supabase"

// 能力标签（支持中英文）
const abilityLabels = {
  zh: ['数理逻辑与科学基础', '专业核心技术', '人文与社会素养', '工程实践与创新应用', '职业发展与团队协作'],
  en: ['Math & Science Foundation', 'Professional Core Technology', 'Humanities & Social Literacy', 'Engineering Practice & Innovation', 'Career Development & Teamwork']
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
  const [abilityData, setAbilityData] = useState<number[]>([0, 0, 0, 0, 0]);
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

  // 新的毕业要求数据状态（从API获取）
  const [graduationRequirementsData, setGraduationRequirementsData] = useState<any[]>([]);
  const [otherCategoryData, setOtherCategoryData] = useState<any>(null);
  const [loadingGraduationRequirements, setLoadingGraduationRequirements] = useState(false);
  const [graduationSummary, setGraduationSummary] = useState<any>(null);

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

  // 概率数据状态（来自 cohort_probability 表）
  const [probabilityData, setProbabilityData] = useState<{
    proba_1: number | null;
    proba_2: number | null;
    year?: number | null;
  } | null>(null);
  const [loadingProbability, setLoadingProbability] = useState(false);
  
  // 当前概率值（用于计算提高百分比）
  const [current_proba1, setCurrent_proba1] = useState<number | null>(null);
  const [current_proba2, setCurrent_proba2] = useState<number | null>(null);
  
  // Original缓存状态
  const [originalScoresCache, setOriginalScoresCache] = useState<Record<string, any>>({});
  const [loadingOriginalScores, setLoadingOriginalScores] = useState(false);
  
  // Modified1缓存状态（海外读研界面）
  const [modified1ScoresCache, setModified1ScoresCache] = useState<Record<string, any>>({});
  const [loadingModified1Scores, setLoadingModified1Scores] = useState(false);
  
  // Modified2缓存状态（国内读研界面）
  const [modified2ScoresCache, setModified2ScoresCache] = useState<Record<string, any>>({});
  const [loadingModified2Scores, setLoadingModified2Scores] = useState(false);
  
  // Source2缓存状态
  const [source2ScoresCache, setSource2ScoresCache] = useState<Record<string, any>>({});
  const [loadingSource2Scores, setLoadingSource2Scores] = useState(false);
  
  // 加权均分缓存（AcademicAverage）
  const [academicAverageCache, setAcademicAverageCache] = useState<Record<string, number>>({});



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
  const [academicStrength, setAcademicStrength] = useState<number | null>(null);
  
  // 预测结果状态
  const [predictionResult, setPredictionResult] = useState<{
    domesticPercentage: number | null;
    overseasPercentage: number | null;
  } | null>(null);

  // 预测结果卡片动画状态
  const [animationStep, setAnimationStep] = useState<number>(-1); // -1表示未开始，0-4表示动画步骤

  // 学生信息状态
  const [studentInfo, setStudentInfo] = useState<{ year: string; major: string } | null>(null)
  // 原始分数加载重试计数
  const originalRetryRef = useRef(0)
  // 概率数据加载重试计数
  const probabilityRetryRef = useRef(0)
  


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
    if (!studentInfo?.year) return;
    
    setLoadingAbility(true);
    try {
      const data = await getStudentAbilityData(user.userHash, studentInfo?.year);
      setAbilityData(data);
    } catch (error) {
      console.error('Failed to load ability data:', error);
      // 保持默认值，不重新设置
    } finally {
      setLoadingAbility(false);
    }
  };



  // 加载毕业要求数据
  const loadGraduationRequirements = async () => {
    if (!user?.userHash) return;

    setLoadingGraduationRequirements(true);
    try {
      console.log('Loading graduation requirements for user:', user.userHash);
      
      const response = await fetch('/api/graduation-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentHash: user.userHash,
          studentNumber: typeof (user as any)?.studentNumber === 'string' ? (user as any).studentNumber : (user?.userId || '')
        })
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to fetch graduation requirements: ${response.status}`);
      }

      const result = await response.json();
      console.log('API result:', result);
      
      if (result.success && result.data && result.data.graduation_requirements && result.data.graduation_requirements.length > 0) {
        setGraduationRequirementsData(result.data.graduation_requirements);
        setOtherCategoryData(result.data.other_category || null);
        console.log('Successfully loaded graduation requirements:', result.data.graduation_requirements.length, 'categories');
        
        // 🔧 NEW: Log other category and unmapped courses
        if (result.data.other_category) {
          console.log('📦 Other category loaded:', result.data.other_category.course_count, 'courses,', result.data.other_category.credits_already_obtained, 'credits');
        }
        
        if (result.data.unmapped_courses && result.data.unmapped_courses.length > 0) {
          console.log('⚠️ Unmapped courses requiring review:', result.data.unmapped_courses.length, 'courses');
          console.log('Unmapped courses:', result.data.unmapped_courses.map((c: any) => c.Course_Name));
        }
        
        if (result.data.summary) {
          console.log('📊 Graduation Summary:', result.data.summary);
          setGraduationSummary(result.data.summary);
        }
      } else {
        // 如果没有数据，使用示例数据
        console.log('No graduation requirements data found, using sample data');
        const sampleData = [
          {
            category: '数学与自然科学基础',
            required_total_credits: 24,
            required_compulsory_credits: 24,
            required_elective_credits: 0,
            credits_already_obtained: 22,
            courses_taken: [
              { Course_Name: '高等数学A1', Credit: 5 },
              { Course_Name: '高等数学A2', Credit: 5 },
              { Course_Name: '线性代数', Credit: 3 },
              { Course_Name: '概率论与数理统计', Credit: 3 },
              { Course_Name: '大学物理', Credit: 6 }
            ]
          },
          {
            category: '专业基础',
            required_total_credits: 15,
            required_compulsory_credits: 15,
            required_elective_credits: 0,
            credits_already_obtained: 12,
            courses_taken: [
              { Course_Name: 'C语言程序设计', Credit: 4 },
              { Course_Name: '数据结构', Credit: 4 },
              { Course_Name: '计算机网络', Credit: 4 }
            ]
          },
          {
            category: '思想政治理论',
            required_total_credits: 16,
            required_compulsory_credits: 15,
            required_elective_credits: 1,
            credits_already_obtained: 14,
            courses_taken: [
              { Course_Name: '马克思主义基本原理', Credit: 3 },
              { Course_Name: '毛泽东思想和中国特色社会主义理论体系概论', Credit: 5 },
              { Course_Name: '中国近现代史纲要', Credit: 3 },
              { Course_Name: '思想道德修养与法律基础', Credit: 3 }
            ]
          }
        ];
        setGraduationRequirementsData(sampleData);
      }
    } catch (error) {
      console.error('Error loading graduation requirements:', error);
      // 即使出错也提供示例数据
      const sampleData = [
        {
          category: '示例数据 - 数学与自然科学基础',
          required_total_credits: 24,
          required_compulsory_credits: 24,
          required_elective_credits: 0,
          credits_already_obtained: 22,
          courses_taken: [
            { Course_Name: '高等数学A1', Credit: 5 },
            { Course_Name: '高等数学A2', Credit: 5 }
          ]
        }
      ];
      setGraduationRequirementsData(sampleData);
    } finally {
      setLoadingGraduationRequirements(false);
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
      
      // 初始化两个modified缓存（如果还没有的话）- 根据 selectedButton 初始化对应的缓存
      if (user?.userHash) {
        const originalScores = getOriginalScores();
        if (originalScores.length > 0) {
          if (selectedButton === 'overseas' && !modified1ScoresCache[user.userHash]) {
            // 复制original数据，过滤掉没有成绩的课程
            const scoresWithGrades = originalScores.filter((course: any) => 
              course.score !== null && course.score !== undefined
            );
            const copiedScores = JSON.parse(JSON.stringify(scoresWithGrades));
            // 如果targetScores已加载，将所有成绩设置为target2_score
            //if (targetScores && targetScores.target2_score !== null && targetScores.target2_score !== undefined) {
            //  copiedScores.forEach((course: any) => {
            //  course.score = targetScores.target2_score;
            //  });
            // 如果加权均分已计算，将所有成绩设置为加权均分
            const average = getAcademicAverage();
            if (average !== null) {
              copiedScores.forEach((course: any) => {
                course.score = average;
              });
              //删到这里为止
            }
            setModified1ScoresCache(prev => ({
              ...prev,
              [user.userHash]: copiedScores
            }));
          } else if (selectedButton === 'domestic' && !modified2ScoresCache[user.userHash]) {
            // 复制original数据，过滤掉没有成绩的课程
            const scoresWithGrades = originalScores.filter((course: any) => 
              course.score !== null && course.score !== undefined
            );
            const copiedScores = JSON.parse(JSON.stringify(scoresWithGrades));
            // 如果targetScores已加载，将所有成绩设置为target1_score
            //if (targetScores && targetScores.target1_score !== null && targetScores.target1_score !== undefined) {
            //  copiedScores.forEach((course: any) => {
            //    course.score = targetScores.target1_score;
            //  });
            // 如果加权均分已计算，将所有成绩设置为加权均分
            const average = getAcademicAverage();
            if (average !== null) {
              copiedScores.forEach((course: any) => {
                course.score = average;
                });
                //删到这里为止
            }
            setModified2ScoresCache(prev => ({
              ...prev,
              [user.userHash]: copiedScores
            }));
          }
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
    
    // 根据 selectedButton 更新对应的缓存
    if (selectedButton === 'overseas') {
      setModified1ScoresCache(prev => {
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
    } else if (selectedButton === 'domestic') {
      setModified2ScoresCache(prev => {
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
    }
  };

  // 处理成绩输入完成（失去焦点或按回车）
  const handleScoreBlur = (courseName: string, newScore: string) => {
    if (!user?.userHash) return;
    
    const score = parseFloat(newScore);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      // 输入完成后保留一位小数
      const roundedScore = Math.round(score * 10) / 10;
      
      // 根据 selectedButton 更新对应的缓存
      if (selectedButton === 'overseas') {
        setModified1ScoresCache(prev => {
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
      } else if (selectedButton === 'domestic') {
        setModified2ScoresCache(prev => {
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
      }
    } else {
      // 如果输入无效，恢复原始成绩
      const originalScores = getOriginalScores();
      const originalCourse = originalScores.find((course: any) => course.courseName === courseName);
      if (originalCourse && originalCourse.score !== null) {
        // 根据 selectedButton 更新对应的缓存
        if (selectedButton === 'overseas') {
          setModified1ScoresCache(prev => {
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
        } else if (selectedButton === 'domestic') {
          setModified2ScoresCache(prev => {
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
    }
  };

  // 处理确认修改
  const handleConfirmModification = async () => {
    console.log('🚀 handleConfirmModification 开始执行');
    if (!user?.userHash) {
      console.error('❌ 用户未登录，无法执行修改');
      return;
    }
    

    
    // 获取当前的修改数据
    const currentModifiedScores = getModifiedScores();
    console.log('📝 当前修改的成绩数据:', currentModifiedScores.length, '门课程');
    
    // 确保所有成绩都是数字类型
    const updatedScores = currentModifiedScores.map((course: any) => ({
      ...course,
      score: typeof course.score === 'string' ? parseFloat(course.score) : course.score
    }));
    
    // 1. 同步到modified表 - 根据 selectedButton 更新对应的缓存
    if (selectedButton === 'overseas') {
      setModified1ScoresCache(prev => ({
        ...prev,
        [user.userHash]: updatedScores
      }));
    } else if (selectedButton === 'domestic') {
      setModified2ScoresCache(prev => ({
        ...prev,
        [user.userHash]: updatedScores
      }));
    }
    
    // 2. 同步到总表 - 调用all-course-data API生成新的总表
    console.log('⏳ 设置 loadingFeatures 为 true');
    setLoadingFeatures(true);
    try {
      // 获取来源2数据
      console.log('📥 开始加载来源2数据...');
      const source2Scores = await loadSource2Scores();
      console.log('✅ 来源2数据加载完成，共', source2Scores.length, '门课程');
      
      // 调用all-course-data API，传入修改后的成绩
      console.log('🔄 开始调用 all-course-data API...');
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

      console.log('📡 all-course-data API响应状态:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ all-course-data API调用成功:', data);
        console.log('📊 all-course-data 返回的数据结构:', {
          hasData: !!data.data,
          hasAllCourses: !!data.data?.allCourses,
          allCoursesLength: data.data?.allCourses?.length || 0
        });
        
        // 3. 重新计算特征值 - 使用新的总表数据
        console.log('🔄 开始调用 calculate-features API...');
        
        // 从学号前4位提取年份（数字格式，如 2023）
        const studentNumber = typeof (user as any)?.studentNumber === 'string' 
          ? (user as any).studentNumber 
          : (user?.userId || '').toString();
        const trimmedStudentNumber = studentNumber.toString().trim();
        const extractedYear = parseInt(trimmedStudentNumber.substring(0, 4));
        const year = !isNaN(extractedYear) && extractedYear >= 2018 && extractedYear <= 2050 
          ? extractedYear 
          : null;
        
        console.log('📅 提取的年份:', { studentNumber: trimmedStudentNumber, extractedYear, year });
        
        const featureResponse = await fetch('/api/calculate-features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allCourses: data.data.allCourses,
            year: year,
            major: studentInfo?.major || null
          })
        });

        console.log('📡 calculate-features API响应状态:', featureResponse.status, featureResponse.ok);

        if (featureResponse.ok) {
          const featureData = await featureResponse.json();
          console.log('✅ 特征值计算成功:', featureData);
          console.log('📊 特征值数据结构:', {
            success: featureData.success,
            hasData: !!featureData.data,
            hasC1: featureData.data?.C1 !== undefined,
            hasC23: featureData.data?.C23 !== undefined,
            cValues: featureData.data ? Object.keys(featureData.data).filter(k => k.startsWith('C')) : []
          });
          
          // 4. 调用预测API - 使用计算出的 C1~C23 特征值进行预测
          // 现在直接使用 C1~C23，不需要映射
          const featureValues: Record<string, number> = {};
          
          // 提取 C1~C23
          for (let i = 1; i <= 23; i++) {
            const cKey = `C${i}`;
            const value = featureData.data?.[cKey];
            if (value !== undefined && value !== null) {
              featureValues[cKey] = value;
            }
          }
          
          // 保存计算出的特征值（用于显示）
          setCalculatedFeatures(featureValues);
          
          console.log('📊 C1~C23 特征值:', featureValues);
          
          console.log('🔄 开始调用预测API...');
          const predictionResponse = await fetch('/api/proba-predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              featureValues: featureValues
            })
          });

          console.log('📡 预测API响应状态:', predictionResponse.status, predictionResponse.ok);

          if (predictionResponse.ok) {
            const predictionData = await predictionResponse.json();
            console.log('✅ 预测API返回数据:', predictionData);
            console.log('📊 预测数据详情:', {
              success: predictionData.success,
              hasData: !!predictionData.data,
              hasProbabilities: !!predictionData.data?.probabilities,
              probabilitiesType: Array.isArray(predictionData.data?.probabilities) ? 'array' : typeof predictionData.data?.probabilities,
              probabilitiesLength: Array.isArray(predictionData.data?.probabilities) ? predictionData.data.probabilities.length : 'N/A',
              fullResponse: JSON.stringify(predictionData, null, 2)
            });
            
            // 更灵活的数据解析：尝试多种可能的数据结构
            console.log('🔍 开始解析概率数据...');
            let probabilities: number[] | null = null;
            
            if (predictionData.success && predictionData.data) {
              console.log('✅ predictionData.success 为 true，开始解析数据');
              // 尝试标准的 probabilities 数组格式
              if (Array.isArray(predictionData.data.probabilities)) {
                probabilities = predictionData.data.probabilities;
                console.log('✅ 找到标准格式的 probabilities 数组:', probabilities);
              }
              // 如果直接返回数组
              else if (Array.isArray(predictionData.data)) {
                probabilities = predictionData.data;
                console.log('✅ 找到直接数组格式:', probabilities);
              }
              // 如果 probabilities 是对象，尝试提取值
              else if (predictionData.data.probabilities && typeof predictionData.data.probabilities === 'object') {
                probabilities = Object.values(predictionData.data.probabilities) as number[];
                console.log('✅ 从对象中提取 probabilities:', probabilities);
              } else {
                console.warn('⚠️ 无法解析 probabilities 数据:', {
                  hasData: !!predictionData.data,
                  dataKeys: predictionData.data ? Object.keys(predictionData.data) : [],
                  probabilitiesType: typeof predictionData.data?.probabilities,
                  isArray: Array.isArray(predictionData.data?.probabilities)
                });
              }
            } else {
              console.warn('⚠️ predictionData 格式不正确:', {
                success: predictionData.success,
                hasData: !!predictionData.data
              });
            }
            
            console.log('🔍 解析结果 - probabilities:', probabilities);
            console.log('🔍 解析结果 - probabilities 是否为数组:', Array.isArray(probabilities));
            console.log('🔍 解析结果 - probabilities 长度:', probabilities?.length);
            
            if (probabilities && probabilities.length >= 2) {
              console.log('✅✅✅ 进入设置预测结果的分支，probabilities 有效且长度 >= 2');
              console.log('📈 概率数组:', probabilities);
              console.log('📈 概率数组长度:', probabilities.length);
              // 业务约定：第一个百分比→国内读研，第二个百分比→海外读研，第三个舍弃
              const domesticPct = Number((probabilities[0] * 100).toFixed(1))  // 第一个百分比
              const overseasPct = Number((probabilities[1] * 100).toFixed(1)) // 第二个百分比
              console.log('✅ 计算后的百分比:', { domesticPct, overseasPct });
              
              // 立即更新预测结果状态
              const newPredictionResult = {
                domesticPercentage: domesticPct,
                overseasPercentage: overseasPct
              };
              console.log('🔄 准备设置预测结果状态:', JSON.stringify(newPredictionResult));
              
              try {
                // 先设置 loadingFeatures 为 false，然后设置预测结果
                // 这样确保 UI 能正确响应状态变化
                console.log('🔄 步骤1: 设置 loadingFeatures 为 false');
                setLoadingFeatures(false);
                console.log('✅ 步骤1完成: loadingFeatures 已设置为 false');
                
                console.log('🔄 步骤2: 设置 predictionResult，值:', JSON.stringify(newPredictionResult));
                setPredictionResult(newPredictionResult);
                console.log('✅ 步骤2完成: predictionResult 状态已更新');
                
                // 双重确认日志
                console.log('✅✅✅ 预测结果已更新到状态:', {
                  domesticPercentage: newPredictionResult.domesticPercentage,
                  overseasPercentage: newPredictionResult.overseasPercentage,
                  loadingFeatures: false
                });
                
                // 额外验证：检查状态是否正确设置
                setTimeout(() => {
                  console.log('🔍 状态验证 - predictionResult 应该是:', JSON.stringify(newPredictionResult));
                  console.log('🔍 状态验证 - loadingFeatures 应该是: false');
                }, 100);
              } catch (error) {
                console.error('❌ 设置状态时发生错误:', error);
                if (error instanceof Error) {
                  console.error('❌ 错误详情:', error.message, error.stack);
                }
                // 即使出错也要设置 loadingFeatures 为 false
                setLoadingFeatures(false);
              }
            } else {
              console.error('❌ 预测API返回数据格式错误或数据不完整:', {
                success: predictionData.success,
                hasData: !!predictionData.data,
                hasProbabilities: !!predictionData.data?.probabilities,
                probabilitiesIsArray: Array.isArray(predictionData.data?.probabilities),
                probabilitiesLength: probabilities ? probabilities.length : 0,
                fullData: JSON.stringify(predictionData, null, 2)
              });
              setPredictionResult(null);
              // 即使数据格式错误，也要停止 loading
              setLoadingFeatures(false);
            }
          } else {
            const errorText = await predictionResponse.text();
            console.error('❌ 预测API调用失败:', {
              status: predictionResponse.status,
              statusText: predictionResponse.statusText,
              errorText: errorText
            });
            setPredictionResult(null);
            // API 调用失败，也要停止 loading
            setLoadingFeatures(false);
          }
          } else {
            const errorText = await featureResponse.text();
            console.error('❌ 特征值计算API调用失败:', featureResponse.status, errorText);
            console.error('❌ 特征值计算API错误详情:', {
              status: featureResponse.status,
              statusText: featureResponse.statusText,
              errorText: errorText
            });
          }
        } else {
          const errorText = await response.text();
          console.error('❌ all-course-data API调用失败:', response.status, errorText);
          console.error('❌ all-course-data API错误详情:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            requestData: {
              studentHash: user.userHash,
              modifiedScoresCount: updatedScores.length,
              source2ScoresCount: source2Scores.length
            }
          });
        }
        
        console.log('✅ 所有API调用流程已完成');
    } catch (error) {
      console.error('❌ handleConfirmModification执行过程中发生错误:', error);
      if (error instanceof Error) {
        console.error('❌ 错误详情:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      } else {
        console.error('❌ 未知错误类型:', error);
      }
    } finally {
      console.log('✅ 执行 finally 块，设置 loadingFeatures 为 false');
      setLoadingFeatures(false);
      console.log('✅ loadingFeatures 已设置为 false');
    }
    
    // 退出编辑模式
    console.log('✅ 退出编辑模式');
    setIsEditMode(false);
    console.log('✅ handleConfirmModification 执行完成');
  };

  // 加载目标分数（带缓存）
  const loadTargetScores = async () => {
    if (!user?.userHash) return;
    if (!studentInfo?.major) return; // 等待专业加载

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
        body: JSON.stringify({ 
          studentHash: user.userHash, 
          major: studentInfo?.major,
          studentNumber: typeof (user as any)?.studentNumber === 'string' ? (user as any).studentNumber : (user?.userId || '')
        }),
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

  // 加载概率数据（按钮旁百分比），来自 cohortxxxx_predictions_all 表
  const loadProbabilityData = async () => {
    console.log('1.进入loadProbabilityData函数');
    if (!user?.userHash || !user?.userId) return;
    console.log('2.user?.userHash 和 user?.userId 存在，继续执行');
    setLoadingProbability(true);
    console.log('3.设置loadingProbability为true');
    try {
      // 使用 userHash 和 userId（学号），与 source1-scores API 保持一致
      const studentHash = user.userHash;
      const studentNumber = typeof (user as any)?.studentNumber === 'string' ? (user as any).studentNumber : (user?.userId || '');
      if (!studentNumber) {
        console.error('❌ 无法获取学号，无法加载概率数据');
        setLoadingProbability(false);
        return;
      }
      console.log('4.studentNumber和哈希存在，继续执行');
      const response = await fetch('/api/probability-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentHash: studentHash,
          studentNumber: studentNumber
        })
      });
      console.log('5.调用API查询概率接口，继续执行');
      if (response.ok) {
        console.log('6.API查询概率接口成功，继续执行');
        const data = await response.json();
        setProbabilityData({
          proba_1: !isNaN(Number(data.proba_1)) ? Number(data.proba_1) : null,
          proba_2: !isNaN(Number(data.proba_2)) ? Number(data.proba_2) : null,
          year: !isNaN(Number(data.year)) ? Number(data.year) : null
        });
        console.log('6.1.设置probabilityData：', {proba_1:Number(data.proba_1),proba_2:Number(data.proba_2)});
        // 保存当前概率值用于计算提高百分比
        setCurrent_proba1(!isNaN(Number(data.proba_1)) ? Number(data.proba_1) : null);
        setCurrent_proba2(!isNaN(Number(data.proba_2)) ? Number(data.proba_2) : null);
        console.log('7.设置current:', {current_proba1:current_proba1,current_proba2:current_proba2});
      } else {
        console.log('7.API查询概率接口失败，继续执行');
        setProbabilityData(null);
        setCurrent_proba1(null);
        setCurrent_proba2(null);
      }
    } catch (error) {
      console.log('7.接口报错error，继续执行');
      setProbabilityData(null);
      setCurrent_proba1(null);
      setCurrent_proba2(null);
    } finally {
      console.log('8.设置loadingProbability为false，继续执行');
      setLoadingProbability(false);
    }
  };

  // 辅助函数：将modified缓存中所有课程的成绩设置为目标分数
  //const applyTargetScoresToModified = () => {
  //  if (!user?.userHash) return;
  //  
  //  // 直接操作modified1和modified2缓存，而不是从original读取
  //  setModified1ScoresCache(prev => {
  //    const currentModified1 = prev[user.userHash];
  //    if (!currentModified1 || currentModified1.length === 0) return prev;
  //    if (!targetScores || targetScores.target2_score === null || targetScores.target2_score === undefined) return prev;
  //    
  //    // 更新modified1：所有成绩设置为target2_score（海外读研）
  //    const updatedModified1 = currentModified1.map((course: any) => ({
  //      ...course,
  //      score: targetScores.target2_score
  //    }));
  //    console.log('Modified1 scores set to target2_score:', targetScores.target2_score);
  //    return {
  //      ...prev,
  //      [user.userHash]: updatedModified1
  //    };
  //  });
  //
  //  setModified2ScoresCache(prev => {
  //    const currentModified2 = prev[user.userHash];
  //    if (!currentModified2 || currentModified2.length === 0) return prev;
  //    if (!targetScores || targetScores.target1_score === null || targetScores.target1_score === undefined) return prev;
  //    
  //    // 更新modified2：所有成绩设置为target1_score（国内读研）
  //    const updatedModified2 = currentModified2.map((course: any) => ({
  //      ...course,
  //      score: targetScores.target1_score
  //    }));
  //    console.log('Modified2 scores set to target1_score:', targetScores.target1_score);
  //    return {
  //      ...prev,
  //      [user.userHash]: updatedModified2
  //    };
  //  });
  //};

  // 辅助函数：将modified缓存中所有课程的成绩设置为加权平均分
  const applyTargetScoresToModified = () => {
    if (!user?.userHash) return;
    
    // 获取加权平均分
    const average = getAcademicAverage();
    if (average === null) return;
    
    // 直接操作modified1和modified2缓存，而不是从original读取
    setModified1ScoresCache(prev => {
      const currentModified1 = prev[user.userHash];
      if (!currentModified1 || currentModified1.length === 0) return prev;
      
      // 更新modified1：所有成绩设置为加权平均分（海外读研）
      const updatedModified1 = currentModified1.map((course: any) => ({
        ...course,
        score: average
      }));
      console.log('Modified1 scores set to academic average:', average);
      return {
        ...prev,
        [user.userHash]: updatedModified1
      };
    });

    setModified2ScoresCache(prev => {
      const currentModified2 = prev[user.userHash];
      if (!currentModified2 || currentModified2.length === 0) return prev;
      
      // 更新modified2：所有成绩设置为加权平均分（国内读研）
      const updatedModified2 = currentModified2.map((course: any) => ({
        ...course,
        score: average
      }));
      console.log('Modified2 scores set to academic average:', average);
      return {
        ...prev,
        [user.userHash]: updatedModified2
      };
    });
  };

  // 加载Original缓存（从source1-scores API，对标模板）
  const loadOriginalScores = async () => {
    if (!user?.userHash) return;

    // 检查缓存
    if (originalScoresCache[user.userHash]) {
      console.log('Using cached original scores');
      return originalScoresCache[user.userHash];
    }

    setLoadingOriginalScores(true);
    try {
      const response = await fetch('/api/source1-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          studentHash: user.userHash,
          major: studentInfo?.major,
          studentNumber: typeof (user as any)?.studentNumber === 'string' ? (user as any).studentNumber : (user?.userId || '')
        }),
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
          
          // 初始化modified1和modified2缓存（复制original数据，过滤掉没有成绩的课程）
          const scoresWithGrades = originalScores.filter((course: any) => 
            course.score !== null && course.score !== undefined
          );
          setModified1ScoresCache(prev => ({
            ...prev,
            [user.userHash]: JSON.parse(JSON.stringify(scoresWithGrades)) // 深拷贝，只包含有成绩的课程
          }));
          setModified2ScoresCache(prev => ({
            ...prev,
            [user.userHash]: JSON.parse(JSON.stringify(scoresWithGrades)) // 深拷贝，只包含有成绩的课程
          }));
          
          console.log('Original scores loaded and cached:', originalScores.length, 'courses');
          console.log('Modified1 and Modified2 cache initialized with original data');
          
          // 注意：不在loadOriginalScores内部调用applyTargetScoresToModified
          // 因为这会导致状态更新冲突，让useEffect来处理目标分数的应用
          
          return originalScores;
        } else {
          console.log('No original scores found');
          return [];
        }
      } else {
        // 若404等，前端显示"该学生数据不存在"
        try {
          const err = await response.json();
          console.error('Failed to load original scores:', err?.error || response.statusText);
        } catch {}
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


  // 获取Modified缓存数据（根据当前选择的按钮返回对应的缓存）
  const getModifiedScores = () => {
    if (!user?.userHash) return [];
    
    // 根据 selectedButton 决定使用哪个缓存
    // overseas -> modified1, domestic -> modified2
    let targetCache: Record<string, any> = {};
    let cacheName = '';
    
    if (selectedButton === 'overseas') {
      targetCache = modified1ScoresCache;
      cacheName = 'modified1';
    } else if (selectedButton === 'domestic') {
      targetCache = modified2ScoresCache;
      cacheName = 'modified2';
    } else {
      // 如果没有选择按钮，默认返回空数组
      return [];
    }
    
    // 检查对应的modified缓存
    if (targetCache[user.userHash]) {
      console.log(`Using cached ${cacheName} scores`);
      return targetCache[user.userHash];
    }
    
    // 如果没有modified缓存，返回original缓存（作为初始值）
    if (originalScoresCache[user.userHash]) {
      console.log(`No ${cacheName} cache, using original scores as initial value`);
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

  // 获取加权均分（AcademicAverage）
  const getAcademicAverage = (): number | null => {
    if (!user?.userHash) return null;
    
    // 返回缓存中的加权均分，如果没有则返回 null
    return academicAverageCache[user.userHash] ?? null;
  };

  // 更新Modified缓存数据（根据当前选择的按钮更新对应的缓存）
  const updateModifiedScores = (newScores: any[]) => {
    if (!user?.userHash) return;
    
    // 根据 selectedButton 决定更新哪个缓存
    if (selectedButton === 'overseas') {
      setModified1ScoresCache(prev => ({
        ...prev,
        [user.userHash]: JSON.parse(JSON.stringify(newScores)) // 深拷贝
      }));
      console.log('Modified1 cache updated with', newScores.length, 'courses');
    } else if (selectedButton === 'domestic') {
      setModified2ScoresCache(prev => ({
        ...prev,
        [user.userHash]: JSON.parse(JSON.stringify(newScores)) // 深拷贝
      }));
      console.log('Modified2 cache updated with', newScores.length, 'courses');
    }
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
          // 从学号前4位提取年份（数字格式，如 2023）
          const studentNumber = typeof (user as any)?.studentNumber === 'string' 
            ? (user as any).studentNumber 
            : (user?.userId || '').toString();
          const trimmedStudentNumber = studentNumber.toString().trim();
          const extractedYear = parseInt(trimmedStudentNumber.substring(0, 4));
          const year = !isNaN(extractedYear) && extractedYear >= 2018 && extractedYear <= 2050 
            ? extractedYear 
            : null;
          
          const featureResponse = await fetch('/api/calculate-features', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              allCourses: data.data.allCourses,
              year: year,
              major: studentInfo?.major || null
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



  // 初始加载时更新GPA门槛值（暂时不需要，注释掉）
  // useEffect(() => {
  //   if (authLoading) return;
  //   
  //   loadGPAThresholds();
  // }, [authLoading]);

  // 加载能力数据
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.userHash && studentInfo?.year) {
      loadAbilityData();
    }
  }, [user?.userHash, studentInfo?.year, authLoading]);

  // 加载目标分数（等待专业加载）
  useEffect(() => {
    if (authLoading) return;
    if (!user?.userHash) return;
    if (!studentInfo?.major) return;
    loadTargetScores();
  }, [user?.userHash, authLoading, studentInfo?.major]);

  // 当targetScores和original缓存都加载完成后，初始化modified缓存并应用目标分数
  // 使用ref来跟踪是否已经应用过目标分数，避免无限循环
  const targetScoresAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.userHash) return;
    if (!targetScores) return;
    if (!originalScoresCache[user.userHash]) return; // 确保original已加载

    // 如果已经为当前userHash应用过目标分数，不再重复应用
    const cacheKey = `${user.userHash}-${targetScores.target1_score}-${targetScores.target2_score}`;
    if (targetScoresAppliedRef.current === cacheKey) return;

    // 检查modified1和modified2是否已初始化
    const modified1Exists = modified1ScoresCache[user.userHash];
    const modified2Exists = modified2ScoresCache[user.userHash];

    // 如果modified缓存未初始化，先从original初始化
    if (!modified1Exists && !modified2Exists) {
      const originalScores = originalScoresCache[user.userHash];
      const scoresWithGrades = originalScores.filter((course: any) => 
        course.score !== null && course.score !== undefined
      );
      const copiedScores = JSON.parse(JSON.stringify(scoresWithGrades));
      
      // 初始化modified1和modified2缓存
      setModified1ScoresCache(prev => ({
        ...prev,
        [user.userHash]: JSON.parse(JSON.stringify(copiedScores))
      }));
      setModified2ScoresCache(prev => ({
        ...prev,
        [user.userHash]: JSON.parse(JSON.stringify(copiedScores))
      }));
      
      // 等待状态更新后应用目标分数（使用setTimeout确保状态更新完成）
      setTimeout(() => {
        applyTargetScoresToModified();
        targetScoresAppliedRef.current = cacheKey;
      }, 0);
      return;
    }

    // 如果已初始化，应用目标分数
    if (modified1Exists || modified2Exists) {
      applyTargetScoresToModified();
      targetScoresAppliedRef.current = cacheKey;
    }
    // 只依赖必要的值，避免对象引用导致的重复渲染
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetScores, user?.userHash, originalScoresCache]);

  // 加载按钮旁概率数据（增加轻量重试，最多5次，每次500ms）
  useEffect(() => {
    if (authLoading) return;
    if (!user?.userHash || !user?.userId) return;

    // 如果已经有数据，不再重试
    if (probabilityData) return;

    // 首次尝试
    loadProbabilityData();
    console.log('首次尝试获取到的当前概率值:', {current_proba1: current_proba1, current_proba2: current_proba2});
    // 若没有数据且未超过重试次数，安排下次重试
    if (probabilityRetryRef.current < 5) {
      const timer = setTimeout(() => {
        // 只有在还没有数据的情况下才继续重试
        if (!probabilityData) {
          probabilityRetryRef.current += 1;
          loadProbabilityData();
          console.log('重复尝试获取到的当前概率值:', {current_proba1: current_proba1, current_proba2: current_proba2});
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.userHash, user?.userId, authLoading]);

  // 加载Original缓存（添加ref防止重复加载）
  const originalLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (authLoading) return;
    if (!user?.userHash) return;

    // 如果已经加载过该用户的original数据，不再重复加载
    const cacheKey = `${user.userHash}-${studentInfo?.major || 'no-major'}`;
    if (originalLoadedRef.current === cacheKey) return;
    
    // 如果缓存中已有数据且专业匹配，标记为已加载
    if (originalScoresCache[user.userHash] && studentInfo?.major) {
      originalLoadedRef.current = cacheKey;
      return;
    }

    // 只有当 studentInfo.major 可用时，才触发加载；否则等待并重试
    if (studentInfo?.major) {
      loadOriginalScores().then(() => {
        originalLoadedRef.current = cacheKey;
      });
    } else {
      // 简单重试：最多重试 5 次，每次延迟 500ms
      if (originalRetryRef.current < 5) {
        originalRetryRef.current += 1;
        const timer = setTimeout(() => {
          // 不通过setState触发重新渲染，而是依赖studentInfo的自动更新
          // 移除 setStudentInfo((prev) => prev) 以避免不必要的渲染
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userHash, authLoading, studentInfo?.major]);

  // 加载Source2缓存（添加ref防止重复加载）
  const source2LoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (authLoading) return;
    if (!user?.userHash) return;
    
    // 如果已经加载过该用户的source2数据，不再重复加载
    if (source2LoadedRef.current === user.userHash) return;
    
    // 如果缓存中已有数据，标记为已加载
    if (source2ScoresCache[user.userHash]) {
      source2LoadedRef.current = user.userHash;
      return;
    }
    
    loadSource2Scores().then(() => {
      source2LoadedRef.current = user.userHash;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userHash, authLoading]);

  // 计算并缓存加权均分（AcademicAverage）- 使用 dashboard-data.ts 的计算逻辑
  // 数据来源：直接从 academic__data.ts 获取数据
  const academicAverageCalculatedRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!user?.userHash) return;
    
    // 如果已经计算过该用户的加权均分，不再重复计算
    if (academicAverageCalculatedRef.current[user.userHash]) return;
    
    // 直接从 academic__data.ts 获取数据（使用 getStudentResults，它会自动从缓存或查询获取）
    const calculateAverage = async () => {
      try {
        console.log('开始计算加权均分，从 academic__data.ts 获取数据');
        
        // 使用 getStudentResults 获取 CourseResult[] 格式的数据
        // 这个函数会从 academic__data.ts 的统一缓存获取数据，或调用 queryAcademicResults
        const courseResults = await getStudentResults(user.userHash);
        console.log('从 academic__data.ts 获取的课程数量:', courseResults.length);
        
        if (courseResults.length === 0) {
          console.log('没有课程数据，无法计算加权均分');
          return;
        }
        
        // 使用 dashboard-data.ts 中的 calculateDashboardStats 函数计算
        const stats = calculateDashboardStats(courseResults);
        console.log('calculateDashboardStats 计算结果:', stats);
        
        // 获取加权平均分并向下取整
        const average = Math.floor(stats.averageScore);
        
        // 缓存计算结果
        setAcademicAverageCache(prev => ({
          ...prev,
          [user.userHash]: average
        }));
        
        // 标记为已计算
        academicAverageCalculatedRef.current[user.userHash] = true;
        
        console.log('加权均分已计算并缓存 (AcademicAverage):', average, '（原始值:', stats.averageScore, '）');
      } catch (error) {
        console.error('计算加权均分时出错:', error);
      }
    };
    
    calculateAverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userHash]);

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

  // 加载毕业要求数据（当选择毕业按钮时）
  useEffect(() => {
    if (authLoading) return;
    if (!user?.userHash) return;
    if (selectedButton !== 'graduation') return;

    loadGraduationRequirements();
  }, [selectedButton, user, authLoading]);

  // 预测结果卡片动画：当有新的预测结果时启动动画
  useEffect(() => {
    if (predictionResult && (predictionResult.domesticPercentage !== null || predictionResult.overseasPercentage !== null)) {
      // 启动动画，从步骤0开始
      setAnimationStep(0);
    }
  }, [predictionResult]);

  // 预测结果卡片动画：管理动画步骤切换（每0.5秒切换一次）
  useEffect(() => {
    if (animationStep < 0 || animationStep >= 4) {
      // 动画未开始或已完成，保持在最终状态（步骤4，浅蓝色）
      if (animationStep >= 4) {
        setAnimationStep(4);
      }
      return;
    }

    // 每0.5秒切换到下一步
    const timer = setTimeout(() => {
      setAnimationStep(prev => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [animationStep]);





  // 获取当前语言的能力标签
  const currentAbilityLabels = abilityLabels[language as keyof typeof abilityLabels] || abilityLabels.zh;
  
  
  // 下载状态
  const [downloading, setDownloading] = useState(false);

  const resolvePlanYear = () => {
    const rawStudentNumber =
      typeof (user as any)?.studentNumber === 'string'
        ? (user as any).studentNumber
        : (user?.userId || '').toString();

    if (!rawStudentNumber) return null;

    const year = parseInt(rawStudentNumber.trim().slice(0, 4), 10);
    if (isNaN(year) || year < 2018 || year > 2050) return null;

    return year;
  };
  
  // 下载培养方案处理函数（按年级选择对应PDF）
  const handleDownloadCurriculum = async () => {
    try {
      setDownloading(true);
      const planYear = resolvePlanYear();
      if (!planYear) {
        console.error('无法解析有效的培养方案年份，已取消下载');
        return;
      }
      const fileName = `Education_Plan_PDF_${planYear}.pdf`;
      
      // 首先尝试从 Supabase Storage 获取文件列表
      try {
        const plans = await listEducationPlans();
        
        if (plans.length > 0) {
          // 找到匹配年份的文件
          const targetPlan = plans.find(plan => plan.year === planYear.toString());
          // 如果找到文件，使用 Supabase URL 下载
          if (targetPlan && targetPlan.url) {
            window.open(targetPlan.url, '_blank');
            return;
          } else {
            console.error(`Supabase 未找到培养方案文件: ${fileName}`);
          }
        }
      } catch (supabaseError) {
        console.error('Supabase Storage 获取失败:', supabaseError);
      }
      
      console.error(`培养方案文件下载失败：Supabase 中未找到 ${fileName}`);
      
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请稍后再试或联系管理员');
    } finally {
      setDownloading(false);
    }
  };


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
    <div className="container mx-auto p-4 space-y-6 relative">
      {/* 其他内容 */}
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('analysis.title')}</h1>
            <p className="text-muted-foreground">
              {(() => {
                const studentNumber = typeof (user as any)?.studentNumber === 'string' 
                  ? (user as any).studentNumber 
                  : (user?.userId || '').toString();
                const trimmedStudentNumber = studentNumber.toString().trim();
                const year = parseInt(trimmedStudentNumber.substring(0, 4));
                const displayYear = !isNaN(year) && year >= 2018 && year <= 2050 ? year : null;
                
                return studentInfo 
                  ? `${displayYear || studentInfo.year}${studentInfo.major}-${user?.userId || ''}`
                  : t('analysis.loading');
              })()}
            </p>
          </div>

        </div>

        {/* 免责声明 */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            {t('disclaimer.data.accuracy')}
          </p>
        </div>

        {/* 三个交互按钮 */}
<div className="mb-6 grid grid-cols-3 gap-2 md:gap-4">
  {/* 毕业要求按钮（保持现有逻辑，作为参考） */}
  <Button
    variant={selectedButton === 'graduation' ? 'default' : 'outline'}
    className={`h-22 md:h-16 text-base font-medium flex flex-col items-center justify-center transition-transform duration-200 ${
      selectedButton === 'graduation' 
        ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white' 
        : 'hover:scale-95'
    }`}
    onClick={() => handleButtonSelect('graduation')}
  >
    <span>{t('analysis.graduation.title')}</span>
    <span className="text-xs text-red-500 mt-1 px-1 text-center leading-tight break-words whitespace-normal">
      {t('analysis.graduation.pending')}
    </span>
  </Button>

  {/* 海外读研按钮（修改样式逻辑） */}
  <Button
    // 选中时切换为default样式，未选中为outline
    variant={selectedButton === 'overseas' ? 'default' : 'outline'}
    className={`h-22 md:h-16 text-base font-medium transition-transform duration-200 p-0 overflow-hidden ${
      selectedButton === 'overseas'
        // 选中状态样式（与毕业按钮保持一致）
        ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white'
        // 未选中状态样式
        : 'hover:scale-95'
    }`}
    onClick={() => handleButtonSelect('overseas')}
  >
    <div className="flex flex-col items-center justify-center h-full w-full">
      {/* 标题行 */}
      <span className={`${selectedButton === 'overseas' ? 'text-base' : 'text-sm'}`}>
        {t('analysis.overseas.title')}
      </span>
      {/* 内容行（选中时显示概率，未选中时显示提示） */}
      <span className={`mt-1 ${
        selectedButton === 'overseas'
          ? 'text-blue-500 font-medium' // 选中时强调色
          : 'text-[11px] text-gray-600' // 未选中时灰色小字
      }`}>
        {selectedButton === 'overseas' 
          ? loadingProbability 
            ? t('analysis.target.score.loading') // 加载中
            : probabilityData?.proba_2 !== null 
            ?`${(((probabilityData?.proba_1 ?? 0) + (probabilityData?.proba_2 ?? 0)) * 100).toFixed(1)}%`              : t('analysis.target.score.no.data') // 无数据
          : t('analysis.predict.click.hint') // 未选中时提示
        }
      </span>
    </div>
  </Button>

  {/* 国内读研按钮（与海外按钮逻辑一致） */}
  <Button
    variant={selectedButton === 'domestic' ? 'default' : 'outline'}
    className={`h-22 md:h-16 text-base font-medium transition-transform duration-200 p-0 overflow-hidden ${
      selectedButton === 'domestic'
        ? 'bg-blue-200 text-blue-700 border-blue-300 hover:bg-blue-400 hover:text-white'
        : 'hover:scale-95'
    }`}
    onClick={() => handleButtonSelect('domestic')}
  >
    <div className="flex flex-col items-center justify-center h-full w-full">
      <span className={`${selectedButton === 'domestic' ? 'text-base' : 'text-sm'}`}>
        {t('analysis.domestic.title')}
      </span>
      <span className={`mt-1 ${
        selectedButton === 'domestic'
          ? 'text-blue-500 font-medium'
          : 'text-[11px] text-gray-600'
      }`}>
        {selectedButton === 'domestic' 
          ? loadingProbability 
            ? t('analysis.target.score.loading')
            : probabilityData?.proba_1 !== null 
            ? `${((probabilityData?.proba_1 ?? 0) * 100).toFixed(1)}%`              : t('analysis.target.score.no.data')
          : t('analysis.predict.click.hint')
        }
      </span>
    </div>
  </Button>
</div>

        <div className="analysis-content">
          {/* 初始界面内容 - 仅在未选择按钮时显示 */}
          {!selectedButton && (
            <>
              {/* GPA门槛值分析 - 独立卡片，填满整个宽度 - 已隐藏 */}
              <div className="mb-6 hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{t('analysis.tops.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {/* 前10% GPA */}
                  <div className="text-center py-4 border-r border-gray-200 last:border-r-0">
                    <div className="text-lg font-medium mb-2">
                      {loadingGPA ? t('analysis.calculating') : (gpaThresholds.top10 !== null ? gpaThresholds.top10.toFixed(2) : t('analysis.target.score.no.data'))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.tops.top10')} GPA
                    </p>
                  </div>
                  
                  {/* 前20% GPA */}
                  <div className="text-center py-4 border-r border-gray-200 last:border-r-0">
                    <div className="text-lg font-medium mb-2">
                      {loadingGPA ? t('analysis.calculating') : (gpaThresholds.top20 !== null ? gpaThresholds.top20.toFixed(2) : t('analysis.target.score.no.data'))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('analysis.tops.top20')} GPA
                    </p>
                  </div>
                  
                  {/* 前30% GPA */}
                  <div className="text-center py-4 border-r border-gray-200 last:border-r-0">
                    <div className="text-lg font-medium mb-2">
                      {loadingGPA ? t('analysis.calculating') : (gpaThresholds.top30 !== null ? gpaThresholds.top30.toFixed(2) : t('analysis.target.score.no.data'))}
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
                        <div className="text-muted-foreground">{t('analysis.target.score.loading')}</div>
                      </div>
                    ) : (
                      <RadarChart 
                        data={abilityData} 
                        labels={currentAbilityLabels}
                        className="mt-4"
                        showBuiltInModal={true}
                        modalContents={[
                          {
                            title: "为提高数理逻辑与科学基础能力，建议注重以下课程:",
                            content: [
                              "工程数学",
                              "高等数学A",
                              "线性代数",
                              "高等数学A",
                              "近代物理"
                            ]
                          },
                          {
                            title: "为提高专业核心技术能力，建议注重以下课程:",
                            content: [
                              "工程数学",
                              "操作系统",
                              "电子电路基础",
                              "信号与系统",
                              "信号与系统"
                            ]
                          },
                          {
                            title: "为提高人文与社会素养能力，建议注重以下课程:",
                            content: [
                              "视听电影",
                              "进阶听说（下）",
                              "进阶听说（上）",
                              "综合英语（上）",
                              "综合英语（下）"
                            ]
                          },
                          {
                            title: "为提高工程实践与创新应用能力，建议注重以下课程:",
                            content: [
                              "个人发展计划1",
                              "电路实验",
                              "毕业设计",
                              "数据结构与算法课程设计",
                              "计算导论与程序设计课程设计"
                            ]
                          },
                          {
                            title: "为提高职业发展与团队协作能力，建议注重以下课程:",
                            content: [
                              "科学思考与艺术实践",
                              "科学思考与艺术实践",
                              "图像识别应用实训",
                              "Web创新实践",
                              "智能交互机器人实验"
                            ]
                          }
                        ]}
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
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-24">
                      <Button
                        variant="default"
                        size="lg"
                        className="w-3/4 h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={handleDownloadCurriculum}
                        disabled={downloading}
                      >
                        {downloading ? '下载中...' : t('analysis.curriculum.view.full')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* 课程类别学分要求 - 当选择毕业按钮时显示 */}
          {selectedButton === 'graduation' && (
            <div className="mb-6">
              {/* 毕业要求详细表格 */}
              {graduationRequirementsData.length > 0 ? (
                <GraduationRequirementsTable 
                  graduationRequirements={graduationRequirementsData} 
                  otherCategory={otherCategoryData}
                  graduationSummary={graduationSummary}
                />
              ) : loadingGraduationRequirements ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-muted-foreground">正在加载毕业要求数据...</div>
                </div>
              ) : selectedButton === 'graduation' ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-muted-foreground">暂无毕业要求数据</div>
                </div>
              ) : null}
            </div>
          )}

          {/* 海外读研分析界面 - 仿照模板设计 */}
          {selectedButton === 'overseas' && (
            <div className="space-y-6">
              <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800">
                {t('analysis.disclaimer.sample')}
              </div>
              {/* 目标分数显示 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-center">
                      <p className="text-blue-800 font-medium">
                        为达到海外读研目标，预估后续科目的最低平均分为{' '}
                        <span className="text-blue-600 font-bold">
                          {/*
                          {loadingTargetScores ? t('analysis.target.score.loading') : 
                           targetScores && targetScores.target2_score !== null ? 
                           `${targetScores.target2_score}` : 
                           t('analysis.target.score.no.data')}
                           */}
                          {loadingOriginalScores ? t('analysis.target.score.loading') : 
                          (() => {
                            const average = getAcademicAverage();
                            return average !== null ? `${average}` : t('analysis.target.score.no.data');
                          })()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={loadAllCourseData}
                      disabled={loadingAllCourseData}
                    >
                      {loadingAllCourseData ? t('analysis.target.score.loading') : t('analysis.view.all.courses')}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* 预测结果显示框 */}
              <div className={`p-4 rounded-lg border border-blue-200 transition-colors duration-500 ${
                animationStep >= 0 && animationStep <= 4
                  ? (animationStep % 2 === 0 ? 'bg-blue-50' : 'bg-blue-200')
                  : 'bg-blue-50'
              }`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-center space-y-2">
                      {predictionResult ? (() => {
                        try {
                          // 计算海外读研百分比变化
                          console.log('当前百分比相关值:', {
                            current_proba2: current_proba2,
                            "predictionResult?.overseasPercentage": predictionResult?.overseasPercentage,
                            "predictionResult.overseasPercentage": predictionResult?.overseasPercentage,
                            current_proba1: current_proba1,
                            "predictionResult?.domesticPercentage": predictionResult?.domesticPercentage,
                            "predictionResult.domesticPercentage": predictionResult?.domesticPercentage,
                          });
                          const overseasImprovement = current_proba2 !== null && predictionResult.overseasPercentage !== null && predictionResult.overseasPercentage !== undefined
                            ? (predictionResult.overseasPercentage - (0.5 * 100))
                            //? 50.2
                            : null;
                          
                          // 计算国内读研百分比变化
                          const domesticImprovement = current_proba1 !== null && predictionResult.domesticPercentage !== null && predictionResult.domesticPercentage !== undefined
                            ? (predictionResult.domesticPercentage - (0.5 * 100))
                            //? 50.1
                            : null;
                          
                          return (
                            <>
                              <p className="text-blue-800 font-medium">
                                {overseasImprovement !== null ? (
                                  overseasImprovement > 0
                                    ? `海外读研新百分比与之前相比提高${overseasImprovement.toFixed(1)}%`
                                    : overseasImprovement < 0
                                    ? `海外读研新百分比与之前相比下降${Math.abs(overseasImprovement).toFixed(1)}%`
                                    : `海外读研新百分比与之前相比提高0.0%`
                                ) : '海外读研百分比计算中...'}
                              </p>
                              <p className="text-blue-800 font-medium">
                                {domesticImprovement !== null ? (
                                  domesticImprovement > 0
                                    ? `国内读研新百分比与之前相比提高${domesticImprovement.toFixed(1)}%`
                                    : domesticImprovement < 0
                                    ? `国内读研新百分比与之前相比下降${Math.abs(domesticImprovement).toFixed(1)}%`
                                    : `国内读研新百分比与之前相比提高0.0%`
                                ) : '国内读研百分比计算中...'}
                              </p>
                              <p className="text-blue-800 font-medium">
                                注：百分比下降是由于未来均分低于当前均分造成的。
                              </p>
                            </>
                          );
                        } catch (error) {
                          console.error('❌ 可能性计算出错（海外读研界面）：', error);
                          if (error instanceof Error) {
                            console.error('❌ 错误详情：', {
                              message: error.message,
                              stack: error.stack,
                              name: error.name
                            });
                          }
                          return <p className="text-blue-800 font-medium">可能性计算出错</p>;
                        }
                      })() : (
                        <p className="text-blue-800 font-medium">{t('analysis.prediction.not.started')}</p>
                      )}
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
                      <CardTitle className="text-lg font-medium">为达到海外读研的目标，推荐的各科目成绩如下：</CardTitle>
                      <CardDescription>{t('analysis.course.recommendation')}</CardDescription>
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
                                <span>{t('analysis.calculating')}</span>
                              </div>
                            ) : (
                              t('analysis.course.scores.confirm.modify')
                            )}
                          </Button>
                          <Button 
                            variant="destructive"
                            size="lg"
                            className="w-full px-6 py-3 text-lg font-semibold transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                            onClick={handleEditModeToggle}
                          >
                            {t('analysis.course.scores.exit.modify')}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="default"
                          size="lg"
                          className="w-full px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                          onClick={handleEditModeToggle}
                        >
                          {t('analysis.course.scores.modify.future')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* PC端布局 - 保持原有的左右排列 */}
                  <div className="hidden md:flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-medium">为达到海外读研的目标，推荐的各科目成绩如下：</CardTitle>
                      <CardDescription>{t('analysis.course.recommendation')}</CardDescription>
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
                              <span>{t('analysis.calculating')}</span>
                            </div>
                          ) : (
                            t('analysis.course.scores.confirm.modify')
                          )}
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
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">序号</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学期</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程名称</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">类别</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学分</th>
                          {!isEditMode && (
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">目标成绩</th>
                          )}
                          {isEditMode && (
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">
                              修改成绩
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const modifiedScores = getModifiedScores();
                          // 过滤掉没有成绩的课程（以 modified 为准）
                          const filteredScores = modifiedScores.filter((course: any) => 
                            course.score !== null && course.score !== undefined
                          );
                          
                          if (filteredScores.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                                  {loadingOriginalScores ? t('analysis.target.score.loading') : t('analysis.course.scores.no.data')}
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
                                {!isEditMode && (
                                  <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                                    {score !== null && score !== undefined ? (
                                      <span className={`font-bold ${scoreColor}`}>{score}</span>
                                    ) : (
                                      <span className="text-gray-400">暂无成绩</span>
                                    )}
                                  </td>
                                )}
                                {isEditMode && (
                                  <td className="border border-gray-200 px-4 py-2 text-sm min-w-[270px] md:min-w-[270px]">
                                    {score !== null && score !== undefined ? (
                                      <Slider
                                        value={(() => {
                                          // 从modified缓存中查找当前课程的最新成绩
                                          const modifiedScores = getModifiedScores();
                                          const modifiedCourse = modifiedScores.find((c: any) => c.courseName === course.courseName);
                                          if (modifiedCourse && modifiedCourse.score !== null && modifiedCourse.score !== undefined) {
                                            return Number(modifiedCourse.score);
                                          }
                                          return Number(score); // 如果没有修改，显示原始成绩
                                        })()}
                                        min={60}
                                        max={98}
                                        step={1}
                                        onChange={(newValue) => handleScoreChange(course.courseName, newValue.toString())}
                                        className="w-full"
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
              <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800">
                {t('analysis.disclaimer.sample')}
              </div>
              {/* 目标分数显示 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-center">
                      <p className="text-blue-800 font-medium">
                        为达到国内读研目标，预估后续科目的最低平均分为{' '}
                        <span className="text-blue-600 font-bold">
                          {/*
                          {loadingTargetScores ? t('analysis.target.score.loading') : 
                            targetScores && targetScores.target1_score !== null ? 
                            `${targetScores.target1_score}` : 
                            t('analysis.target.score.no.data')}
                          */}
                          {loadingOriginalScores ? t('analysis.target.score.loading') : 
                           (() => {
                             const average = getAcademicAverage();
                             return average !== null ? `${average}` : t('analysis.target.score.no.data');
                           })()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={loadAllCourseData}
                      disabled={loadingAllCourseData}
                    >
                      {loadingAllCourseData ? t('analysis.target.score.loading') : t('analysis.view.all.courses')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 预测结果显示框 */}
              <div className={`p-4 rounded-lg border border-blue-200 transition-colors duration-500 ${
                animationStep >= 0 && animationStep <= 4
                  ? (animationStep % 2 === 0 ? 'bg-blue-50' : 'bg-blue-200')
                  : 'bg-blue-50'
              }`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-center space-y-2">
                      {predictionResult ? (() => {
                        try {
                          // 计算海外读研百分比变化
                          const overseasImprovement = current_proba2 !== null && predictionResult.overseasPercentage !== null && predictionResult.overseasPercentage !== undefined
                            ? (predictionResult.overseasPercentage - (current_proba2 * 100))
                            : null;
                          
                          // 计算国内读研百分比变化
                          const domesticImprovement = current_proba1 !== null && predictionResult.domesticPercentage !== null && predictionResult.domesticPercentage !== undefined
                            ? (predictionResult.domesticPercentage - (current_proba1 * 100))
                            : null;
                          
                          return (
                            <>
                              <p className="text-blue-800 font-medium">
                                {overseasImprovement !== null ? (
                                  overseasImprovement > 0
                                    ? `海外读研新百分比与之前相比提高${overseasImprovement.toFixed(1)}%`
                                    : overseasImprovement < 0
                                    ? `海外读研新百分比与之前相比下降${Math.abs(overseasImprovement).toFixed(1)}%`
                                    : `海外读研新百分比与之前相比提高0.0%`
                                ) : '海外读研百分比计算中...'}
                              </p>
                              <p className="text-blue-800 font-medium">
                                {domesticImprovement !== null ? (
                                  domesticImprovement > 0
                                    ? `国内读研新百分比与之前相比提高${domesticImprovement.toFixed(1)}%`
                                    : domesticImprovement < 0
                                    ? `国内读研新百分比与之前相比下降${Math.abs(domesticImprovement).toFixed(1)}%`
                                    : `国内读研新百分比与之前相比提高0.0%`
                                ) : '国内读研百分比计算中...'}
                              </p>
                            </>
                          );
                        } catch (error) {
                          console.error('❌ 可能性计算出错（国内读研界面）：', error);
                          if (error instanceof Error) {
                            console.error('❌ 错误详情：', {
                              message: error.message,
                              stack: error.stack,
                              name: error.name
                            });
                          }
                          return <p className="text-blue-800 font-medium">可能性计算出错</p>;
                        }
                      })() : (
                        <p className="text-blue-800 font-medium">{t('analysis.prediction.not.started')}</p>
                      )}
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
                      <CardTitle className="text-lg font-medium">为达到国内读研的目标，推荐的各科目成绩如下：</CardTitle>
                      <CardDescription>{t('analysis.course.recommendation')}</CardDescription>
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
                                <span>{t('analysis.calculating')}</span>
                              </div>
                            ) : (
                              t('analysis.course.scores.confirm.modify')
                            )}
                          </Button>
                          <Button 
                            variant="destructive"
                            size="lg"
                            className="w-full px-6 py-3 text-lg font-semibold transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                            onClick={handleEditModeToggle}
                          >
                            {t('analysis.course.scores.exit.modify')}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="default"
                          size="lg"
                          className="w-full px-8 py-3 text-lg font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                          onClick={handleEditModeToggle}
                        >
                          {t('analysis.course.scores.modify.future')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* PC端布局 - 保持原有的左右排列 */}
                  <div className="hidden md:flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-medium">为达到国内读研的目标，推荐的各科目成绩如下：</CardTitle>
                      <CardDescription>{t('analysis.course.recommendation')}</CardDescription>
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
                              <span>{t('analysis.calculating')}</span>
                            </div>
                          ) : (
                            t('analysis.course.scores.confirm.modify')
                          )}
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
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">序号</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学期</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程名称</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">类别</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学分</th>
                          {!isEditMode && (
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">目标成绩</th>
                          )}
                          {isEditMode && (
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">
                              修改成绩
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const modifiedScores = getModifiedScores();
                          // 过滤掉没有成绩的课程（以 modified 为准）
                          const filteredScores = modifiedScores.filter((course: any) => 
                            course.score !== null && course.score !== undefined
                          );
                          
                          if (filteredScores.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
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
                                {!isEditMode && (
                                  <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                                    {course.score !== null ? (
                                      <span className={`font-bold ${scoreColor}`}>{course.score}</span>
                                    ) : (
                                      <span className="text-gray-400 italic text-xs">{t('analysis.course.scores.no.original.score')}</span>
                                    )}
                                  </td>
                                )}
                                {isEditMode && (
                                  <td className="border border-gray-200 px-4 py-2 text-sm min-w-[270px] md:min-w-[270px]">
                                    {score !== null && score !== undefined ? (
                                      <Slider
                                        value={(() => {
                                          // 从modified缓存中查找当前课程的最新成绩
                                          const modifiedScores = getModifiedScores();
                                          const modifiedCourse = modifiedScores.find((c: any) => c.courseName === course.courseName);
                                          if (modifiedCourse && modifiedCourse.score !== null && modifiedCourse.score !== undefined) {
                                            return Number(modifiedCourse.score);
                                          }
                                          return Number(score); // 如果没有修改，显示原始成绩
                                        })()}
                                        min={60}
                                        max={98}
                                        step={1}
                                        onChange={(newValue) => handleScoreChange(course.courseName, newValue.toString())}
                                        className="w-full"
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300"
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
                {t('analysis.edit.welcome')}
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
                <h4 className="font-semibold mb-3 text-green-700">来源1：专业预测表（包含修改后的成绩）</h4>
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
                              course.source === '专业预测表' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {course.source === '专业预测表' ? '来源1' : '来源2'}
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
                <h4 className="font-semibold mb-3 text-blue-800">基于当前数据计算出的特征值</h4>
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
                    {academicStrength !== null && (
                      <div className="p-3 border border-blue-300 rounded-lg bg-white">
                        <div className="text-sm font-medium text-blue-700 mb-1">AcademicStrength</div>
                        <div className="text-xl font-bold text-blue-600">{academicStrength.toFixed(2)}</div>
                      </div>
                    )}
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
    </div>
  )
}
