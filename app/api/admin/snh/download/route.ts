import { NextResponse } from 'next/server'
import { supabaseSecondary } from '@/lib/supabaseSecondary'

export async function GET() {
  try {
    console.log('Downloading SNH mapping data')
    
    // 获取所有映射记录
    const { data: mappings, error } = await supabaseSecondary
      .from('student_number_hash_mapping_rows')
      .select('student_number, student_hash, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: '获取数据失败' },
        { status: 500 }
      )
    }

    if (!mappings || mappings.length === 0) {
      return NextResponse.json(
        { error: '没有可下载的数据' },
        { status: 404 }
      )
    }

    console.log(`Retrieved ${mappings.length} mapping records`)

    // 准备CSV数据 - 使用数据库字段名作为表头
    const headers = ['student_number', 'student_hash', 'created_at']
    const csvRows = [headers.join(',')]
    
    mappings.forEach(mapping => {
      const row = [
        `"${mapping.student_number}"`,
        `"${mapping.student_hash}"`,
        `"${mapping.created_at || ''}"`
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')

    // 设置响应头以触发文件下载
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="snh_mapping_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

    return response

  } catch (error) {
    console.error('Download mappings error:', error)
    return NextResponse.json(
      { error: '下载失败，请稍后重试' },
      { status: 500 }
    )
  }
}
