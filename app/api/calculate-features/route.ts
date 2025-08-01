import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { allCourses } = await request.json()

    if (!allCourses || !Array.isArray(allCourses)) {
      return NextResponse.json({ error: 'allCourses array is required' }, { status: 400 })
    }

    // 定义九个特征值类别
    const featureCategories = [
      '公共课程',
      '实践课程', 
      '数学科学',
      '政治课程',
      '基础学科',
      '创新课程',
      '英语课程',
      '基础专业',
      '专业课程'
    ]

    // 初始化特征值对象
    const featureValues: Record<string, number> = {}
    featureCategories.forEach(category => {
      featureValues[category] = 0
    })

    // 按category分组计算加权平均
    const categoryGroups: Record<string, { scores: number[], credits: number[] }> = {}
    
    // 初始化分组
    featureCategories.forEach(category => {
      categoryGroups[category] = { scores: [], credits: [] }
    })

    // 遍历所有课程，按category分组
    allCourses.forEach((course: any) => {
      const category = course.category
      const score = course.score
      const credit = course.credit

      // 只处理有category、有效成绩和学分的课程
      if (category && 
          score !== null && 
          score !== undefined && 
          !isNaN(score) && 
          credit !== null && 
          credit !== undefined && 
          !isNaN(credit) && 
          credit > 0) {
        
        if (categoryGroups[category]) {
          categoryGroups[category].scores.push(score)
          categoryGroups[category].credits.push(credit)
        }
      }
    })

    // 计算每个category的加权平均值
    featureCategories.forEach(category => {
      const group = categoryGroups[category]
      
      if (group.scores.length > 0 && group.credits.length > 0) {
        // 计算加权平均：Σ(成绩 × 学分) / Σ(学分)
        let weightedSum = 0
        let totalCredits = 0
        
        for (let i = 0; i < group.scores.length; i++) {
          weightedSum += group.scores[i] * group.credits[i]
          totalCredits += group.credits[i]
        }
        
        if (totalCredits > 0) {
          featureValues[category] = Number((weightedSum / totalCredits).toFixed(2))
        } else {
          featureValues[category] = 0
        }
      } else {
        featureValues[category] = 0
      }
    })

    // 添加调试信息
    const debugInfo = {
      totalCourses: allCourses.length,
      coursesWithValidData: allCourses.filter((course: any) => 
        course.category && 
        course.score !== null && 
        course.score !== undefined && 
        !isNaN(course.score) && 
        course.credit !== null && 
        course.credit !== undefined && 
        !isNaN(course.credit) && 
        course.credit > 0
      ).length,
      categoryBreakdown: Object.keys(categoryGroups).map(category => ({
        category,
        courseCount: categoryGroups[category].scores.length,
        totalCredits: categoryGroups[category].credits.reduce((sum, credit) => sum + credit, 0),
        averageScore: categoryGroups[category].scores.length > 0 ? 
          categoryGroups[category].scores.reduce((sum, score) => sum + score, 0) / categoryGroups[category].scores.length : 0
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        featureValues,
        debugInfo
      }
    })

  } catch (error) {
    console.error('Calculate features error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 