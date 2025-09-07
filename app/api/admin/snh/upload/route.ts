import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// Supabase 配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface ParsedRecord {
  student_number: string
  student_hash: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('SNH upload API called')
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '未选择文件' },
        { status: 400 }
      )
    }

    console.log('Processing file:', file.name, 'Type:', file.type)

    // 读取文件内容
    const buffer = await file.arrayBuffer()
    let parsedData: ParsedRecord[] = []
    const errors: string[] = []

    try {
      if (file.name.endsWith('.csv')) {
        // 处理CSV文件
        const text = new TextDecoder().decode(buffer)
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          return NextResponse.json(
            { error: 'CSV文件至少需要包含标题行和一行数据' },
            { status: 400 }
          )
        }

        // 跳过标题行
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
          if (values.length >= 2 && values[0] && values[1]) {
            parsedData.push({
              student_number: values[0],
              student_hash: values[1]
            })
          }
        }
      } else {
        // 处理Excel文件
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) {
          return NextResponse.json(
            { error: 'Excel文件至少需要包含标题行和一行数据' },
            { status: 400 }
          )
        }

        // 查找SN和SNH列的索引
        const headerRow = jsonData[0]
        const snIndex = headerRow.findIndex((header: any) => 
          String(header).toUpperCase() === 'SN'
        )
        const snhIndex = headerRow.findIndex((header: any) => 
          String(header).toUpperCase() === 'SNH'
        )

        if (snIndex === -1 || snhIndex === -1) {
          return NextResponse.json(
            { error: '文件必须包含SN（学号）和SNH（哈希值）列' },
            { status: 400 }
          )
        }

        // 解析数据行
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          const studentNumber = row[snIndex]
          const studentHash = row[snhIndex]

          if (studentNumber && studentHash) {
            parsedData.push({
              student_number: String(studentNumber).trim(),
              student_hash: String(studentHash).trim()
            })
          }
        }
      }
    } catch (parseError) {
      console.error('文件解析错误:', parseError)
      return NextResponse.json(
        { error: '文件格式错误，请检查文件内容' },
        { status: 400 }
      )
    }

    if (parsedData.length === 0) {
      return NextResponse.json(
        { error: '文件中没有找到有效的数据行' },
        { status: 400 }
      )
    }

    console.log(`解析到 ${parsedData.length} 条记录`)

    // 批量插入或更新数据库
    let processedCount = 0
    
    for (const record of parsedData) {
      try {
        const { error } = await supabase
          .from('student_number_hash_mapping')
          .upsert({
            student_number: record.student_number,
            student_hash: record.student_hash,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'student_number'
          })

        if (error) {
          errors.push(`学号 ${record.student_number}: ${error.message}`)
        } else {
          processedCount++
        }
      } catch (dbError) {
        errors.push(`学号 ${record.student_number}: 数据库错误`)
        console.error('Database error for record:', record, dbError)
      }
    }

    console.log(`成功处理 ${processedCount} 条记录，错误 ${errors.length} 条`)

    return NextResponse.json({
      message: `文件上传成功！处理了 ${processedCount} 条记录`,
      processed: processedCount,
      total: parsedData.length,
      errors: errors
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: '上传处理失败，请重试' },
      { status: 500 }
    )
  }
}
