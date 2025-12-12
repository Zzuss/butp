import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // 1. 接收参数：allCourses, year, major
    const { allCourses, year, major } = await request.json()

    if (!allCourses || !Array.isArray(allCourses)) {
      return NextResponse.json({ error: 'allCourses array is required' }, { status: 400 })
    }

    console.log('📥 calculate-features 接收到的参数:', {
      allCoursesCount: allCourses.length,
      year: year,
      major: major,
      sampleCourse: allCourses[0] // 打印第一条课程数据用于调试
    })

    // 专业名称映射：将中文专业名称映射为英文代码
    const TRAINING_PLAN_NAMES: Record<string, string> = {
      "智能科学与技术": "ai",
      "物联网工程": "iot",
      "电子信息工程": "ee",
      "电信工程及管理": "tewm",
      "电子商务及法律": "ecwl",
    }

    // 映射 major：如果接收的是中文名称，转换为英文代码
    const mappedMajor = major && TRAINING_PLAN_NAMES[major] ? TRAINING_PLAN_NAMES[major] : major

    console.log('🔄 专业名称映射:', {
      originalMajor: major,
      mappedMajor: mappedMajor
    })

    // 2. 提取所有有效的 courseId（去重、过滤 null）
    const courseIds = allCourses
      .map((course: any) => course.courseId)
      .filter((id: any) => id !== null && id !== undefined && id !== '')
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index) // 去重

    console.log('📋 提取的有效 courseId 数量:', courseIds.length)

    if (courseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          courseFeatures: [],
          message: 'No valid course IDs found'
        }
      })
    }

    // 3. 批量查询 Courses_features 表
    // 条件：course_id IN (...), year = ?, major = ?
    // 返回：每个 courseId 对应的 C1~C18
    // 注意：使用映射后的 major（英文代码）进行查询
    let query = supabase
      .from('Courses_features')
      .select('course_id, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16, C17, C18')
      .in('course_id', courseIds)
    
    // 只在 year 和 major 存在时才添加过滤条件
    if (year !== null && year !== undefined) {
      query = query.eq('year', year)
    }
    if (mappedMajor !== null && mappedMajor !== undefined) {
      query = query.eq('major', mappedMajor)
    }
    
    const { data: featuresData, error: queryError } = await query

    if (queryError) {
      console.error('❌ 查询 Courses_features 表失败:', queryError)
      return NextResponse.json({ error: 'Failed to query Courses_features table', detail: queryError.message }, { status: 500 })
    }

    console.log('✅ 查询到', featuresData?.length || 0, '条特征值数据')
    if (featuresData && featuresData.length > 0) {
      console.log('📊 查询结果示例:', featuresData[0])
    } else {
      console.log('⚠️ 警告：查询结果为空！可能的原因：')
      console.log('  - year:', year, '(是否为 null/undefined?)')
      console.log('  - mappedMajor:', mappedMajor, '(是否为 null/undefined?)')
      console.log('  - courseIds 示例:', courseIds.slice(0, 5))
    }

    // 4. 建立 courseId -> C1~C18 的映射表
    const featuresMap = new Map<string, {
      C1: number | null,
      C2: number | null,
      C3: number | null,
      C4: number | null,
      C5: number | null,
      C6: number | null,
      C7: number | null,
      C8: number | null,
      C9: number | null,
      C10: number | null,
      C11: number | null,
      C12: number | null,
      C13: number | null,
      C14: number | null,
      C15: number | null,
      C16: number | null,
      C17: number | null,
      C18: number | null
    }>()

    if (featuresData) {
      // 如果查询返回了多条记录对应同一个 course_id，优先使用匹配 year 和 major 的记录
      // 如果 year 和 major 都提供了，应该只会有一条记录
      featuresData.forEach((row: any) => {
        const courseId = row.course_id
        
        // 如果该 courseId 已经存在，检查是否需要更新
        // 优先使用匹配 year 和 major 的记录
        if (!featuresMap.has(courseId)) {
          // 第一次遇到该 courseId，直接设置
          featuresMap.set(courseId, {
            C1: row.C1 ?? null,
            C2: row.C2 ?? null,
            C3: row.C3 ?? null,
            C4: row.C4 ?? null,
            C5: row.C5 ?? null,
            C6: row.C6 ?? null,
            C7: row.C7 ?? null,
            C8: row.C8 ?? null,
            C9: row.C9 ?? null,
            C10: row.C10 ?? null,
            C11: row.C11 ?? null,
            C12: row.C12 ?? null,
            C13: row.C13 ?? null,
            C14: row.C14 ?? null,
            C15: row.C15 ?? null,
            C16: row.C16 ?? null,
            C17: row.C17 ?? null,
            C18: row.C18 ?? null
          })
        } else {
          // 如果已存在，优先使用匹配 year 和 major 的记录
          const currentRowMatches = (year === null || year === undefined || row.year === year) &&
                                    (mappedMajor === null || mappedMajor === undefined || row.major === mappedMajor)
          
          if (currentRowMatches) {
            // 当前记录匹配，更新
            featuresMap.set(courseId, {
              C1: row.C1 ?? null,
              C2: row.C2 ?? null,
              C3: row.C3 ?? null,
              C4: row.C4 ?? null,
              C5: row.C5 ?? null,
              C6: row.C6 ?? null,
              C7: row.C7 ?? null,
              C8: row.C8 ?? null,
              C9: row.C9 ?? null,
              C10: row.C10 ?? null,
              C11: row.C11 ?? null,
              C12: row.C12 ?? null,
              C13: row.C13 ?? null,
              C14: row.C14 ?? null,
              C15: row.C15 ?? null,
              C16: row.C16 ?? null,
              C17: row.C17 ?? null,
              C18: row.C18 ?? null
            })
          }
          // 如果不匹配，保持原有记录不变
        }
      })
    }

    // 定义衍生特征计算规则
    const DERIVED_FEATURE_RULES: Record<string, string[]> = {
      "C19": ["C1", "C2"],
      "C20": ["C3", "C4"],
      "C21": ["C7", "C8", "C9", "C16", "C17"],
      "C22": ["C5", "C6", "C12", "C13", "C14", "C15"],
      "C23": ["C10", "C11", "C18"],
    }

    // 计算衍生特征的辅助函数
    const calculateDerivedFeature = (features: Record<string, number | null>, rule: string[]): number | null => {
      const values = rule.map(key => features[key]).filter(val => val !== null && val !== undefined) as number[]
      
      // 如果所有依赖值都为 null，返回 null
      if (values.length === 0) {
        return null
      }
      
      // 计算平均值
      const sum = values.reduce((acc, val) => acc + val, 0)
      const average = sum / values.length
      
      return Number(average.toFixed(2))
    }

    // 5. 遍历 allCourses，通过 courseId 查找对应的 C1~C18，并计算 C19~C23
    const courseFeatures = allCourses.map((course: any) => {
      const courseId = course.courseId
      
      // 如果 courseId 为 null 或查询不到，记录日志并返回 null
      if (!courseId || !featuresMap.has(courseId)) {
        if (courseId) {
          console.log('⚠️ 课程查询不到或返回值为 null，课号:', courseId)
        }
        return {
          courseId: courseId,
          score: course.score,
          credit: course.credit,
          C1: null,
          C2: null,
          C3: null,
          C4: null,
          C5: null,
          C6: null,
          C7: null,
          C8: null,
          C9: null,
          C10: null,
          C11: null,
          C12: null,
          C13: null,
          C14: null,
          C15: null,
          C16: null,
          C17: null,
          C18: null,
          C19: null,
          C20: null,
          C21: null,
          C22: null,
          C23: null
        }
      }

      // 找到对应的特征值
      const features = featuresMap.get(courseId)!
      
      // 计算衍生特征 C19~C23
      const C19 = calculateDerivedFeature(features, DERIVED_FEATURE_RULES["C19"])
      const C20 = calculateDerivedFeature(features, DERIVED_FEATURE_RULES["C20"])
      const C21 = calculateDerivedFeature(features, DERIVED_FEATURE_RULES["C21"])
      const C22 = calculateDerivedFeature(features, DERIVED_FEATURE_RULES["C22"])
      const C23 = calculateDerivedFeature(features, DERIVED_FEATURE_RULES["C23"])
      
      return {
        courseId: courseId,
        score: course.score,
        credit: course.credit,
        ...features,
        C19: C19,
        C20: C20,
        C21: C21,
        C22: C22,
        C23: C23
      }
    })

    console.log('✅ 特征值映射完成，共处理', courseFeatures.length, '门课程')

    // 6. 计算最终的 C1~C23（加权平均）
    // 公式：最终C = Σ(score_i × credit_i × C_i) / Σ(credit_i)
    // 过滤条件：credit 为 null/0/0.1 的课程不参与计算
    
    const finalFeatures: Record<string, number> = {}
    
    // 对 C1~C23 分别计算
    for (let c = 1; c <= 23; c++) {
      const cKey = `C${c}` as keyof typeof courseFeatures[0]
      
      let weightedSum = 0  // Σ(score_i × credit_i × C_i)
      let totalCredits = 0  // Σ(credit_i)
      
      courseFeatures.forEach((course: any) => {
        const credit = course.credit
        const score = course.score
        const cValue = course[cKey]
        
        // 过滤：credit 为 null/0/0.1 的课程不参与计算
        if (credit === null || credit === undefined || credit === 0 || credit === 0.1) {
          return
        }
        
        // 如果 C 值为 null，跳过该课程（不累加）
        if (cValue === null || cValue === undefined) {
          return
        }
        
        // 累加：score × credit × C值
        weightedSum += score * credit * cValue
        totalCredits += credit
      })
      
      // 如果所有课程的该 C 值都为 null（totalCredits 为 0），最终结果为 0
      if (totalCredits === 0) {
        finalFeatures[cKey] = 0
      } else {
        // 计算加权平均
        finalFeatures[cKey] = Number((weightedSum / totalCredits).toFixed(2))
      }
    }
    
    console.log('✅ 最终特征值计算完成:', finalFeatures)

    return NextResponse.json({
      success: true,
      data: {
        C1: finalFeatures.C1,
        C2: finalFeatures.C2,
        C3: finalFeatures.C3,
        C4: finalFeatures.C4,
        C5: finalFeatures.C5,
        C6: finalFeatures.C6,
        C7: finalFeatures.C7,
        C8: finalFeatures.C8,
        C9: finalFeatures.C9,
        C10: finalFeatures.C10,
        C11: finalFeatures.C11,
        C12: finalFeatures.C12,
        C13: finalFeatures.C13,
        C14: finalFeatures.C14,
        C15: finalFeatures.C15,
        C16: finalFeatures.C16,
        C17: finalFeatures.C17,
        C18: finalFeatures.C18,
        C19: finalFeatures.C19,
        C20: finalFeatures.C20,
        C21: finalFeatures.C21,
        C22: finalFeatures.C22,
        C23: finalFeatures.C23
      }
    })

  } catch (error) {
    console.error('❌ Calculate features error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 