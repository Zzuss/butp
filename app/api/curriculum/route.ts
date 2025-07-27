import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { major } = await request.json()

    if (!major) {
      return NextResponse.json({ error: 'Major is required' }, { status: 400 })
    }

    // 从courses表中查询该专业的课程
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('major', major)
      .order('semester', { ascending: true })
      .order('course_id', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 })
    }

    return NextResponse.json({
      courses: data || []
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 