/**
 * 北邮GPA计算工具函数
 * 
 * 官方算法: 绩点成绩 = 4 - 3 * (100-X)^2 / 1600 (60≦X≦100)
 * - 100分绩点为4
 * - 60分绩点为1  
 * - 60分以下绩点为0
 */

// 将成绩转换为分数
export function convertGradeToScore(grade: string | null): number | null {
  if (!grade) return null
  
  const trimmedGrade = grade.trim().toLowerCase()
  
  // 如果已经是数字，直接返回
  if (!isNaN(Number(trimmedGrade))) {
    const score = Number(trimmedGrade)
    return score >= 0 && score <= 100 ? score : null
  }
  
  // 处理常见的等级制成绩
  if (trimmedGrade === 'a+' || trimmedGrade === 'a＋' || trimmedGrade === '优秀') return 95
  if (trimmedGrade === 'a' || trimmedGrade === '优') return 90
  if (trimmedGrade === 'a-' || trimmedGrade === 'a－') return 85
  if (trimmedGrade === 'b+' || trimmedGrade === 'b＋' || trimmedGrade === '良好') return 85
  if (trimmedGrade === 'b' || trimmedGrade === '良') return 80
  if (trimmedGrade === 'b-' || trimmedGrade === 'b－') return 75
  if (trimmedGrade === 'c+' || trimmedGrade === 'c＋' || trimmedGrade === '中等') return 75
  if (trimmedGrade === 'c' || trimmedGrade === '中') return 70
  if (trimmedGrade === 'c-' || trimmedGrade === 'c－') return 65
  if (trimmedGrade === 'd+' || trimmedGrade === 'd＋') return 65
  if (trimmedGrade === 'd' || trimmedGrade === '及格' || trimmedGrade === '通过' || trimmedGrade === 'pass') return 60
  if (trimmedGrade === 'd-' || trimmedGrade === 'd－') return 60
  if (trimmedGrade === 'f' || trimmedGrade === '不及格' || trimmedGrade === '不通过' || trimmedGrade === 'fail') return 50
  
  // 无法识别的成绩格式
  return null
}

// 北邮GPA计算方法
export function calculateBUPTGPA(score: number): number {
  if (score >= 90) return 4.0
  if (score >= 85) return 3.7
  if (score >= 82) return 3.3
  if (score >= 78) return 3.0
  if (score >= 75) return 2.7
  if (score >= 72) return 2.3
  if (score >= 68) return 2.0
  if (score >= 64) return 1.5
  if (score >= 60) return 1.0
  return 0.0
}

// 处理课程成绩数据
export function processCourseGrades(courses: Array<{grade: string | null, credit: string | null}>) {
  return courses.map(course => {
    const numericScore = convertGradeToScore(course.grade)
    const credit = course.credit ? parseFloat(course.credit) : 1
    return {
      numericScore,
      credit: isNaN(credit) ? 1 : credit
    }
  }).filter(course => course.numericScore !== null)
}

// 计算学分加权平均分
export function calculateWeightedAverage(courses: Array<{grade: string | null, credit: string | null}>): number {
  const processedCourses = processCourseGrades(courses)
  
  if (processedCourses.length === 0) return 0
  
  const totalCredits = processedCourses.reduce((sum, course) => sum + course.credit, 0)
  const weightedSum = processedCourses.reduce((sum, course) => {
    return sum + (course.numericScore! * course.credit)
  }, 0)
  
  return totalCredits > 0 ? weightedSum / totalCredits : 0
}

// 计算学分加权GPA
export function calculateWeightedGPA(courses: Array<{grade: string | null, credit: string | null}>): number {
  const processedCourses = processCourseGrades(courses)
  
  if (processedCourses.length === 0) return 0
  
  const totalCredits = processedCourses.reduce((sum, course) => sum + course.credit, 0)
  const weightedSum = processedCourses.reduce((sum, course) => {
    const gpaPoints = calculateBUPTGPA(course.numericScore!)
    return sum + (gpaPoints * course.credit)
  }, 0)
  
  return totalCredits > 0 ? weightedSum / totalCredits : 0
}

/**
 * 计算GPA - 适用于CourseResult接口
 * @param courses 课程结果数组
 * @returns 计算得到的GPA
 */
export function calculateGPA(courses: Array<{grade: string | number, credit: number}>): number {
  if (!courses || courses.length === 0) return 0;
  
  const processedCourses = courses.map(course => {
    // 处理数字或字符串类型的成绩
    let numericScore: number | null = null;
    
    if (typeof course.grade === 'number') {
      numericScore = course.grade;
    } else if (typeof course.grade === 'string') {
      numericScore = convertGradeToScore(course.grade);
    }
    
    return {
      numericScore,
      credit: course.credit
    };
  }).filter(course => course.numericScore !== null);
  
  if (processedCourses.length === 0) return 0;
  
  const totalCredits = processedCourses.reduce((sum, course) => sum + course.credit, 0);
  const weightedSum = processedCourses.reduce((sum, course) => {
    const gpaPoints = calculateBUPTGPA(course.numericScore!);
    return sum + (gpaPoints * course.credit);
  }, 0);
  
  return totalCredits > 0 ? weightedSum / totalCredits : 0;
}