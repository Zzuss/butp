import { NextResponse } from 'next/server'
import { supabaseSecondary } from '@/lib/supabaseSecondary'

export async function DELETE() {
  try {
    console.log('Clearing all SNH mappings')
    
    // 先获取当前记录数
    const { count: currentCount } = await supabaseSecondary
      .from('student_number_hash_mapping_rows')
      .select('*', { count: 'exact', head: true })

    if (currentCount === 0) {
      return NextResponse.json({
        message: '没有需要清空的记录'
      })
    }

    // 删除所有记录
    const { error } = await supabaseSecondary
      .from('student_number_hash_mapping_rows')
      .delete()
      .not('student_number', 'is', null) // 删除所有记录

    if (error) {
      console.error('Database delete error:', error)
      return NextResponse.json(
        { error: '清空记录失败' },
        { status: 500 }
      )
    }

    console.log(`Successfully cleared ${currentCount} mapping records`)

    return NextResponse.json({
      message: `成功清空 ${currentCount} 条映射记录`
    })

  } catch (error) {
    console.error('Clear mappings error:', error)
    return NextResponse.json(
      { error: '清空记录失败' },
      { status: 500 }
    )
  }
}
