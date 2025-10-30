import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // 从cohort_probability表中查询数据
    const { data, error } = await supabase
      .from('cohort_probability')
      .select('"proba_1", "proba_2", "year"')
      .eq('"SNH"', studentId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch probability data' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    return NextResponse.json({
      proba_1: data.proba_1,
      proba_2: data.proba_2,
      year: data.year
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 