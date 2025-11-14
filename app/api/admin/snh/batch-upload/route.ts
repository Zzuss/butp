import { NextRequest, NextResponse } from 'next/server'
import { supabaseSecondary } from '@/lib/supabaseSecondary'

interface BatchRecord {
  student_number: string
  student_hash: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('SNH batch upload API called')
    
    const body = await request.json()
    const { records } = body as { records: BatchRecord[] }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: '未提供有效的数据记录' },
        { status: 400 }
      )
    }

    console.log(`接收到 ${records.length} 条记录，开始批量处理`)

    const errors: string[] = []
    let processedCount = 0

    // 批量处理：先尝试批量插入，失败则逐条处理
    try {
      // 先查询已存在的记录
      const studentNumbers = records.map(r => r.student_number)
      const { data: existingRecords, error: selectError } = await supabaseSecondary
        .from('student_number_hash_mapping_rows')
        .select('student_number')
        .in('student_number', studentNumbers)

      if (selectError) {
        console.error('查询已存在记录失败:', selectError)
        // 如果查询失败，回退到逐条处理
        return await processRecordsOneByOne(records, errors)
      }

      const existingNumbers = new Set(
        (existingRecords || []).map((r: any) => r.student_number)
      )

      // 分离需要插入和更新的记录
      const recordsToInsert: BatchRecord[] = []
      const recordsToUpdate: BatchRecord[] = []

      for (const record of records) {
        if (existingNumbers.has(record.student_number)) {
          recordsToUpdate.push(record)
        } else {
          recordsToInsert.push(record)
        }
      }

      // 批量插入新记录
      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabaseSecondary
          .from('student_number_hash_mapping_rows')
          .insert(recordsToInsert)

        if (insertError) {
          console.error('批量插入失败:', insertError)
          // 批量插入失败，逐条插入
          for (const record of recordsToInsert) {
            try {
              const { error } = await supabaseSecondary
                .from('student_number_hash_mapping_rows')
                .insert(record)
              
              if (error) {
                errors.push(`学号 ${record.student_number}: ${error.message}`)
              } else {
                processedCount++
              }
            } catch (err) {
              errors.push(`学号 ${record.student_number}: 插入失败`)
            }
          }
        } else {
          processedCount += recordsToInsert.length
        }
      }

      // 批量更新已存在的记录
      if (recordsToUpdate.length > 0) {
        // Supabase 不支持批量更新，需要逐条更新
        for (const record of recordsToUpdate) {
          try {
            const { error } = await supabaseSecondary
              .from('student_number_hash_mapping_rows')
              .update({ student_hash: record.student_hash })
              .eq('student_number', record.student_number)
            
            if (error) {
              errors.push(`学号 ${record.student_number}: ${error.message}`)
            } else {
              processedCount++
            }
          } catch (err) {
            errors.push(`学号 ${record.student_number}: 更新失败`)
          }
        }
      }

    } catch (error) {
      console.error('批量处理异常:', error)
      return await processRecordsOneByOne(records, errors)
    }

    console.log(`批量处理完成：成功 ${processedCount} 条，错误 ${errors.length} 条`)

    return NextResponse.json({
      message: `成功处理 ${processedCount} 条记录`,
      processed: processedCount,
      total: records.length,
      errors: errors
    })

  } catch (error) {
    console.error('Batch upload error:', error)
    return NextResponse.json(
      { error: '批量上传处理失败，请重试' },
      { status: 500 }
    )
  }
}

// 逐条处理记录（作为后备方案）
async function processRecordsOneByOne(
  records: BatchRecord[],
  errors: string[]
): Promise<NextResponse> {
  let processedCount = 0

  for (const record of records) {
    try {
      // 先检查记录是否已存在
      const { data: existingRecord, error: selectError } = await supabaseSecondary
        .from('student_number_hash_mapping_rows')
        .select('student_number')
        .eq('student_number', record.student_number)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
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

  return NextResponse.json({
    message: `成功处理 ${processedCount} 条记录`,
    processed: processedCount,
    total: records.length,
    errors: errors
  })
}

