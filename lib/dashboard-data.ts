import { supabase } from './supabase'
import { calculateGPA } from './gpa-calculator'
import { sha256 } from './utils'
import { 
  queryAcademicResults, 
  getFromCache as getAcademicCache,
  type AcademicResultRecord 
} from './academic__data'

// 导出缓存管理函数（保持向后兼容，但实际使用 academic__data.ts 的缓存）
export { getFromCache, setCache, clearCache } from './academic__data'

export interface CourseResult {
  id: string
  course_name: string
  course_id: string
  grade: string | number
  credit: number
  semester: string
  course_type: string
  course_attribute?: string
  exam_type?: string
}

export interface DashboardStats {
  averageScore: number
  passRate: number
  courseCount: number
  gpa: number
}

export interface SubjectGrade {
  name: string
  grade: number | string
  average: number
  credit: number
}

export interface CourseTypeStats {
  type: string
  count: number
  averageScore: number
}

export interface SemesterTrend {
  semester: string
  average: number
  courseCount: number
}

// 获取学生成绩数据 - 重构版本（使用 academic__data.ts 作为唯一数据源）
export async function getStudentResults(studentHash: string): Promise<CourseResult[]> {
  try {
    console.log('开始查询学生成绩，哈希值:', studentHash);
    
    // 验证哈希值格式：必须是64位十六进制字符串
    if (!studentHash || studentHash.trim() === '') {
      console.error('哈希值不能为空');
      return [];
    }
    
    const trimmedHash = studentHash.trim();
    
    if (trimmedHash.length !== 64 || !/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      console.error('无效的哈希值格式，必须是64位十六进制字符串:', trimmedHash);
      console.error('当前哈希值长度:', trimmedHash.length);
      console.error('哈希值格式:', /^[a-f0-9]{64}$/i.test(trimmedHash) ? '正确' : '错误');
      return [];
    }

    // 优先从 academic__data.ts 的统一缓存获取数据
    const unifiedCacheKey = `academic_results_data_${trimmedHash}`;
    const cachedAcademicData = getAcademicCache<AcademicResultRecord[]>(unifiedCacheKey);
    
    let academicResults: AcademicResultRecord[];
    
    if (cachedAcademicData) {
      console.log('从统一缓存获取学术成绩数据，记录数量:', cachedAcademicData.length);
      academicResults = cachedAcademicData;
    } else {
      // 缓存未命中，调用统一查询函数
      console.log('统一缓存未命中，调用 queryAcademicResults 查询数据');
      academicResults = await queryAcademicResults(trimmedHash);
      
      if (!academicResults || academicResults.length === 0) {
        console.log('未找到该学生的成绩数据，哈希值:', trimmedHash);
        return [];
      }
    }
    
    // 将 AcademicResultRecord[] 转换为 CourseResult[]
    // 注意：这里需要查询 Exam_Type 字段，但 academic__data.ts 的字段列表中没有包含
    // 为了保持兼容性，我们先转换已有字段，Exam_Type 设为默认值
    const courseResults: CourseResult[] = academicResults.map(record => {
      // 处理成绩：支持等级映射
      let grade: string | number = record.Grade || '无成绩';
      const gradeMapping: Record<string, number> = {
        '优': 95,
        '良': 85,
        '中': 75,
        '及格': 65,
        '不及格': 59,
      };
      
      if (typeof grade === 'string') {
        const raw = grade.trim();
        if (raw in gradeMapping) {
          grade = gradeMapping[raw];
        } else {
          const parsed = parseFloat(raw);
          if (!isNaN(parsed)) {
            grade = parsed;
          }
        }
      }
      
      return {
        id: `${record.Course_ID || 'unknown'}-${record.Semester_Offered || 'unknown'}`,
        course_name: record.Course_Name || '未知课程',
        course_id: record.Course_ID || '未知编号',
        grade: grade,
        credit: typeof record.Credit === 'number' 
          ? record.Credit 
          : parseFloat(String(record.Credit || '0')) || 0,
        semester: record.Semester_Offered || '未知学期',
        course_type: record.Course_Type || '未知类型',
        course_attribute: record.Course_Attribute || '未知属性',
        exam_type: '未知考试类型' // academic__data.ts 的字段列表中没有 Exam_Type，使用默认值
      };
    });

    console.log('成功转换数据，课程数量:', courseResults.length);
    
    return courseResults;
    
  } catch (error) {
    console.error('获取学生成绩时发生异常:', error);
    return [];
  }
}

// 计算仪表盘统计数据
export function calculateDashboardStats(results: CourseResult[]): DashboardStats {
  // 如果没有数据，返回默认值
  if (!results || results.length === 0) {
    return {
      averageScore: 0,
      passRate: 0,
      courseCount: 0,
      gpa: 0
    };
  }
  
  // 计算按学分加权的平均分
  const weightedItems = results
    .map(r => {
      const gradeNum = typeof r.grade === 'number' ? r.grade : parseFloat(String(r.grade));
      const creditNum = typeof r.credit === 'number' ? r.credit : parseFloat(String(r.credit));
      return { gradeNum, creditNum };
    })
    .filter(item => !isNaN(item.gradeNum) && !isNaN(item.creditNum) && item.creditNum > 0);
  
  const totalCreditsForAvg = weightedItems.reduce((sum, item) => sum + item.creditNum, 0);
  const weightedSum = weightedItems.reduce((sum, item) => sum + item.gradeNum * item.creditNum, 0);
  const averageScore = totalCreditsForAvg > 0 ? (weightedSum / totalCreditsForAvg) : 0;
  
  // 计算通过率（成绩大于等于60分或非数字成绩为"通过"、"良好"、"优秀"等）
  const passedCourses = results.filter(r => {
    if (typeof r.grade === 'number' || !isNaN(parseFloat(r.grade as string))) {
      const numGrade = typeof r.grade === 'number' ? r.grade : parseFloat(r.grade as string);
      return numGrade >= 60;
    } else {
      const strGrade = String(r.grade).toLowerCase();
      return !['不及格', '不通过', 'fail', 'failed'].some(term => strGrade.includes(term));
    }
  });
  
  const passRate = results.length > 0 ? passedCourses.length / results.length : 0;
  
  // 计算GPA
  const gpa = calculateGPA(results);
  
  return {
    averageScore: Math.round(averageScore * 100) / 100,
    passRate: Math.round(passRate * 100) / 100,
    courseCount: results.length,
    gpa: Math.round(gpa * 100) / 100
  };
}

// 获取最近的科目成绩
export async function getRecentSubjectGrades(results: CourseResult[], limit: number = 6, language: string = 'zh', major?: string, year?: string): Promise<SubjectGrade[]> {
  if (!results || results.length === 0) {
    return [];
  }
  
  // 按学期排序，获取最近的学期
  const sortedBySemester = [...results].sort((a, b) => {
    return b.semester.localeCompare(a.semester);
  });
  
  // 获取最近学期的课程
  const recentSemester = sortedBySemester[0].semester;
  const recentCourses = sortedBySemester.filter(r => r.semester === recentSemester);
  
  // 转换为SubjectGrade格式，支持课程名称翻译
  const subjectGrades: SubjectGrade[] = [];
  
  for (const course of recentCourses.slice(0, limit)) {
    let courseName = course.course_name;
    
    // 如果是英文模式，尝试获取英文翻译
    if (language === 'en') {
      try {
        courseName = await getCourseNameTranslation(course.course_name, major, year);
      } catch (error) {
        console.error('Error translating course name:', error);
        // 如果翻译失败，使用原中文名称
        courseName = course.course_name;
      }
    }
    
    subjectGrades.push({
      name: courseName,
    grade: course.grade,
    average: Math.round((parseFloat(course.grade as string) * 0.9 + Math.random() * 10) * 10) / 10, // 模拟平均分
    credit: course.credit
    });
  }
  
  return subjectGrades;
}

// 获取最新学期中学分最高的课程（用于数据总览页面）
export function getLatestSemesterTopCreditCourses(results: CourseResult[], limit: number = 5): SubjectGrade[] {
  if (!results || results.length === 0) {
    return [];
  }
  
  // 按学期排序，获取最近的学期
  const sortedBySemester = [...results].sort((a, b) => {
    return b.semester.localeCompare(a.semester);
  });
  
  // 获取所有不同的学期，按时间倒序排列
  const uniqueSemesters = [...new Set(sortedBySemester.map(r => r.semester))].sort((a, b) => b.localeCompare(a));
  
  const selectedCourses: CourseResult[] = [];
  
  // 从最新学期开始，逐个学期选择课程，直到凑够limit门课程
  for (const semester of uniqueSemesters) {
    if (selectedCourses.length >= limit) break;
    
    // 获取当前学期的所有课程
    const semesterCourses = sortedBySemester.filter(r => r.semester === semester);
    
    // 按学分从高到低排序
    const sortedSemesterCourses = semesterCourses.sort((a, b) => {
      const creditA = typeof a.credit === 'number' ? a.credit : parseFloat(String(a.credit)) || 0;
      const creditB = typeof b.credit === 'number' ? b.credit : parseFloat(String(b.credit)) || 0;
      return creditB - creditA;
    });
    
    // 从当前学期选择课程，优先选择学分高的
    for (const course of sortedSemesterCourses) {
      if (selectedCourses.length >= limit) break;
      
      // 检查是否已经选择了这门课程（避免重复）
      const isDuplicate = selectedCourses.some(selected => 
        selected.course_name === course.course_name && 
        selected.semester === course.semester
      );
      
      if (!isDuplicate) {
        selectedCourses.push(course);
      }
    }
  }
  
  // 转换为SubjectGrade格式
  const subjectGrades: SubjectGrade[] = selectedCourses.map(course => {
    const gradeValue = typeof course.grade === 'number' ? course.grade : parseFloat(String(course.grade)) || 0;
    const creditValue = typeof course.credit === 'number' ? course.credit : parseFloat(String(course.credit)) || 0;
    
    return {
      name: course.course_name,
      grade: course.grade,
      average: Math.round((gradeValue * 0.9 + Math.random() * 10) * 10) / 10, // 模拟平均分
      credit: creditValue
    };
  });
  
  return subjectGrades;
}

// 获取课程类型统计
export function getCourseTypeStats(results: CourseResult[]): CourseTypeStats[] {
  if (!results || results.length === 0) {
    return [];
  }
  
  // 按课程类型分组
  const courseTypeMap = new Map<string, { count: number; totalScore: number }>();
  
  results.forEach(course => {
    const type = course.course_type || '其他';
    const score = typeof course.grade === 'number' 
      ? course.grade 
      : (!isNaN(parseFloat(course.grade as string)) ? parseFloat(course.grade as string) : 0);
    
    if (!courseTypeMap.has(type)) {
      courseTypeMap.set(type, { count: 0, totalScore: 0 });
    }
    
    const current = courseTypeMap.get(type)!;
    current.count++;
    current.totalScore += score;
  });
  
  // 转换为数组并计算平均分
  return Array.from(courseTypeMap.entries())
    .map(([type, { count, totalScore }]) => ({
      type,
      count,
      averageScore: count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

// 获取学期成绩趋势
export function getSemesterTrends(results: CourseResult[]): SemesterTrend[] {
  if (!results || results.length === 0) {
    return [];
  }
  
  // 按学期分组
  const semesterMap = new Map<string, { totalScore: number; courseCount: number }>();
  
  results.forEach(course => {
    const semester = course.semester;
    const score = typeof course.grade === 'number' 
      ? course.grade 
      : (!isNaN(parseFloat(course.grade as string)) ? parseFloat(course.grade as string) : 0);
    
    if (!semesterMap.has(semester)) {
      semesterMap.set(semester, { totalScore: 0, courseCount: 0 });
    }
    
    const current = semesterMap.get(semester)!;
    current.courseCount++;
    current.totalScore += score;
  });
  
  // 转换为数组并计算平均分
  return Array.from(semesterMap.entries())
    .map(([semester, { totalScore, courseCount }]) => ({
      semester,
      average: courseCount > 0 ? Math.round((totalScore / courseCount) * 100) / 100 : 0,
      courseCount
    }))
    .sort((a, b) => b.semester.localeCompare(a.semester));
}

/**
 * 获取前X%学生的GPA门槛值
 * @param percentage 百分比 (10, 20, 30等)
 * @returns GPA门槛值，如果无数据则返回null
 * 
 * ⚠️ 已禁用：为了降低查询流量，此函数已暂时禁用数据库查询
 * 如需启用，请取消注释下方的查询代码
 */
export async function getTopPercentageGPAThreshold(percentage: number): Promise<number | null> {
  try {
    // 边界检查
    if (percentage <= 0) return null
    
    // ⚠️ 已禁用：直接返回 null，避免执行数据库查询
    // 这样可以降低 dashboard 加载时的查询流量
    return null
    
    /* 已注释的数据库查询代码 - 如需启用请取消注释
    // 获取所有学生的GPA数据
    const { data: results, error } = await supabase
      .from('academic_results')
      .select('"SNH", "Grade", "Credit"')
      .not('"Grade"', 'is', null)
      .not('"Grade"', 'eq', '')
      .not('"SNH"', 'is', null)

    if (error) {
      console.error('Error fetching GPA threshold data:', error)
      return null
    }

    if (!results || results.length === 0) {
      return null
    }

    // 按学生分组计算每个学生的GPA
    const studentGPAs = new Map<string, Array<{grade: string | null, credit: string | null}>>()
    
    results.forEach(result => {
      const studentId = result.SNH
      if (!studentGPAs.has(studentId)) {
        studentGPAs.set(studentId, [])
      }
      studentGPAs.get(studentId)!.push({
        grade: result.Grade,
        credit: result.Credit
      })
    })

    // 计算每个学生的GPA
    const studentGPAList: Array<{studentId: string, gpa: number}> = []
    
    for (const [studentId, courses] of studentGPAs) {
      // 转换为CourseResult格式来计算GPA
      const courseResults = courses
        .filter(course => course.grade !== null && course.credit !== null)
        .map(course => ({
          grade: course.grade!,
          credit: parseFloat(course.credit || '0')
        }))
        .filter(course => course.credit > 0)
      
      const gpa = calculateGPA(courseResults)
      if (gpa > 0) { // 只包含有效GPA的学生
        studentGPAList.push({ studentId, gpa })
      }
    }

    if (studentGPAList.length === 0) {
      return null
    }

    // 如果百分比大于等于100%，返回最低GPA
    if (percentage >= 100) {
      return Math.min(...studentGPAList.map(s => s.gpa))
    }

    // 计算需要的人数
    const targetCount = Math.ceil(studentGPAList.length * (percentage / 100))
    const actualCount = Math.min(targetCount, studentGPAList.length)

    // 按GPA从高到低排序
    const sortedStudents = studentGPAList.sort((a, b) => b.gpa - a.gpa)

    // 返回前N名中最后一名的GPA（即门槛值）
    return sortedStudents[actualCount - 1].gpa
    */

  } catch (error) {
    console.error('Error calculating GPA threshold:', error)
    return null
  }
}

// 雷达图数据接口
export interface RadarChartData {
  subject: string
  knowledge: number      // 知识掌握
  application: number    // 应用能力
  analysis: number       // 分析能力
  synthesis: number      // 综合能力
  evaluation: number     // 评价能力
  fullMark: number
}

// 获取所有科目成绩（用于grades页面）
export async function getSubjectGrades(studentHash: string, language: string = 'zh', major?: string, year?: string) {
  try {
    console.log('开始获取科目成绩，哈希值:', studentHash);
    
    // 验证哈希值格式
    if (!studentHash || studentHash.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentHash)) {
      console.error('无效的哈希值格式，必须是64位十六进制字符串:', studentHash);
      return [];
    }
    
    // 直接使用重构后的getStudentResults函数
    // 注意：getStudentResults 现在使用 academic__data.ts 的统一缓存
    const results = await getStudentResults(studentHash);
    
    if (!results || results.length === 0) {
      console.log('未找到科目成绩数据');
      return [];
    }
    
    console.log('找到科目成绩数据，数量:', results.length);
    
    // 按学期倒序排序：学期越靠后，位置越靠前
    const sortedResults = [...results].sort((a, b) => {
      return b.semester.localeCompare(a.semester);
    });
    
    // 如果需要英文翻译，可以在这里处理
    // 目前直接返回排序后的数据
    return sortedResults;
    
  } catch (error) {
    console.error('获取科目成绩时发生异常:', error);
    return [];
  }
}

// 获取雷达图数据
export async function getRadarChartData(courseName: string): Promise<RadarChartData | null> {
  try {
    // 这里可以根据需要实现具体的雷达图数据逻辑
    // 暂时返回模拟数据，包含更多维度的评估
    return {
      subject: courseName,
      knowledge: Math.floor(Math.random() * 30) + 70,      // 知识掌握 70-100
      application: Math.floor(Math.random() * 30) + 70,    // 应用能力 70-100
      analysis: Math.floor(Math.random() * 30) + 70,       // 分析能力 70-100
      synthesis: Math.floor(Math.random() * 30) + 70,      // 综合能力 70-100
      evaluation: Math.floor(Math.random() * 30) + 70,     // 评价能力 70-100
      fullMark: 100
    }
  } catch (error) {
    console.error('Error getting radar chart data:', error)
    return null
  }
}

// 获取学生信息（年级和专业）
export async function getStudentInfo(studentHash: string): Promise<{ year: string; major: string } | null> {
  try {
    console.log('开始获取学生信息，哈希值:', studentHash);
    
    // 验证哈希值格式
    if (!studentHash || studentHash.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentHash)) {
      console.error('无效的哈希值格式，必须是64位十六进制字符串:', studentHash);
      return null;
    }
    
    const { data: results, error } = await supabase
      .from('academic_results')
      .select('"Semester_Offered", "Current_Major"')
      .eq('"SNH"', studentHash)
      .limit(1);

    if (error) {
      console.error('查询学生信息时出错:', error)
      console.error('完整错误对象:', JSON.stringify(error, null, 2))
      console.error('错误代码:', error.code)
      console.error('错误消息:', error.message)
      console.error('错误详情:', error.details)
      return null;
    }

    if (!results || results.length === 0) {
      console.log('未找到该学生的信息，哈希值:', studentHash);
      return null;
    }

    const result = results[0];
    console.log('找到学生信息:', result);
    
    // 从学期信息提取年级
    // 例如: "2020-2021-1" -> "2020级"
    const semester = result.Semester_Offered;
    let year = '';
    if (semester && semester.includes('-')) {
      const yearPart = semester.split('-')[0];
      year = `${yearPart}级`;
    }
    
    // 获取专业信息
    const major = result.Current_Major || '未知专业';
    
    const studentInfo = { year, major };
    console.log('学生信息处理结果:', studentInfo);
    
    return studentInfo;
  } catch (error) {
    console.error('获取学生信息时发生异常:', error);
    return null;
  }
}

// 获取课程名称的英文翻译
export async function getCourseNameTranslation(courseName: string, major?: string, year?: string): Promise<string> {
  try {
    // 构建查询条件
    let query = supabase
      .from('courses_translations')
      .select('Course_Name_Eng')
      .eq('Course_Name_Chi', courseName);

    // 如果有专业信息，添加到查询条件
    if (major) {
      query = query.eq('Major', major);
    }

    // 如果有年级信息，添加到查询条件
    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query.single();

    if (error) {
      // 如果没有找到翻译，返回原中文名称
      return courseName;
    }

    // 如果找到英文翻译，返回英文名称
    return data.Course_Name_Eng || courseName;
  } catch (error) {
    console.error('Error getting course name translation:', error);
    return courseName;
  }
}

// 获取用户概率预测数据
export async function getUserProbabilityData(studentId: string): Promise<{
  proba_1: number;
  proba_2: number;
  proba_3: number;
  year?: number;
} | null> {
  try {
    // 如果输入的是64位哈希值，直接使用；否则进行哈希处理
    let studentHash = studentId;
    if (studentId.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentId)) {
      studentHash = await sha256(studentId);
    }
    console.log('查询概率数据:', { studentId, studentHash })
    
    const { data, error } = await supabase
      .from('cohort_probability')
      .select('"proba_1", "proba_2", "proba_3", "year"')
      .eq('"SNH"', studentHash)
      .single();

    if (error) {
      // 如果是"未找到记录"的错误，这是正常的，不需要报错
      if (error.code === 'PGRST116') {
        console.log('数据库中未找到该学生的概率数据，将使用默认值');
        return null;
      }
      console.error('Supabase查询错误:', error);
      return null;
    }

    if (!data) {
      console.log('未找到概率数据，学生哈希值:', studentHash);
      return null;
    }

    console.log('找到概率数据:', data);
    return {
      proba_1: data.proba_1,
      proba_2: data.proba_2,
      proba_3: data.proba_3,
      year: data.year
    };
  } catch (error) {
    console.error('Error in getUserProbabilityData:', error);
    return null;
  }
}