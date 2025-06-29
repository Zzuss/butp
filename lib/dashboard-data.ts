import { supabase } from './supabase'
import { 
  convertGradeToScore, 
  calculateWeightedAverage, 
  calculateWeightedGPA,
  processCourseGrades 
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
}

export interface ProgressData {
  semester: string
  averageScore: number
  totalCourses: number
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
      .select('Course_Name, Grade')
      .not('Course_Name', 'is', null)
      .not('Grade', 'is', null)
      .eq('SNH', studentId)
    
    const { data: results } = await query.limit(limit)

    if (!results) return []

    return results
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
          grade
        }
      })
      .filter(item => item !== null) as SubjectGrade[]
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