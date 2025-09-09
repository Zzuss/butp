import { NextRequest, NextResponse } from 'next/server'
import { listEducationPlans } from '@/lib/supabase'

export async function GET() {
  try {
    const plans = await listEducationPlans()
    
    // 按年份排序
    plans.sort((a, b) => b.year.localeCompare(a.year))

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Failed to fetch education plans:', error)
    return NextResponse.json(
      { message: '获取培养方案列表失败' },
      { status: 500 }
    )
  }
}
