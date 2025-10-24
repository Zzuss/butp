import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabaseSecondary } from '@/lib/supabaseSecondary'

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
                 
                 // 更严格的数据验证
                 const validStudentNumber = values[0] && String(values[0]).trim() !== ''
                 const validStudentHash = values[1] && String(values[1]).trim() !== ''
                 
                 if (values.length >= 2 && validStudentNumber && validStudentHash) {
                   parsedData.push({
                     student_number: values[0],
                     student_hash: values[1]
                   })
                 } else {
                   console.log(`CSV跳过第${i + 1}行: 学号="${values[0]}", 哈希值="${values[1]}"`)
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

        // 查找学号和哈希值列的索引，支持多种列名格式
        const headerRow = jsonData[0]
        
        // 支持的学号列名：SN, student_number
        const snIndex = headerRow.findIndex((header: any) => {
          const headerStr = String(header).toUpperCase().trim()
          return headerStr === 'SN' || headerStr === 'STUDENT_NUMBER'
        })
        
        // 支持的哈希值列名：SNH, student_hash
        const snhIndex = headerRow.findIndex((header: any) => {
          const headerStr = String(header).toUpperCase().trim()
          return headerStr === 'SNH' || headerStr === 'STUDENT_HASH'
        })

        if (snIndex === -1 || snhIndex === -1) {
          return NextResponse.json(
            { error: '文件必须包含学号列（SN 或 student_number）和哈希值列（SNH 或 student_hash）' },
            { status: 400 }
          )
        }

        // 解析数据行
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          const studentNumber = row[snIndex]
          const studentHash = row[snhIndex]

          // 更严格的数据验证：检查是否存在且不为空字符串
          const validStudentNumber = studentNumber !== null && studentNumber !== undefined && String(studentNumber).trim() !== ''
          const validStudentHash = studentHash !== null && studentHash !== undefined && String(studentHash).trim() !== ''

          if (validStudentNumber && validStudentHash) {
            parsedData.push({
              student_number: String(studentNumber).trim(),
              student_hash: String(studentHash).trim()
            })
          } else {
            // 记录跳过的行以便调试
            console.log(`跳过第${i + 1}行: 学号="${studentNumber}", 哈希值="${studentHash}"`)
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
               // 先检查记录是否已存在
               const { data: existingRecord, error: selectError } = await supabaseSecondary
                 .from('student_number_hash_mapping_rows')
                 .select('student_number')
                 .eq('student_number', record.student_number)
                 .single()

               if (selectError && selectError.code !== 'PGRST116') {
                 // PGRST116 是"未找到记录"的错误码，其他错误需要处理
                 errors.push(`学号 ${record.student_number}: 查询错误 - ${selectError.message}`)
                 continue
               }

               let dbError = null

               if (existingRecord) {
                 // 记录存在，执行更新
                 const { error } = await supabaseSecondary
                   .from('student_number_hash_mapping_rows')
                   .update({
                     student_hash: record.student_hash
                   })
                   .eq('student_number', record.student_number)
                 
                 dbError = error
               } else {
                 // 记录不存在，执行插入
                 const { error } = await supabaseSecondary
                   .from('student_number_hash_mapping_rows')
                   .insert({
                     student_number: record.student_number,
                     student_hash: record.student_hash
                   })
                 
                 dbError = error
               }

               if (dbError) {
                 errors.push(`学号 ${record.student_number}: ${dbError.message}`)
               } else {
                 processedCount++
               }
             } catch (dbError) {
               errors.push(`学号 ${record.student_number}: 数据库错误`)
               console.error('Database error for record:', record, dbError)
             }
           }

           console.log(`成功处理 ${processedCount} 条记录，错误 ${errors.length} 条`)

           // 计算总行数（包括跳过的行）
           let totalFileRows = 0
           if (file.name.endsWith('.csv')) {
             const text = new TextDecoder().decode(buffer)
             const lines = text.split('\n').filter(line => line.trim())
             totalFileRows = Math.max(0, lines.length - 1) // 减去标题行
           } else {
             const workbook = XLSX.read(buffer, { type: 'array' })
             const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
             const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
             totalFileRows = Math.max(0, jsonData.length - 1) // 减去标题行
           }

           const skippedRows = totalFileRows - parsedData.length
           let message = `文件上传成功！处理了 ${processedCount} 条记录`
           
           if (skippedRows > 0) {
             message += `，跳过了 ${skippedRows} 行空白或无效数据`
           }

           return NextResponse.json({
             message: message,
             processed: processedCount,
             total: parsedData.length,
             fileRows: totalFileRows,
             skipped: skippedRows,
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
