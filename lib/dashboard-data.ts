import { supabase } from './supabase'

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
  gpaPoint: number
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

    const validResults = results.filter(r => r.Grade && !isNaN(parseFloat(r.Grade)))
    const totalCourses = validResults.length
    const completedCourses = validResults.filter(r => parseFloat(r.Grade) >= 60).length
    
    const totalScore = validResults.reduce((sum, r) => sum + parseFloat(r.Grade), 0)
    const averageGrade = totalCourses > 0 ? totalScore / totalCourses : 0
    
    const gpaPoints = validResults.reduce((sum, r) => {
      const score = parseFloat(r.Grade)
      const credit = parseFloat(r.Credit || '1')
      let gpa = 0
      
      if (score >= 60) {
        gpa = 4 - 3 * Math.pow(100 - score, 2) / 1600
        gpa = Math.round(gpa * 100) / 100
      } else {
        gpa = 0
      }
      
      return sum + (gpa * credit)
    }, 0)

    const totalCredits = validResults.reduce((sum, r) => sum + parseFloat(r.Credit || '1'), 0)
    const finalGPA = totalCredits > 0 ? gpaPoints / totalCredits : 0

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
      .filter(r => r.Course_Name && r.Grade && !isNaN(parseFloat(r.Grade)))
      .map(r => {
        const score = parseFloat(r.Grade)
        let grade = 'F'
        let gpaPoint = 0
        
        if (score >= 60) {
          gpaPoint = 4 - 3 * Math.pow(100 - score, 2) / 1600
          gpaPoint = Math.round(gpaPoint * 100) / 100
        }
        
        if (score >= 95) grade = 'A+'
        else if (score >= 90) grade = 'A'
        else if (score >= 85) grade = 'B+'
        else if (score >= 80) grade = 'B'
        else if (score >= 75) grade = 'C+'
        else if (score >= 70) grade = 'C'
        else if (score >= 60) grade = 'D'
        
        return {
          subject: r.Course_Name,
          score: Math.round(score),
          grade,
          gpaPoint
        }
      })
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
      const grade = parseFloat(result.Grade || '0')
      
      if (!acc[semester]) {
        acc[semester] = { scores: [], totalCourses: 0 }
      }
      
      if (!isNaN(grade)) {
        acc[semester].scores.push(grade)
        acc[semester].totalCourses++
      }
      
      return acc
    }, {} as Record<string, { scores: number[], totalCourses: number }>)

    return Object.entries(groupedBySemester)
      .map(([semester, data]) => ({
        semester,
        averageScore: data.scores.length > 0 
          ? Math.round((data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length) * 10) / 10
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
      const grade = parseFloat(result.Grade || '0')
      
      if (!acc[category]) {
        acc[category] = { scores: [], count: 0 }
      }
      
      if (!isNaN(grade)) {
        acc[category].scores.push(grade)
        acc[category].count++
      }
      
      return acc
    }, {} as Record<string, { scores: number[], count: number }>)

    return Object.entries(groupedByCategory)
      .map(([category, data]) => ({
        category,
        count: data.count,
        averageGrade: data.scores.length > 0 
          ? Math.round((data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length) * 10) / 10
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  } catch (error) {
    console.error('Error fetching course categories:', error)
    return []
  }
}