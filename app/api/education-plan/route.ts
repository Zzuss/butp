import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const planDirectory = path.join(process.cwd(), 'public', 'Education_Plan_PDF')
    
    // 检查目录是否存在
    if (!fs.existsSync(planDirectory)) {
      return NextResponse.json([])
    }

    const files = fs.readdirSync(planDirectory)
    const pdfFiles = files.filter(file => file.endsWith('.pdf'))

    const plans = pdfFiles.map(file => {
      const filePath = path.join(planDirectory, file)
      const stats = fs.statSync(filePath)
      
      // 从文件名提取年份
      const yearMatch = file.match(/Education_Plan_PDF_(\d{4})\.pdf/)
      const year = yearMatch ? yearMatch[1] : '未知'

      return {
        name: file,
        year,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      }
    })

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
