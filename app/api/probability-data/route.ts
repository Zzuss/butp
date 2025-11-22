import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const trimmedStudentNumber = studentId.toString().trim();
    // 从学号前四位提取年份
    const year = parseInt(trimmedStudentNumber.substring(0, 4));
    
    // 验证年份合理性
    if (isNaN(year) || year < 2018 || year > 2050) {
      return NextResponse.json({ error: 'Invalid year from student number' }, { status: 400 })
    }

    const tableName = `Cohort${year}_Predictions_all`;

    // 从Cohort${Year}_Predictions_all表中查询数据
    const { data, error } = await supabase
      .from(tableName)
      .select('current_prob1, current_prob2')
      .eq('SNH', studentId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch probability data' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    return NextResponse.json({
      proba_1: data.current_prob1,
      proba_2: data.current_prob2,
      year: year
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 