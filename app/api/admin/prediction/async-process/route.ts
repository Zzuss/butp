import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { constants } from 'fs'
import { importPredictionToDatabase } from '@/lib/prediction-import'

// 专业代码映射
const MAJOR_CODE_MAP: { [key: string]: string } = {
  '智能科学与技术': 'ai',
  '物联网工程': 'iot', 
  '电信工程及管理': 'te',
  '电子信息工程': 'eie'
}

// 反向映射：代码 -> 专业名称
const CODE_TO_MAJOR_MAP: { [key: string]: string } = {
  'ai': '智能科学与技术',
  'iot': '物联网工程', 
  'te': '电信工程及管理',
  'tewm': '电信工程及管理', // 兼容旧代码
  'eie': '电子信息工程',
  'ee': '电子信息工程' // 兼容旧代码
}

export async function POST(request: NextRequest) {
  try {
    const { taskId, year } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: '请提供任务ID' }, { status: 400 })
    }

    if (!year) {
      return NextResponse.json({ error: '请提供年级' }, { status: 400 })
    }

    console.log(`🎯 开始处理完成的预测任务: ${taskId}`)

    // 1. 查询任务状态，确保已完成
    const statusResponse = await fetch(`http://39.96.196.67:8080/api/task/status/${taskId}`)
    
    if (!statusResponse.ok) {
      return NextResponse.json({
        success: false,
        error: '查询任务状态失败'
      }, { status: 500 })
    }

    const statusResult = await statusResponse.json()
    
    if (!statusResult.success || statusResult.data.status !== 'completed') {
      return NextResponse.json({
        success: false,
        error: '任务尚未完成，无法处理结果',
        currentStatus: statusResult.data?.status || 'unknown'
      }, { status: 400 })
    }

    const resultFiles = statusResult.data.result_files
    if (!resultFiles || resultFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: '任务完成但没有结果文件'
      }, { status: 400 })
    }

    console.log(`📁 找到 ${resultFiles.length} 个结果文件:`, resultFiles)

    // 2. 创建临时目录
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? '/tmp' 
      : process.cwd()
    const tempDir = join(baseDir, 'temp_predictions', `process_${taskId}_${Date.now()}`)
    await mkdir(tempDir, { recursive: true })

    // 3. 下载所有结果文件
    const downloadedFiles: { fileName: string, localPath: string, major?: string }[] = []
    
    for (const fileName of resultFiles) {
      try {
        console.log(`📥 下载文件: ${fileName}`)
        
        const downloadResponse = await fetch(`http://39.96.196.67:8080/api/task/result/${taskId}/${fileName}`)
        
        if (!downloadResponse.ok) {
          throw new Error(`下载失败: ${downloadResponse.status} ${downloadResponse.statusText}`)
        }
        
        const fileBuffer = await downloadResponse.arrayBuffer()
        const localPath = join(tempDir, fileName.replace(`${taskId}_`, '')) // 移除任务ID前缀
        
        await writeFile(localPath, Buffer.from(fileBuffer))
        
        // 等待文件写入完成并验证文件可访问
        await new Promise(resolve => setTimeout(resolve, 100))
        
        try {
          await access(localPath, constants.F_OK | constants.R_OK)
          console.log(`✅ 文件访问验证成功: ${localPath}`)
        } catch (error) {
          console.error(`❌ 文件访问验证失败: ${localPath}`, error)
          throw new Error(`文件保存后无法访问: ${error}`)
        }
        
        // 从文件名提取专业信息
        const match = fileName.match(/Cohort\d+_Predictions_(\w+)\.xlsx/)
        let major: string | undefined = undefined
        
        if (match) {
          const majorCode = match[1]
          // 跳过汇总文件
          if (majorCode === 'All') {
            continue
          }
          // 使用反向映射表
          major = CODE_TO_MAJOR_MAP[majorCode]
          console.log(`🔍 文件 ${fileName}: 代码=${majorCode} -> 专业=${major}`)
        }
        
        downloadedFiles.push({
          fileName: localPath,
          localPath,
          major
        })
        
        console.log(`✅ 文件下载完成: ${fileName} -> ${localPath}`)
        
      } catch (error) {
        console.error(`❌ 下载文件失败 ${fileName}:`, error)
        // 继续处理其他文件
      }
    }

    if (downloadedFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有成功下载任何结果文件'
      }, { status: 500 })
    }

    // 4. 导入预测数据到数据库
    console.log(`📊 开始导入 ${downloadedFiles.length} 个文件到数据库...`)
    
    const importResults = {
      predictions: [] as string[],
      errors: [] as string[],
      totalFiles: downloadedFiles.length,
      successCount: 0
    }
    
    for (const fileInfo of downloadedFiles) {
      if (!fileInfo.major) {
        console.warn(`⚠️ 无法识别文件对应的专业: ${fileInfo.fileName}`)
        importResults.errors.push(`无法识别专业: ${fileInfo.fileName}`)
        continue
      }
      
      try {
        console.log(`📥 导入 ${fileInfo.major} 预测数据...`)
        
        // 再次验证文件存在（导入前最后检查）
        try {
          await access(fileInfo.localPath, constants.F_OK | constants.R_OK)
          console.log(`🔍 导入前文件验证成功: ${fileInfo.localPath}`)
        } catch (error) {
          throw new Error(`导入前文件验证失败: ${fileInfo.localPath} - ${error}`)
        }
        
        const predictionResult = await importPredictionToDatabase(fileInfo.localPath, year, fileInfo.major)
        
        if (predictionResult.success && predictionResult.directInsert) {
          console.log(`✅ ${fileInfo.major} 预测数据导入成功: ${predictionResult.recordCount}/${predictionResult.totalRecords} 条记录`)
          importResults.predictions.push(`${fileInfo.major} (${predictionResult.recordCount}条)`)
          importResults.successCount++
        } else {
          throw new Error('数据库导入失败')
        }
        
      } catch (error) {
        const errorMsg = `${fileInfo.major} 专业预测数据导入失败: ${error instanceof Error ? error.message : String(error)}`
        console.error(`❌ ${errorMsg}`)
        importResults.errors.push(errorMsg)
      }
    }

    // 5. 返回处理结果
    const allSuccess = importResults.errors.length === 0
    
    console.log(`${allSuccess ? '✅' : '⚠️'} 预测结果处理完成`)
    console.log(`   成功: ${importResults.successCount}/${importResults.totalFiles}`)
    console.log(`   失败: ${importResults.errors.length}`)
    
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? '所有预测数据导入成功' : '部分预测数据导入失败',
      data: {
        taskId,
        year,
        totalFiles: importResults.totalFiles,
        successCount: importResults.successCount,
        failureCount: importResults.errors.length,
        successMajors: importResults.predictions,
        errors: importResults.errors,
        completedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ 处理预测结果失败:', error)
    return NextResponse.json({
      success: false,
      error: '处理预测结果失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
