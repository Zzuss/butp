import { supabase } from './supabase'
import { 
  convertGradeToScore, 
  calculateWeightedAverage, 
  calculateWeightedGPA,
  processCourseGrades,
  calculateBUPTGPA
} from './gpa-calculator'

export interface DashboardStats {
  averageGrade: number
  totalCourses: number
  completedCourses: number
  gpaPoints: number
}

export interface SubjectGrade {
  subject: string
  score: number
  grade: string
  gpa: number
  credit: number
  courseId?: string
}

export interface ProgressData {
  semester: string
  averageScore: number
  totalCourses: number
}

export interface RadarChartData {
  [key: string]: number
  数理逻辑与科学基础: number
  专业核心技术: number
  人文与社会素养: number
  工程实践与创新应用: number
  职业发展与团队协作: number
}

export async function getDashboardStats(studentId: string): Promise<DashboardStats> {
  try {
    const query = supabase
      .from('academic_results')
      .select('Grade, Credit')
      .not('Grade', 'is', null)
      .eq('SNH', studentId)
    
    const { data: results } = await query

    if (!results || results.length === 0) {
      return {
        averageGrade: 0,
        totalCourses: 0,
        completedCourses: 0,
        gpaPoints: 0
      }
    }

    // 转换数据格式以适配GPA计算函数
    const coursesForGPA = results.map(r => ({
      grade: r.Grade,
      credit: r.Credit
    }))
    
    // 使用新的GPA计算函数处理所有课程
    const processedCourses = processCourseGrades(coursesForGPA)
    const totalCourses = processedCourses.length
    
    // 计算通过课程数（60分及以上）
    const completedCourses = processedCourses.filter(course => 
      course.numericScore !== null && course.numericScore >= 60
    ).length
    
    // 使用学分加权平均分
    const averageGrade = calculateWeightedAverage(coursesForGPA)
    
    // 使用北邮官方GPA算法
    const finalGPA = calculateWeightedGPA(coursesForGPA)

    return {
      averageGrade: Math.round(averageGrade * 10) / 10,
      totalCourses,
      completedCourses,
      gpaPoints: Math.round(finalGPA * 100) / 100
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      averageGrade: 0,
      totalCourses: 0,
      completedCourses: 0,
      gpaPoints: 0
    }
  }
}

export async function getSubjectGrades(studentId: string, limit = 6): Promise<SubjectGrade[]> {
  try {
    const query = supabase
      .from('academic_results')
      .select('Course_Name, Course_ID, Grade, Credit')
      .not('Course_Name', 'is', null)
      .not('Grade', 'is', null)
      .eq('SNH', studentId)
    
    const { data: results } = limit ? await query.limit(limit) : await query

    if (!results) return []

    const processedResults = results
      .filter(r => r.Course_Name && r.Grade)
      .map(r => {
        const numericScore = convertGradeToScore(r.Grade)
        
        if (numericScore === null) {
          return null
        }
        
        let grade = 'F'
        if (numericScore >= 95) grade = 'A+'
        else if (numericScore >= 90) grade = 'A'
        else if (numericScore >= 85) grade = 'B+'
        else if (numericScore >= 80) grade = 'B'
        else if (numericScore >= 75) grade = 'C+'
        else if (numericScore >= 70) grade = 'C'
        else if (numericScore >= 60) grade = 'D'
        
        return {
          subject: r.Course_Name,
          score: Math.round(numericScore),
          grade,
          gpa: Math.round(calculateBUPTGPA(numericScore) * 100) / 100,
          credit: parseFloat(r.Credit) || 1, // 解析学分，如果为空则默认为1
          courseId: r.Course_ID
        }
      })
      .filter(item => item !== null) as SubjectGrade[]
    
    // 按照分数从高到低排序
    return processedResults.sort((a, b) => b.score - a.score).slice(0, limit)
  } catch (error) {
    console.error('Error fetching subject grades:', error)
    return []
  }
}

export async function getProgressData(studentId: string): Promise<ProgressData[]> {
  try {
    const query = supabase
      .from('academic_results')
      .select('Semester_Offered, Grade, Course_Name')
      .not('Semester_Offered', 'is', null)
      .not('Grade', 'is', null)
      .eq('SNH', studentId)
      .order('Semester_Offered', { ascending: true })
    
    const { data: results } = await query

    if (!results) return []

    const groupedBySemester = results.reduce((acc, result) => {
      const semester = result.Semester_Offered
      const numericScore = convertGradeToScore(result.Grade)
      
      if (!acc[semester]) {
        acc[semester] = { scores: [], totalCourses: 0, courses: [] }
      }
      
      if (numericScore !== null) {
        acc[semester].scores.push(numericScore)
        acc[semester].totalCourses++
        acc[semester].courses.push({
          grade: result.Grade,
          credit: '1' // 默认学分，实际应该从数据库获取
        })
      }
      
      return acc
    }, {} as Record<string, { scores: number[], totalCourses: number, courses: Array<{grade: string | null, credit: string}> }>)

    return Object.entries(groupedBySemester)
      .map(([semester, data]) => ({
        semester,
        averageScore: data.courses.length > 0 
          ? Math.round(calculateWeightedAverage(data.courses) * 10) / 10
          : 0,
        totalCourses: data.totalCourses
      }))
      .slice(0, 8)
  } catch (error) {
    console.error('Error fetching progress data:', error)
    return []
  }
}

export async function getCourseCategories(studentId: string): Promise<{ category: string, count: number, averageGrade: number }[]> {
  try {
    const query = supabase
      .from('academic_results')
      .select('Course_Type, Grade')
      .not('Course_Type', 'is', null)
      .not('Grade', 'is', null)
      .eq('SNH', studentId)
    
    const { data: results } = await query

    if (!results) return []

    const groupedByCategory = results.reduce((acc, result) => {
      const category = result.Course_Type || '其他'
      const numericScore = convertGradeToScore(result.Grade)
      
      if (!acc[category]) {
        acc[category] = { scores: [], count: 0, courses: [] }
      }
      
      if (numericScore !== null) {
        acc[category].scores.push(numericScore)
        acc[category].count++
        acc[category].courses.push({
          grade: result.Grade,
          credit: '1' // 默认学分，实际应该从数据库获取
        })
      }
      
      return acc
    }, {} as Record<string, { scores: number[], count: number, courses: Array<{grade: string | null, credit: string}> }>)

    return Object.entries(groupedByCategory)
      .map(([category, data]) => ({
        category,
        count: data.count,
        averageGrade: data.courses.length > 0 
          ? Math.round(calculateWeightedAverage(data.courses) * 10) / 10
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  } catch (error) {
    console.error('Error fetching course categories:', error)
    return []
  }
}

/**
 * 获取雷达图数据
 * 
 * 当前使用模拟数据，因为radarchart_result表启用了RLS但没有访问策略
 * 
 * 要启用真实数据访问，需要数据库管理员执行以下任一操作：
 * 1. 禁用RLS：ALTER TABLE radarchart_result DISABLE ROW LEVEL SECURITY;
 * 2. 添加访问策略：CREATE POLICY "Allow read access" ON radarchart_result FOR SELECT TO public USING (true);
 */
export async function getRadarChartData(courseId: string): Promise<RadarChartData | null> {
  try {
    // 从真实数据库获取数据
    const { data, error } = await supabase
      .from('radarchart_result')
      .select('数理逻辑与科学基础, 专业核心技术, 人文与社会素养, 工程实践与创新应用, 职业发展与团队协作')
      .eq('course_id', courseId)
      .limit(1)

    if (!error && data && data.length > 0) {
      const firstRecord = data[0] as any
      return {
        数理逻辑与科学基础: Number(firstRecord['数理逻辑与科学基础'].toFixed(3)),
        专业核心技术: Number(firstRecord['专业核心技术'].toFixed(3)),
        人文与社会素养: Number(firstRecord['人文与社会素养'].toFixed(3)),
        工程实践与创新应用: Number(firstRecord['工程实践与创新应用'].toFixed(3)),
        职业发展与团队协作: Number(firstRecord['职业发展与团队协作'].toFixed(3))
      }
    }
    
    // 如果没有找到数据，返回null
    return null
  } catch (error) {
    console.error('Error in getRadarChartData:', error)
    return null
  }
}