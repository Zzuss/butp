import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 在每次请求时创建新的客户端，避免连接问题
function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // 从cohort_predictions表中查询学生的目标分数
    let data, error
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        const supabase = createSupabaseClient()
        const result = await supabase
          .from('cohort_predictions')
          .select('target1_min_required_score, target2_min_required_score')
          .eq('SNH', studentId)
          .limit(1)
          .single()
        
        data = result.data
        error = result.error
        
        if (!error) break // 成功获取数据，跳出重试循环
        
      } catch (fetchError) {
        console.error(`Attempt ${retryCount + 1} failed:`, fetchError)
        error = fetchError
      }
      
      retryCount++
      if (retryCount < maxRetries) {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }

    if (error) {
      console.error('Database error after retries:', error)
      return NextResponse.json({ error: 'Failed to fetch target scores' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({
      target1_score: data.target1_min_required_score,
      target2_score: data.target2_min_required_score
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 