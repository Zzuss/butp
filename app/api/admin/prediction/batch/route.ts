import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readdir, stat, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'

interface BatchFileInfo {
  id: string
  filename: string
  year: string
  filePath: string
  tempDir: string
}

interface BatchPredictionResult {
  batchId: string
  totalFiles: number
  results: { [fileId: string]: any }
  errors: { [fileId: string]: string }
  startTime: number
  endTime?: number
}

// 年级配置（复用现有配置）
const YEAR_CONFIGS: { [key: string]: any } = {
  '2021': {
    year: '2021',
    majors: {
      '物联网工程': '2021级物联网工程培养方案.xlsx',
      '电信工程及管理': '2021级电信工程及管理培养方案.xlsx',
      '电子商务及法律': '2021级电子商务及法律培养方案.xlsx'
    }
  },
  '2022': {
    year: '2022',
    majors: {
      '智能科学与技术': '2022级智能科学与技术培养方案.xlsx',
      '物联网工程': '2022级物联网工程培养方案.xlsx',
      '电信工程及管理': '2022级电信工程及管理培养方案.xlsx',
      '电子信息工程': '2022级电子信息工程培养方案.xlsx'
    }
  },
  '2023': {
    year: '2023',
    majors: {
      '智能科学与技术': '2023级智能科学与技术培养方案.xlsx',
      '物联网工程': '2023级物联网工程培养方案.xlsx',
      '电信工程及管理': '2023级电信工程及管理培养方案.xlsx',
      '电子信息工程': '2023级电子信息工程培养方案.xlsx'
    }
  },
  '2024': {
    year: '2024',
    majors: {
      '智能科学与技术': '2024级智能科学与技术培养方案.xlsx',
      '物联网工程': '2024级物联网工程培养方案.xlsx',
      '电信工程及管理': '2024级电信工程及管理培养方案.xlsx',
      '电子信息工程': '2024级电子信息工程培养方案.xlsx'
    }
  }
}

// 专业代码映射
const MAJOR_CODE_MAP: { [key: string]: string } = {
  '智能科学与技术': 'ai',
  '电子信息工程': 'ee',
  '物联网工程': 'iot',
  '电信工程及管理': 'tewm'
}

// 批量导入成绩数据（避免冲突）
async function batchImportAcademicResults(files: BatchFileInfo[]) {
  try {
    console.log(`开始批量导入 ${files.length} 个文件的成绩数据`)
    
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const XLSX = require('xlsx')
    
    // 合并所有文件的数据，添加文件标识符避免冲突
    const allData: any[] = []
    const fileResults: { [fileId: string]: any } = {}
    
    for (const fileInfo of files) {
      try {
        console.log(`读取文件: ${fileInfo.filename}`)
        
        // 读取Excel文件
        let workbook: any
        try {
          workbook = XLSX.readFile(fileInfo.filePath)
        } catch (error) {
          // 尝试缓冲读取
          const fs = require('fs')
          const buffer = fs.readFileSync(fileInfo.filePath)
          workbook = XLSX.read(buffer, { type: 'buffer' })
        }
        
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          throw new Error('Excel文件中没有找到工作表')
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        console.log(`文件 ${fileInfo.filename} 读取到 ${jsonData.length} 条记录`)
        
        // 处理数据，添加批次标识符
        const processedData = jsonData.map((row: any) => ({
          SNH: row.SNH || null,
          Semester_Offered: row.Semester_Offered || null,
          Current_Major: row.Current_Major || null,
          Course_ID: row.Course_ID || null,
          Course_Name: row.Course_Name || null,
          Grade: row.Grade ? String(row.Grade) : null,
          Grade_Remark: row.Grade_Remark || null,
          Course_Type: row.Course_Type || null,
          Course_Attribute: row['Course_Attribute '] || row.Course_Attribute || null,
          Hours: row.Hours ? String(row.Hours) : null,
          Credit: row.Credit ? String(row.Credit) : null,
          Offering_Unit: row.Offering_Unit || null,
          Tags: row.Tags || null,
          Description: row.Description || null,
          Exam_Type: row.Exam_Type || null,
          Assessment_Method: row['Assessment_Method '] || row.Assessment_Method || null,
          year: parseInt(fileInfo.year),
          batch_file_id: fileInfo.id // 添加批次标识符
        }))
        
        allData.push(...processedData)
        fileResults[fileInfo.id] = {
          recordCount: processedData.length,
          success: true
        }
        
      } catch (error) {
        console.error(`处理文件 ${fileInfo.filename} 失败:`, error)
        fileResults[fileInfo.id] = {
          recordCount: 0,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      }
    }
    
    // 先清空对应年级的数据
    const years = [...new Set(files.map(f => f.year))]
    for (const year of years) {
      console.log(`清空 ${year} 级的现有数据...`)
      const { error: deleteError } = await supabase
        .from('academic_results')
        .delete()
        .eq('year', parseInt(year))
      
      if (deleteError) {
        console.error(`清空 ${year} 级数据失败:`, deleteError)
      }
    }
    
    // 批量插入数据
    if (allData.length > 0) {
      console.log(`开始批量插入 ${allData.length} 条记录到数据库`)
      
      const batchSize = 1000
      let totalInserted = 0
      
      for (let i = 0; i < allData.length; i += batchSize) {
        const batch = allData.slice(i, i + batchSize)
        
        try {
          const { error } = await supabase
            .from('academic_results')
            .insert(batch)
          
          if (error) {
            throw error
          }
          
          totalInserted += batch.length
          console.log(`批量插入进度: ${totalInserted}/${allData.length}`)
          
        } catch (error) {
          console.error(`批量插入失败:`, error)
          throw error
        }
      }
      
      console.log(`✅ 批量导入完成: ${totalInserted} 条记录`)
    }
    
    return {
      success: true,
      totalRecords: allData.length,
      fileResults
    }
    
  } catch (error) {
    console.error('批量导入失败:', error)
    throw error
  }
}

// 运行单个文件的预测
async function runSinglePrediction(fileInfo: BatchFileInfo): Promise<any> {
  return new Promise((resolve) => {
    const functionDir = join(process.cwd(), 'function')
    const modelDir = join(functionDir, 'Model_Params', 'Task3_CatBoost_Model')
    const planDir = join(functionDir, `education-plan${fileInfo.year}`)
    
    console.log(`开始处理文件: ${fileInfo.filename} (${fileInfo.year}级)`)
    
    // 创建Python脚本
    const pythonScript = `
import sys
import os
function_dir = r"${functionDir}"
sys.path.insert(0, function_dir)

try:
    import pandas as pd
    import numpy as np
    from catboost import CatBoostClassifier
    from sklearn.preprocessing import StandardScaler
    import openpyxl
    print("✓ 依赖包加载完成")
except ImportError as e:
    print(f"✗ 依赖包导入错误: {e}")
    sys.exit(1)

os.chdir(function_dir)
try:
    import Optimization_model_func3_1 as opt
    print("✓ 预测模块加载完成")
except ImportError as e:
    print(f"✗ 预测模块加载失败: {e}")
    sys.exit(1)

def main():
    base_dir = r"${functionDir}"
    scores_file = r"${fileInfo.filePath}"
    temp_dir = r"${fileInfo.tempDir}"
    year = "${fileInfo.year}"
    
    print(f"=== 开始 {year} 级文件 ${fileInfo.filename} 预测 ===")
    
    majors_config = ${JSON.stringify(YEAR_CONFIGS[fileInfo.year].majors)}
    plan_dir = os.path.join(base_dir, f"education-plan{year}")
    
    per_major_files = {}
    total_students = 0
    
    for major_name, plan_filename in majors_config.items():
        course_file = os.path.join(plan_dir, plan_filename)
        if not os.path.exists(course_file):
            print(f"警告: 培养方案文件不存在: {course_file}")
            continue
        
        out_file = os.path.join(temp_dir, f"${fileInfo.id}_Cohort{year}_Predictions_{opt.get_major_code(major_name)}.xlsx")
        
        print(f"正在处理 {major_name}...")
        
        try:
            pred_df, uni_df = opt.predict_students(
                scores_file=scores_file,
                course_file=course_file,
                major_name=major_name,
                out_path=out_file,
                model_dir=r"${modelDir}",
                with_uniform_inverse=1,
                min_grade=60,
                max_grade=90
            )
            
            per_major_files[major_name] = out_file
            total_students += len(pred_df)
            print(f"✓ {major_name} 完成 ({len(pred_df)} 名学生)")
            
        except Exception as e:
            print(f"✗ {major_name} 处理失败: {e}")
            continue
    
    # 生成汇总文件
    if per_major_files:
        print("\\n正在生成汇总文件...")
        frames = []
        for major_name, file_path in per_major_files.items():
            try:
                df = pd.read_excel(file_path, sheet_name="Predictions")
                df['Major'] = major_name
                frames.append(df)
            except Exception as e:
                print(f"✗ 读取 {major_name} 结果失败: {e}")
                continue
        
        if frames:
            total_df = pd.concat(frames, ignore_index=True)
            summary_file = os.path.join(temp_dir, f"${fileInfo.id}_Cohort{year}_Predictions_All.xlsx")
            total_df.to_excel(summary_file, index=False)
            print(f"✓ 汇总文件生成完成")
    
    print(f"\\n=== 🎉 文件 ${fileInfo.filename} 预测完成 ===")
    print(f"✓ 处理学生: {total_students} 人")
    print(f"✓ 生成文件: {len(per_major_files) + (1 if per_major_files else 0)} 个")

if __name__ == "__main__":
    main()
`
    
    // 写入临时Python脚本
    const scriptPath = join(fileInfo.tempDir, `run_prediction_${fileInfo.id}.py`)
    require('fs').writeFileSync(scriptPath, pythonScript)
    
    let output = ''
    let errorOutput = ''
    
    const pythonProcess = spawn('python', [scriptPath], {
      cwd: functionDir,
      env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',
        PYTHONPATH: functionDir 
      }
    })
    
    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      console.log(`Python [${fileInfo.id}]:`, text)
    })
    
    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString()
      errorOutput += text
      console.error(`Python Error [${fileInfo.id}]:`, text)
    })
    
    // 设置20分钟超时
    const timeout = setTimeout(() => {
      console.log(`⚠️ 文件 ${fileInfo.filename} 处理超时`)
      pythonProcess.kill('SIGTERM')
      
      setTimeout(() => {
        pythonProcess.kill('SIGKILL')
      }, 5000)
      
      resolve({
        success: false,
        output: output,
        error: '处理超时 (20分钟)',
        outputFiles: []
      })
    }, 20 * 60 * 1000) // 20分钟

    pythonProcess.on('close', async (code) => {
      clearTimeout(timeout)
      
      try {
        // 查找生成的输出文件
        const files = await readdir(fileInfo.tempDir)
        const outputFiles = files.filter(file => 
          file.startsWith(fileInfo.id) && file.endsWith('.xlsx') && file.includes('Predictions')
        )
        
        resolve({
          success: code === 0 && outputFiles.length > 0,
          output: output,
          error: code !== 0 ? errorOutput : undefined,
          outputFiles: outputFiles
        })
      } catch (error) {
        resolve({
          success: false,
          output: output,
          error: `无法读取输出目录: ${error}`,
          outputFiles: []
        })
      }
    })
    
    pythonProcess.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        success: false,
        output: output,
        error: `无法启动Python进程: ${error.message}`,
        outputFiles: []
      })
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const years = formData.getAll('years') as string[]
    const maxConcurrent = parseInt(formData.get('maxConcurrent') as string) || 2
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: '请选择至少一个文件' }, { status: 400 })
    }
    
    if (files.length !== years.length) {
      return NextResponse.json({ error: '文件数量与年级数量不匹配' }, { status: 400 })
    }
    
    // 验证年级
    for (const year of years) {
      if (!year || !YEAR_CONFIGS[year]) {
        return NextResponse.json({ error: `无效的年级: ${year}` }, { status: 400 })
      }
    }
    
    // 验证文件类型
    const allowedTypes = ['.xlsx', '.xls']
    for (const file of files) {
      const fileExtension = extname(file.name).toLowerCase()
      if (!allowedTypes.includes(fileExtension)) {
        return NextResponse.json({ 
          error: `不支持的文件格式: ${file.name}` 
        }, { status: 400 })
      }
    }
    
    const batchId = `batch_${Date.now()}`
    // 兼容Vercel serverless环境
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? '/tmp' 
      : process.cwd()
    const batchTempDir = join(baseDir, 'temp_predictions', batchId)
    if (!existsSync(batchTempDir)) {
      mkdirSync(batchTempDir, { recursive: true })
    }
    
    console.log(`开始批量处理，批次ID: ${batchId}`)
    console.log(`文件数量: ${files.length}，最大并发: ${maxConcurrent}`)
    
    // 准备文件信息
    const batchFiles: BatchFileInfo[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const year = years[i]
      const fileId = `file_${i}_${Date.now()}`
      const fileTempDir = join(batchTempDir, fileId)
      
      if (!existsSync(fileTempDir)) {
        mkdirSync(fileTempDir, { recursive: true })
      }
      
      // 保存文件
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = join(fileTempDir, file.name)
      await writeFile(filePath, buffer)
      
      batchFiles.push({
        id: fileId,
        filename: file.name,
        year: year,
        filePath: filePath,
        tempDir: fileTempDir
      })
    }
    
    console.log('文件保存完成，开始批量导入成绩数据...')
    
    // 步骤1: 批量导入成绩数据
    let academicImportResult: any = null
    try {
      academicImportResult = await batchImportAcademicResults(batchFiles)
      console.log('✅ 批量成绩数据导入完成')
    } catch (error) {
      console.error('❌ 批量成绩数据导入失败:', error)
      // 不阻止预测继续进行
    }
    
    console.log('开始并行处理文件...')
    
    // 步骤2: 并行处理预测
    const results: { [fileId: string]: any } = {}
    const errors: { [fileId: string]: string } = {}
    const processPromises: Promise<void>[] = []
    
    // 控制并发数量
    let currentIndex = 0
    const activeProcesses = new Set<string>()
    
    const processNext = async (): Promise<void> => {
      if (currentIndex >= batchFiles.length) {
        return
      }
      
      const fileInfo = batchFiles[currentIndex++]
      activeProcesses.add(fileInfo.id)
      
      try {
        console.log(`开始处理文件 ${fileInfo.filename} (并发数: ${activeProcesses.size})`)
        const result = await runSinglePrediction(fileInfo)
        
        if (result.success) {
          results[fileInfo.id] = result
          console.log(`✅ 文件 ${fileInfo.filename} 处理成功`)
        } else {
          errors[fileInfo.id] = result.error || '处理失败'
          console.log(`❌ 文件 ${fileInfo.filename} 处理失败: ${result.error}`)
        }
      } catch (error) {
        errors[fileInfo.id] = error instanceof Error ? error.message : '未知错误'
        console.log(`❌ 文件 ${fileInfo.filename} 处理异常:`, error)
      } finally {
        activeProcesses.delete(fileInfo.id)
        
        // 继续处理下一个文件
        if (currentIndex < batchFiles.length) {
          await processNext()
        }
      }
    }
    
    // 启动初始并发处理
    for (let i = 0; i < Math.min(maxConcurrent, batchFiles.length); i++) {
      processPromises.push(processNext())
    }
    
    // 等待所有处理完成
    await Promise.all(processPromises)
    
    console.log('所有文件处理完成')
    
    // 统计结果
    const totalFiles = batchFiles.length
    const successfulFiles = Object.keys(results).length
    const failedFiles = Object.keys(errors).length
    
    // 收集所有输出文件
    const allOutputFiles: string[] = []
    Object.values(results).forEach((result: any) => {
      if (result.outputFiles) {
        allOutputFiles.push(...result.outputFiles)
      }
    })
    
    const batchResult: BatchPredictionResult = {
      batchId,
      totalFiles,
      results,
      errors,
      startTime: Date.now(),
      endTime: Date.now()
    }
    
    console.log(`🎉 批量处理完成 - 成功: ${successfulFiles}, 失败: ${failedFiles}`)
    
    return NextResponse.json({
      success: true,
      message: `批量处理完成: ${successfulFiles}/${totalFiles} 个文件成功处理`,
      batchResult,
      academicImportResult,
      summary: {
        totalFiles,
        successfulFiles,
        failedFiles,
        allOutputFiles
      }
    })
    
  } catch (error) {
    console.error('批量处理API错误:', error)
    return NextResponse.json({
      success: false,
      error: '批量处理失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

