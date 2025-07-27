import { supabase } from './supabase'
import { calculateGPA } from './gpa-calculator'
import { sha256 } from './utils'

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

// 获取学生成绩数据
export async function getStudentResults(studentHash: string): Promise<CourseResult[]> {
  try {
    // 直接使用哈希值查询
    const { data: results, error } = await supabase
      .from('academic_results')
      .select('*')
      .eq('SNH', studentHash)
      .order('Semester_Offered', { ascending: true });

    if (error) {
      console.error('Error fetching student results:', error);
      return [];
    }

    if (!results || results.length === 0) {
      return [];
    }
    
    // 转换数据格式
    return results.map(result => ({
      id: result.id || `${result.Course_ID}-${result.Semester_Offered}`,
      course_name: result.Course_Name,
      course_id: result.Course_ID,
      grade: result.Grade,
      credit: parseFloat(result.Credit) || 0,
      semester: result.Semester_Offered,
      course_type: result.Course_Type || '未知',
      course_attribute: result.Course_Attribute,
      exam_type: result.Exam_Type
    }));
  } catch (error) {
    console.error('Error in getStudentResults:', error);
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
  
  // 计算数值型成绩的平均分
  const numericGrades = results
    .filter(r => typeof r.grade === 'number' || !isNaN(parseFloat(r.grade as string)))
    .map(r => typeof r.grade === 'number' ? r.grade : parseFloat(r.grade as string));
  
  const averageScore = numericGrades.length > 0
    ? numericGrades.reduce((sum, grade) => sum + grade, 0) / numericGrades.length
    : 0;
  
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
    .sort((a, b) => a.semester.localeCompare(b.semester));
}

/**
 * 获取前X%学生的GPA门槛值
 * @param percentage 百分比 (10, 20, 30等)
 * @returns GPA门槛值，如果无数据则返回null
 */
export async function getTopPercentageGPAThreshold(percentage: number): Promise<number | null> {
  try {
    // 边界检查
    if (percentage <= 0) return null
    
    // 获取所有学生的GPA数据
    const { data: results, error } = await supabase
      .from('academic_results')
      .select('SNH, Grade, Credit')
      .not('Grade', 'is', null)
      .not('Grade', 'eq', '')
      .not('SNH', 'is', null)

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

  } catch (error) {
    console.error('Error calculating GPA threshold:', error)
    return null
  }
}

// 雷达图数据接口
export interface RadarChartData {
  subject: string
  A: number
  B: number
  fullMark: number
}

// 获取所有科目成绩（用于grades页面）
export async function getSubjectGrades(studentHash: string, language: string = 'zh', major?: string, year?: string) {
  try {
    const results = await getStudentResults(studentHash)
    const grades = []
    
    for (const result of results) {
      let courseName = result.course_name;
      
      // 如果是英文模式，尝试获取英文翻译
      if (language === 'en') {
        try {
          courseName = await getCourseNameTranslation(result.course_name, major, year);
        } catch (error) {
          console.error('Error translating course name:', error);
          // 如果翻译失败，使用原中文名称
          courseName = result.course_name;
        }
      }
      
      grades.push({
      id: result.id,
        course_name: courseName,
      course_id: result.course_id,
      grade: result.grade,
      credit: result.credit,
      semester: result.semester,
      course_type: result.course_type,
      course_attribute: result.course_attribute,
      exam_type: result.exam_type
      })
    }
    
    return grades
  } catch (error) {
    console.error('Error getting subject grades:', error)
    return []
  }
}

// 获取雷达图数据
export async function getRadarChartData(courseName: string): Promise<RadarChartData | null> {
  try {
    // 这里可以根据需要实现具体的雷达图数据逻辑
    // 暂时返回模拟数据
    return {
      subject: courseName,
      A: 80,
      B: 90,
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
    const { data: results, error } = await supabase
      .from('academic_results')
      .select('Semester_Offered, Current_Major')
      .eq('SNH', studentHash)
      .limit(1);

    if (error || !results || results.length === 0) {
      console.error('Error fetching student info:', error);
      return null;
    }

    const result = results[0];
    
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
    
    return { year, major };
  } catch (error) {
    console.error('Error in getStudentInfo:', error);
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
      .select('proba_1, proba_2, proba_3')
      .eq('SNH', studentHash)
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
      proba_3: data.proba_3
    };
  } catch (error) {
    console.error('Error in getUserProbabilityData:', error);
    return null;
  }
}