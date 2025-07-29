import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { allCourses } = await request.json()

    if (!allCourses || !Array.isArray(allCourses)) {
      return NextResponse.json({ error: 'Invalid course data' }, { status: 400 })
    }

    // 定义9个特征类别
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

    // 按类别分组课程
    const coursesByCategory: Record<string, Array<{score: number, credit: number}>> = {}
    featureCategories.forEach(category => {
      coursesByCategory[category] = []
    })

    // 遍历所有课程，按category分组
    allCourses.forEach(course => {
      const category = course.category
      if (category && featureCategories.includes(category) && 
          course.score !== null && course.score !== undefined &&
          course.credit !== null && course.credit !== undefined) {
        coursesByCategory[category].push({
          score: course.score,
          credit: course.credit
        })
      }
    })

    // 计算每个类别的加权平均值
    featureCategories.forEach(category => {
      const courses = coursesByCategory[category]
      if (courses.length > 0) {
        const totalWeightedScore = courses.reduce((sum, course) => {
          return sum + (course.score * course.credit)
        }, 0)
        const totalCredits = courses.reduce((sum, course) => {
          return sum + course.credit
        }, 0)
        
        if (totalCredits > 0) {
          featureValues[category] = Number((totalWeightedScore / totalCredits).toFixed(3))
        }
      }
      // 如果没有课程，保持默认值0
    })

    return NextResponse.json({
      success: true,
      data: {
        featureValues,
        summary: {
          totalCourses: allCourses.length,
          coursesByCategory: Object.fromEntries(
            featureCategories.map(category => [
              category, 
              coursesByCategory[category].length
            ])
          )
        }
      }
    })

  } catch (error) {
    console.error('Calculate features error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 