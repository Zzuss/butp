/**
 * 北邮GPA计算工具函数
 * 
 * 官方算法: 绩点成绩 = 4 - 3 * (100-X)^2 / 1600 (60≦X≦100)
 * - 100分绩点为4
 * - 60分绩点为1  
 * - 60分以下绩点为0
 */

// 等级制成绩到百分制的转换表
const gradeToScoreMap: Record<string, number> = {
  '优秀': 95,
  '优': 95,
  '良好': 85,
  '良': 85,
  '中等': 75,
  '中': 75,
  '及格': 65,
  '合格': 65,
  '不及格': 50,
  '不合格': 50,
  '通过': 75,
  '未通过': 50,
  '免修': 85,  // 免修按良好处理
}

/**
 * 将成绩转换为百分制分数
 * @param grade 成绩（可能是数字或等级）
 * @returns 百分制分数，如果无法转换则返回null
 */
export function convertGradeToScore(grade: string | null): number | null {
  if (!grade || grade.trim() === '') {
    return null
  }

  const cleanGrade = grade.trim()
  
  // 尝试解析为数字
  const numericScore = parseFloat(cleanGrade)
  if (!isNaN(numericScore)) {
    // 确保分数在合理范围内
    if (numericScore >= 0 && numericScore <= 100) {
      return numericScore
    }
    return null
  }

  // 查找等级制对应分数
  if (cleanGrade in gradeToScoreMap) {
    return gradeToScoreMap[cleanGrade]
  }

  // 处理一些常见的变体
  const normalizedGrade = cleanGrade
    .replace(/[（）()]/g, '') // 移除括号
    .replace(/\s+/g, '') // 移除空格
  
  if (normalizedGrade in gradeToScoreMap) {
    return gradeToScoreMap[normalizedGrade]
  }

  return null
}

/**
 * 使用北邮官方公式计算GPA绩点
 * @param score 百分制成绩
 * @returns GPA绩点 (0-4.0)
 */
export function calculateBUPTGPA(score: number): number {
  if (score < 60) {
    return 0
  }
  
  if (score > 100) {
    return 4.0
  }

  // 北邮公式: 绩点成绩 = 4 - 3 * (100-X)^2 / 1600
  const gpa = 4 - 3 * Math.pow(100 - score, 2) / 1600
  
  // 确保结果在合理范围内
  return Math.max(0, Math.min(4.0, gpa))
}

/**
 * 计算学分加权平均分
 * @param courses 课程数组，包含成绩和学分
 * @returns 加权平均分
 */
export function calculateWeightedAverage(courses: Array<{grade: string | null, credit: string | null}>): number {
  let totalWeightedScore = 0
  let totalCredits = 0

  for (const course of courses) {
    const score = convertGradeToScore(course.grade)
    const credit = parseFloat(course.credit || '0')

    if (score !== null && credit > 0) {
      totalWeightedScore += score * credit
      totalCredits += credit
    }
  }

  return totalCredits > 0 ? totalWeightedScore / totalCredits : 0
}

/**
 * 计算学分加权GPA
 * @param courses 课程数组，包含成绩和学分
 * @returns 加权GPA
 */
export function calculateWeightedGPA(courses: Array<{grade: string | null, credit: string | null}>): number {
  let totalGpaPoints = 0
  let totalCredits = 0

  for (const course of courses) {
    const score = convertGradeToScore(course.grade)
    const credit = parseFloat(course.credit || '0')

    if (score !== null && credit > 0) {
      const gpa = calculateBUPTGPA(score)
      totalGpaPoints += gpa * credit
      totalCredits += credit
    }
  }

  return totalCredits > 0 ? totalGpaPoints / totalCredits : 0
}

/**
 * 批量转换成绩信息
 * @param courses 课程数组
 * @returns 包含转换后分数和GPA的课程信息
 */
export function processCourseGrades(courses: Array<{grade: string | null, credit: string | null}>) {
  return courses.map(course => {
    const score = convertGradeToScore(course.grade)
    const credit = parseFloat(course.credit || '0')
    const gpa = score !== null ? calculateBUPTGPA(score) : 0

    return {
      ...course,
      numericScore: score,
      gpaPoints: gpa,
      creditValue: credit,
      isValid: score !== null && credit > 0
    }
  }).filter(course => course.isValid)
}