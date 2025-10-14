import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { extname } from 'path'
import { importAcademicResults } from '@/lib/prediction-import'

// 年级配置
const YEAR_CONFIGS: { [key: string]: any } = {
  '2022': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  },
  '2023': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  },
  '2024': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const year = formData.get('year') as string

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    if (!year || !YEAR_CONFIGS[year]) {
      return NextResponse.json({ error: '请选择有效的年级' }, { status: 400 })
    }

    // 检查文件类型
    const allowedTypes = ['.xlsx', '.xls']
    const fileExtension = extname(file.name).toLowerCase()
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        error: '不支持的文件格式，请上传Excel文件(.xlsx, .xls)' 
      }, { status: 400 })
    }

    console.log(`🚀 启动${year}级异步预测任务...`)
    console.log(`📁 文件: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

    // 创建临时目录 (兼容Vercel serverless环境)
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? '/tmp' 
      : process.cwd()
    const tempDir = join(baseDir, 'temp_predictions', `async_${Date.now()}`)
    await mkdir(tempDir, { recursive: true })

    // 保存上传的文件
    const uploadedFilePath = join(tempDir, file.name)
    const bytes = await file.arrayBuffer()
    await writeFile(uploadedFilePath, Buffer.from(bytes))
    
    console.log(`✅ 文件已保存到: ${uploadedFilePath}`)

    // 第一步：快速导入成绩数据到数据库
    console.log(`📊 步骤 1/3: 导入成绩数据到数据库...`)
    let academicImportResult = null
    try {
      academicImportResult = await importAcademicResults(uploadedFilePath, year)
      if (academicImportResult.success && academicImportResult.directInsert) {
        console.log(`✅ 成绩数据导入完成: ${academicImportResult.recordCount}/${academicImportResult.totalRecords} 条记录`)
      }
    } catch (error) {
      console.error(`⚠️ 成绩数据导入失败:`, error)
      // 不阻止预测继续进行
    }

    // 第二步：启动阿里云异步预测任务
    console.log(`🤖 步骤 2/3: 启动阿里云异步预测任务...`)
    
    const aliyunFormData = new FormData()
    aliyunFormData.append('file', new Blob([bytes], { type: file.type }), file.name)
    aliyunFormData.append('year', year)
    
    console.log(`📡 调用阿里云异步API: http://8.152.102.160:8080/api/task/start`)
    
    const startTime = Date.now()
    const aliyunResponse = await fetch('http://8.152.102.160:8080/api/task/start', {
      method: 'POST',
      body: aliyunFormData,
    })
    
    const responseTime = Date.now() - startTime
    console.log(`📡 阿里云API响应时间: ${responseTime}ms, 状态: ${aliyunResponse.status}`)

    if (!aliyunResponse.ok) {
      const errorText = await aliyunResponse.text()
      console.error(`❌ 阿里云API调用失败: ${errorText}`)
      return NextResponse.json({
        success: false,
        error: '启动阿里云预测任务失败',
        details: errorText
      }, { status: 500 })
    }

    const aliyunResult = await aliyunResponse.json()
    
    if (!aliyunResult.success) {
      console.error(`❌ 阿里云任务启动失败: ${aliyunResult.error}`)
      return NextResponse.json({
        success: false,
        error: '启动预测任务失败',
        details: aliyunResult.error
      }, { status: 500 })
    }

    const taskId = aliyunResult.data.task_id
    console.log(`✅ 阿里云任务启动成功，任务ID: ${taskId}`)

    // 返回任务信息（Vercel函数立即结束，不等待预测完成）
    return NextResponse.json({
      success: true,
      message: '预测任务已启动',
      data: {
        taskId,
        year,
        fileName: file.name,
        fileSize: file.size,
        majors: YEAR_CONFIGS[year].majors,
        academicImportSuccess: academicImportResult?.success || false,
        academicRecordCount: academicImportResult?.recordCount || 0,
        startedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ 启动异步预测任务失败:', error)
    return NextResponse.json({
      success: false,
      error: '启动预测任务失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
