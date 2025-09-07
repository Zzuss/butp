import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { hash } = await request.json()
    
    if (!hash) {
      return NextResponse.json({ error: '缺少哈希值参数' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cohort_probability')
      .select('proba_1, proba_2, proba_3, major, year')
      .eq('SNH', hash)
      .single()

    if (error) {
      console.error('Supabase查询错误:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: '未找到数据' }, { status: 404 })
    }

    return NextResponse.json({ 
      data: {
        proba_1: data.proba_1,
        proba_2: data.proba_2,
        proba_3: data.proba_3,
        major: data.major,
        year: data.year
      }
    })

  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
} 