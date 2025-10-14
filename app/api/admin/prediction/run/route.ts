import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { supabase } from '@/lib/supabase'
import { importAcademicResults, importPredictionToDatabase } from '../../../../../lib/prediction-import'

interface PredictionConfig {
  year: string
  majors: {
    [key: string]: string
  }
}

// 年级对应的专业和培养方案文件映射
const YEAR_CONFIGS: { [key: string]: PredictionConfig } = {
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

// 使用已配置的 Supabase 客户端

// 预测单个专业的函数
async function predictMajor(major: string, students: any[], year: string) {
  try {
    console.log(`[预测] 开始预测专业: ${major} (${students.length}名学生)`)
    
    // 创建临时Excel文件
    const XLSX = require('xlsx')
    // 使用专业代码避免中文路径问题
    const majorCode = MAJOR_CODE_MAP[major] || 'unknown'
    // 在Vercel等serverless环境中使用/tmp目录，本地开发使用项目目录
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? '/tmp' 
      : process.cwd()
    const tempDir = join(baseDir, 'temp_predictions', `prediction_${majorCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
    const fs = require('fs')
    
    // 确保目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
      console.log(`[预测] 创建临时目录: ${tempDir}`)
    }
    
    // 生成专业学生数据Excel
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(students)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
    
    const tempExcelPath = join(tempDir, `${major}_students.xlsx`)
    console.log(`[预测] 准备保存文件到: ${tempExcelPath}`)
    
    try {
      // 使用buffer方式写入文件，更可靠
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      fs.writeFileSync(tempExcelPath, excelBuffer)
      console.log(`[预测] 成功保存Excel文件: ${tempExcelPath}`)
    } catch (saveError) {
      console.error(`[预测] 保存Excel文件失败:`, saveError)
      throw new Error(`无法保存临时Excel文件: ${saveError.message}`)
    }
    
    // 调用阿里云API
    const formData = new FormData()
    const fileBuffer = fs.readFileSync(tempExcelPath)
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    formData.append('scores_file', blob, `${major}_students.xlsx`)
    formData.append('year', year)
    formData.append('major', major)
    
    console.log(`[预测] 调用阿里云API: http://8.152.102.160:8080/api/predict`)
    console.log(`[预测] ${major} 无超时限制，开始时间: ${new Date().toISOString()}`)
    
    const response = await fetch('http://8.152.102.160:8080/api/predict', {
      method: 'POST',
      body: formData,
      // 完全取消超时限制，让算法有足够时间处理大数据集
    })
    
    console.log(`[预测] ${major} API响应状态: ${response.status}，响应时间: ${new Date().toISOString()}`)
    
    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
    }
    
    const responseText = await response.text()
    console.log(`[预测] ${major} 原始响应长度: ${responseText.length} 字符`)
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.log(`[预测] ${major} JSON解析失败，尝试修复...`)
      console.log(`[预测] ${major} 错误片段:`, responseText.substring(0, 200))
      
      // 修复JavaScript特殊值
      let cleanedResponse = responseText
        // 替换所有JavaScript特殊值为null
        .replace(/:\s*NaN\b/g, ': null')
        .replace(/:\s*Infinity\b/g, ': null')  
        .replace(/:\s*-Infinity\b/g, ': null')
        .replace(/:\s*undefined\b/g, ': null')
        // 修复数组和对象末尾的多余逗号
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        // 修复可能的换行问题
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .trim()
      
      try {
        responseData = JSON.parse(cleanedResponse)
        console.log(`[预测] ${major} JSON修复成功`)
      } catch (secondParseError) {
        console.error(`[预测] ${major} JSON解析彻底失败:`, secondParseError)
        console.log(`[预测] ${major} 修复后片段:`, cleanedResponse.substring(0, 200))
        
        // 如果还是失败，尝试使用eval（安全性较低但可能有效）
        try {
          console.log(`[预测] ${major} 尝试使用eval解析...`)
          // 创建安全的eval环境
          const safeEval = new Function('return (' + cleanedResponse + ')')
          responseData = safeEval()
          console.log(`[预测] ${major} eval解析成功`)
        } catch (evalError) {
          console.error(`[预测] ${major} eval解析也失败:`, evalError)
          throw new Error(`无法解析API响应，JSON和eval都失败: ${parseError.message}`)
        }
      }
    }
    
    console.log(`[预测] ${major} 预测完成`)
    
    // 清理临时文件
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.warn(`清理临时文件失败: ${cleanupError}`)
    }
    
    // 返回结构化数据
    return {
      major: major,
      success: responseData.success === true,
      result: responseData,  // 直接使用阿里云API的响应
      error: responseData.success === false ? responseData.error : undefined
    }
    
  } catch (error) {
    console.error(`[预测] ${major} 预测失败，失败时间: ${new Date().toISOString()}:`, error)
    return {
      major: major,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      result: null
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

// Excel列名到数据库字段名的映射
const COLUMN_NAME_MAP: Record<string, string> = {
  // 移除星号和多余空格的映射 - 基础课程
  '线性代数*': '线性代数',
  '高等数学A(上) *': '高等数学A(上)',
  '高等数学A(下) *': '高等数学A(下)',
  '数据结构*': '数据结构',
  '数据库系统*': '数据库系统',
  '数字电路设计*': '数字电路设计',
  'JAVA高级语言程序设计*': 'JAVA高级语言程序设计',
  'Java高级语言程序设计*': 'Java高级语言程序设计',
  '操作系统*': '操作系统',
  
  // 专业课程 - 人工智能/智能科学与技术
  '人工智能导论*': '人工智能导论',
  '产品开发与管理*': '产品开发与管理',
  '机器学习*': '机器学习',
  '计算创新学*': '计算创新学',
  '人工智能法律*': '人工智能法律',
  '软件工程*': '软件工程',
  '嵌入式系统*': '嵌入式系统',
  '推理与智能体*': '推理与智能体',
  '视觉计算*': '视觉计算',
  '智能游戏*': '智能游戏',
  '认知机器人系统*': '认知机器人系统',
  '3D图形程序设计*': '3D图形程序设计',
  
  // 专业课程 - 物联网工程
  '云计算*': '云计算',
  '物联网技术*': '物联网技术',
  '传感器技术*': '传感器技术',
  '无线通信技术*': '无线通信技术',
  '嵌入式开发*': '嵌入式开发',
  
  // 专业课程 - 电信工程及管理
  '互联网协议与网络*': '互联网协议与网络',
  '通信原理*': '通信原理',
  '信号与系统*': '信号与系统',
  '电路分析*': '电路分析',
  '微波技术*': '微波技术',
  
  // 专业课程 - 电子信息工程
  '交互式媒体设计*': '交互式媒体设计',
  '电子电路设计*': '电子电路设计',
  '数字信号处理*': '数字信号处理',
  '电磁场与微波*': '电磁场与微波',
  '射频电路设计*': '射频电路设计',
  
  // 通用专业课程
  '中间件技术*': '中间件技术',
  '网络安全*': '网络安全',
  '编译原理*': '编译原理',
  '计算机网络*': '计算机网络',
  '算法分析与设计*': '算法分析与设计',
  '项目管理*': '项目管理',
  '创新创业*': '创新创业',
  
  // 实训课程映射
  'Design & Build实训（智能）': 'Design & Build实训（智能）',
  'Design & Build实训': 'Design & Build实训',
  'Design & Build实训（电子）': 'Design & Build实训（电子）',
  
  // 长名称缩写映射 - 思政类课程
  '习近平新时代中国特色社会主义思想概论': '习概',
  '习近平新时代中国特色社会主义思想概论（实践环节）': '习概（实践环节）',
  '毛泽东思想和中国特色社会主义理论体系概论': '毛概',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节）': '毛概（实践环节）',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节））': '毛概（实践环节）', // 修复多余括号
}

// 将Excel列名映射为数据库字段名
function mapColumnName(excelColumnName: string): string {
  // 首先检查精确匹配的映射规则
  if (COLUMN_NAME_MAP[excelColumnName]) {
    return COLUMN_NAME_MAP[excelColumnName]
  }
  
  // 全面清理字段名
  const cleanedName = excelColumnName
    .replace(/\*/g, '')           // 去除所有星号
    .trim()                       // 去除首尾空格
    .replace(/\s+/g, ' ')         // 将多个连续空格合并为一个空格
    .replace(/\u00A0/g, ' ')      // 将不间断空格转换为普通空格
  
  // 检查清理后的名称是否在映射表中
  if (COLUMN_NAME_MAP[cleanedName]) {
    return COLUMN_NAME_MAP[cleanedName]
  }
  
  // 返回清理后的名称
  return cleanedName
}

// importAcademicResults函数已移动到 lib/prediction-import.ts

// 简化的文件等待 - 只检查基本可访问性
async function waitForFile(filePath: string, maxRetries = 5, delay = 3000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (existsSync(filePath)) {
        const fs = require('fs')
        // 检查文件统计信息和基本读取
        const stats = fs.statSync(filePath)
        console.log(`尝试 ${i + 1}/${maxRetries}: 文件大小 ${stats.size} bytes`)
        
        // 尝试简单的文件操作
        const fd = fs.openSync(filePath, 'r')
        fs.closeSync(fd)
        
        console.log(`✓ 文件基本检查通过: ${filePath}`)
        return true
      }
    } catch (error) {
      console.log(`文件检查 ${i + 1}/${maxRetries} 失败: ${error.message}`)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  console.log(`❌ 文件等待超时: ${filePath}`)
  return false
}

// 导入预测文件到数据库
async function importPredictionToDatabase(filePath: string, year: string, majorName: string) {
  try {
    const majorCode = MAJOR_CODE_MAP[majorName]
    if (!majorCode) {
      throw new Error(`未知的专业: ${majorName}`)
    }

    const tableName = `Cohort${year}_Predictions_${majorCode}`
    
    // 等待文件基本可访问
    console.log(`等待文件可访问: ${filePath}`)
    const fileReady = await waitForFile(filePath)
    if (!fileReady) {
      throw new Error(`文件在等待时间内不可访问: ${filePath}`)
    }
    
    // 使用重试机制读取 Excel 文件
    console.log(`开始读取 Excel 文件: ${filePath}`)
    let jsonData: any[] = []
    
    // 多次尝试不同的读取方法
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Excel 读取尝试 ${attempt}/3...`)
        
        // 方法 1: 标准 XLSX 库
        if (attempt === 1) {
          const XLSX = require('xlsx')
          const workbook = XLSX.readFile(filePath)
          const worksheet = workbook.Sheets['Predictions']
          if (!worksheet) {
            throw new Error(`工作表 'Predictions' 不存在`)
          }
          jsonData = XLSX.utils.sheet_to_json(worksheet)
        }
        
        // 方法 2: 缓冲读取
        else if (attempt === 2) {
          const fs = require('fs')
          const XLSX = require('xlsx')
          console.log('尝试缓冲读取...')
          const buffer = fs.readFileSync(filePath)
          const workbook = XLSX.read(buffer, { type: 'buffer' })
          const worksheet = workbook.Sheets['Predictions']
          if (!worksheet) {
            throw new Error(`工作表 'Predictions' 不存在`)
          }
          jsonData = XLSX.utils.sheet_to_json(worksheet)
        }
        
        // 方法 3: 延迟后重试
        else {
          console.log('延迟 2 秒后重试...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          const XLSX = require('xlsx')
          const workbook = XLSX.readFile(filePath)
          const worksheet = workbook.Sheets['Predictions']
          if (!worksheet) {
            throw new Error(`工作表 'Predictions' 不存在`)
          }
          jsonData = XLSX.utils.sheet_to_json(worksheet)
        }
        
        if (jsonData && jsonData.length > 0) {
          console.log(`✓ Excel 读取成功 (方法 ${attempt})，数据行数: ${jsonData.length}`)
          break
        } else {
          throw new Error('读取到空数据')
        }
        
      } catch (error) {
        console.log(`Excel 读取尝试 ${attempt} 失败: ${error.message}`)
        if (attempt === 3) {
          throw new Error(`所有读取方法都失败: ${error.message}`)
        }
        // 等待后再试下一种方法
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    if (jsonData.length === 0) {
      console.log(`文件 ${filePath} 中没有数据`)
      return false
    }
    
    console.log(`开始导入 ${majorName} 的预测数据到表 ${tableName}，共 ${jsonData.length} 条记录`)
    
    // 映射列名并清理数据
    const mappedData = jsonData.map(row => {
      const mappedRow: any = {}
      
      // 处理Excel文件中的所有字段
      for (const [key, value] of Object.entries(row)) {
        const mappedKey = mapColumnName(key as string)
        
        // 数据清理：处理空值和数字类型
        let cleanedValue = value
        if (value === '' || value === null || value === undefined) {
          cleanedValue = null
        } else if (typeof value === 'string' && value.trim() === '') {
          cleanedValue = null
        }
        
        mappedRow[mappedKey] = cleanedValue
      }
      return mappedRow
    })
    
    console.log(`列名映射完成，示例映射: ${Object.keys(jsonData[0] || {}).slice(0, 3).map(k => `${k} → ${mapColumnName(k)}`).join(', ')}`)
    
    // 统计数据清理情况
    const originalEmptyCount = jsonData.reduce((count, row) => {
      return count + Object.values(row).filter(val => val === '' || val === null || val === undefined).length
    }, 0)
    const cleanedEmptyCount = mappedData.reduce((count, row) => {
      return count + Object.values(row).filter(val => val === null).length
    }, 0)
    console.log(`数据清理完成: 处理了 ${originalEmptyCount} 个空值，转换为 ${cleanedEmptyCount} 个 null 值`)
    
    // 直接插入数据库（像成绩数据导入一样）
    console.log(`开始直接导入${majorName}预测数据到数据库，共${mappedData.length}条记录...`)
    
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 首先清空表中的数据
    console.log(`清空表 ${tableName} 中的现有数据...`)
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('SNH', 'dummy_value_that_should_not_exist')
    
    if (deleteError) {
      console.error(`清空表 ${tableName} 失败:`, deleteError)
      // 如果表不存在，可能需要先创建表，但这里我们假设表已存在
    } else {
      console.log(`✓ 表 ${tableName} 清空完成`)
    }
    
    // 批量插入数据库（每批1000条，避免超时）
    let processedCount = 0
    const errors: string[] = []
    const batchSize = 1000
    
    console.log(`📊 预测数据导入策略: ${mappedData.length}条记录，每批${batchSize}条`)
    
    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(mappedData.length / batchSize)
      
      console.log(`🚀 执行预测数据批次 ${batchNum}/${totalBatches}: ${batch.length} 条记录`)
      
      try {
        const { error, count } = await supabase
          .from(tableName)
          .insert(batch)
        
        if (error) {
          errors.push(`批次 ${batchNum}: ${error.message}`)
          console.error(`❌ 预测数据批次 ${batchNum} 失败:`, error.message)
        } else {
          processedCount += batch.length
          console.log(`✅ 预测数据批次 ${batchNum}/${totalBatches} 成功: ${batch.length} 条记录`)
        }
      } catch (dbError) {
        const errorMsg = `批次 ${batchNum}: 数据库连接错误`
        errors.push(errorMsg)
        console.error(`❌ 预测数据批次 ${batchNum} 数据库错误:`, dbError)
      }
      
      // 添加小延迟，避免过快请求
      if (i + batchSize < mappedData.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`📊 ${majorName}预测数据导入完成统计: 成功 ${processedCount}/${mappedData.length} 条记录`)
    
    if (errors.length > 0) {
      console.log(`⚠️ ${majorName}预测数据导入过程中有 ${errors.length} 个批次出现错误:`)
      errors.forEach(error => console.log(`  - ${error}`))
    }
    
    return { 
      success: processedCount > 0, 
      recordCount: processedCount, 
      totalRecords: mappedData.length,
      errors: errors,
      sqlGenerated: false,
      directInsert: true
    }
    
  } catch (error) {
    console.error(`导入 ${majorName} 预测数据失败:`, error)
    throw error
  }
}

// 更新概率表
async function updateProbabilityTable(tempDir: string, year: string) {
  try {
    console.log(`开始更新概率表，年级: ${year}`)
    
    console.log(`准备直接导入概率数据到数据库`)
    
    // 收集所有专业的概率数据
    const allProbabilityData: any[] = []
    
    for (const [majorName, majorCode] of Object.entries(MAJOR_CODE_MAP)) {
      const predictionFile = join(tempDir, `Cohort${year}_Predictions_${majorCode}.xlsx`)
      
      if (!existsSync(predictionFile)) {
        console.log(`预测文件不存在，跳过: ${predictionFile}`)
        continue
      }
      
      try {
        // 等待文件基本可访问
        console.log(`等待概率文件可访问: ${predictionFile}`)
        const fileReady = await waitForFile(predictionFile)
        if (!fileReady) {
          console.log(`概率文件在等待时间内不可访问，跳过: ${predictionFile}`)
          continue
        }
        
        // 使用重试机制读取概率数据
        console.log(`开始读取概率数据: ${predictionFile}`)
        let jsonData: any[] = []
        
        // 尝试读取文件
        let readSuccess = false
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`概率文件读取尝试 ${attempt}/2...`)
            
            if (attempt === 1) {
              const XLSX = require('xlsx')
              const workbook = XLSX.readFile(predictionFile)
              const worksheet = workbook.Sheets['Predictions']
              if (worksheet) {
                jsonData = XLSX.utils.sheet_to_json(worksheet)
                readSuccess = true
              }
            } else {
              // 缓冲读取
              const fs = require('fs')
              const XLSX = require('xlsx')
              const buffer = fs.readFileSync(predictionFile)
              const workbook = XLSX.read(buffer, { type: 'buffer' })
              const worksheet = workbook.Sheets['Predictions']
              if (worksheet) {
                jsonData = XLSX.utils.sheet_to_json(worksheet)
                readSuccess = true
              }
            }
            
            if (readSuccess) {
              console.log(`✓ 概率文件读取成功 (方法 ${attempt})`)
              break
            }
            
          } catch (error) {
            console.log(`概率文件读取尝试 ${attempt} 失败: ${error.message}`)
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }
        
        if (!readSuccess || !jsonData.length) {
          console.log(`跳过无法读取的概率文件: ${predictionFile}`)
          continue
        }
        
        // 提取概率数据
        for (const row of jsonData) {
          if (row.SNH && row.current_pred !== undefined) {
            allProbabilityData.push({
              SNH: row.SNH,
              major: majorName,
              current_pred: parseInt(row.current_pred) || 0,
              proba_1: parseFloat(row.current_prob1) || 0,  // 国内升学概率
              proba_2: parseFloat(row.current_prob2) || 0,  // 境外升学概率
              proba_3: parseFloat(row.current_prob3) || 0,  // 就业概率
              year: parseInt(year)
            })
          }
        }
        
        console.log(`✓ 从 ${majorName} 文件中提取了 ${jsonData.length} 条概率数据`)
        
      } catch (error) {
        console.error(`读取 ${majorName} 预测文件失败:`, error)
      }
    }
    
    if (allProbabilityData.length === 0) {
      console.log('没有找到概率数据，跳过更新概率表')
      return false
    }
    
    console.log(`开始直接导入 ${allProbabilityData.length} 条概率数据到数据库`)
    
    // 直接插入数据库（像成绩数据导入一样）
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 首先清空表中对应年级的数据
    console.log(`清空概率表中 ${year} 级的现有数据...`)
    const { error: deleteError } = await supabase
      .from('cohort_probability')
      .delete()
      .eq('year', parseInt(year))
    
    if (deleteError) {
      console.error(`清空概率表中 ${year} 级数据失败:`, deleteError)
    } else {
      console.log(`✓ 概率表中 ${year} 级数据清空完成`)
    }
    
    // 批量插入概率数据到数据库
    let processedCount = 0
    const errors: string[] = []
    const batchSize = 1000
    
    console.log(`📊 概率数据导入策略: ${allProbabilityData.length}条记录，每批${batchSize}条`)
    
    for (let i = 0; i < allProbabilityData.length; i += batchSize) {
      const batch = allProbabilityData.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(allProbabilityData.length / batchSize)
      
      console.log(`🚀 执行概率数据批次 ${batchNum}/${totalBatches}: ${batch.length} 条记录`)
      
      try {
        const { error, count } = await supabase
          .from('cohort_probability')
          .insert(batch)
        
        if (error) {
          errors.push(`批次 ${batchNum}: ${error.message}`)
          console.error(`❌ 概率数据批次 ${batchNum} 失败:`, error.message)
        } else {
          processedCount += batch.length
          console.log(`✅ 概率数据批次 ${batchNum}/${totalBatches} 成功: ${batch.length} 条记录`)
        }
      } catch (dbError) {
        const errorMsg = `批次 ${batchNum}: 数据库连接错误`
        errors.push(errorMsg)
        console.error(`❌ 概率数据批次 ${batchNum} 数据库错误:`, dbError)
      }
      
      // 添加小延迟，避免过快请求
      if (i + batchSize < allProbabilityData.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`📊 概率数据导入完成统计: 成功 ${processedCount}/${allProbabilityData.length} 条记录`)
    
    if (errors.length > 0) {
      console.log(`⚠️ 概率数据导入过程中有 ${errors.length} 个批次出现错误:`)
      errors.forEach(error => console.log(`  - ${error}`))
    }
    
    return { 
      success: processedCount > 0, 
      recordCount: processedCount, 
      totalRecords: allProbabilityData.length,
      errors: errors,
      sqlGenerated: false,
      directInsert: true
    }
    
  } catch (error) {
    console.error('更新概率表失败:', error)
    throw error
  }
}

// 运行阿里云预测算法（直接实现预测逻辑）
async function runPrediction(
  scoresFile: string,
  year: string,
  tempDir: string
): Promise<{ success: boolean; output: string; error?: string; outputFiles: string[] }> {
    
  console.log(`开始阿里云预测，参数:`)
    console.log(`- 成绩文件: ${scoresFile}`)
    console.log(`- 年级: ${year}`)
    console.log(`- 输出目录: ${tempDir}`)
  
  try {
    // 读取并解析Excel文件
    const fs = require('fs')
    const XLSX = require('xlsx')
    
    // 检查文件是否存在
    if (!fs.existsSync(scoresFile)) {
      throw new Error(`成绩文件不存在: ${scoresFile}`)
    }
    
    console.log(`📁 文件存在，大小: ${fs.statSync(scoresFile).size} bytes`)
    
    // 使用buffer方式读取文件，避免路径问题
    let workbook
    try {
      const fileBuffer = fs.readFileSync(scoresFile)
      workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    } catch (readError) {
      console.error(`❌ 读取Excel文件失败:`, readError)
      throw new Error(`无法读取Excel文件: ${readError.message}`)
    }
    
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel文件格式无效或为空')
    }
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) {
      throw new Error(`无法读取工作表: ${sheetName}`)
    }
    
    const studentsData = XLSX.utils.sheet_to_json(worksheet)
    
    if (!studentsData || studentsData.length === 0) {
      throw new Error('Excel文件中没有学生数据')
    }
    
    console.log(`📊 读取到 ${studentsData.length} 条学生记录`)
    
    // 先检查数据样本，确定专业字段名
    if (studentsData.length > 0) {
      console.log(`🔍 数据样本字段:`, Object.keys(studentsData[0]))
      console.log(`🎯 第一条记录:`, studentsData[0])
    }
    
    // 获取年级对应的专业配置
    const MAJOR_CONFIGS: { [key: string]: any } = {
      '2021': {
        majors: ['物联网工程', '电信工程及管理', '电子商务及法律']
      },
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
    
    const config = MAJOR_CONFIGS[year]
    if (!config) {
      throw new Error(`不支持的年级: ${year}，支持的年级: ${Object.keys(MAJOR_CONFIGS).join(', ')}`)
    }
    
    console.log(`📋 ${year}年级支持的专业:`, config.majors)
    
    // 统计实际数据中的专业分布
    const majorStats = new Map<string, number>()
    studentsData.forEach((student: any) => {
      const majorName = student.Current_Major || student['专业'] || student['Major'] || '未知专业'
      majorStats.set(majorName, (majorStats.get(majorName) || 0) + 1)
    })
    
    console.log(`📊 实际数据中的专业分布 (前10个):`)
    const sortedMajors = Array.from(majorStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    sortedMajors.forEach(([major, count]) => {
      console.log(`   "${major}": ${count} 名学生`)
    })
    
    // 按专业分组（使用与批量预测API相同的逻辑）
    const majorGroups = new Map<string, any[]>()
    
    // 初始化各专业分组
    config.majors.forEach((major: string) => {
      majorGroups.set(major, [])
    })
    
    // 专业名称映射表（处理特殊专业名称）
    const MAJOR_NAME_MAPPING: { [key: string]: string } = {
      // 创新创业类专业映射
      '创新创业（宽带通信和光电科技方向）': '电信工程及管理',
      '创新创业（互联网科技方向）': '电信工程及管理',
      '创新创业（移动互联网方向）': '电信工程及管理',
      '创新创业（物联网方向）': '物联网工程',
      '创新创业（人工智能方向）': '智能科学与技术',
      '创新创业（电子信息方向）': '电子信息工程',
      
      // 其他可能的专业别名
      '电信工程': '电信工程及管理',
      '电子工程': '电子信息工程',
      '人工智能': '智能科学与技术',
      '智能科学': '智能科学与技术',
      '物联网': '物联网工程',
      
      // 历史专业名称映射
      '通信工程': '电信工程及管理',
      '信息工程': '电子信息工程',
    }
    
    // 分组学生数据
    let unmatchedCount = 0
    studentsData.forEach((student: any) => {
      const originalMajor = student.Current_Major || student['专业'] || student['Major'] || ''
      
      // 首先检查是否有直接映射
      let currentMajor = MAJOR_NAME_MAPPING[originalMajor] || originalMajor
      
      // 查找匹配的专业（支持模糊匹配）
      let targetMajor = null
      for (const major of config.majors) {
        if (currentMajor.includes(major) || major.includes(currentMajor) || currentMajor === major) {
          targetMajor = major
          break
        }
      }
      
      if (targetMajor) {
        majorGroups.get(targetMajor)!.push(student)
      } else {
        unmatchedCount++
        if (unmatchedCount <= 5) { // 只显示前5个未匹配的
          if (originalMajor !== currentMajor) {
            console.warn(`🔍 学生专业不匹配: "${originalMajor}" → "${currentMajor}" (映射后仍未匹配)`)
          } else {
            console.warn(`🔍 学生专业不匹配: "${originalMajor}"`)
          }
        }
      }
    })
    
    console.log(`⚠️ 未匹配到专业的学生数量: ${unmatchedCount}`)
    
    // 移除空分组
    const emptyMajors: string[] = []
    majorGroups.forEach((students, major) => {
      if (students.length === 0) {
        majorGroups.delete(major)
        emptyMajors.push(major)
      }
    })
    
    if (emptyMajors.length > 0) {
      console.log(`📝 空专业分组已移除: ${emptyMajors.join(', ')}`)
    }
    
    console.log(`📋 分组结果: ${majorGroups.size} 个专业`)
    majorGroups.forEach((students, major) => {
      console.log(`  - ${major}: ${students.length} 名学生`)
    })
    
    // 检查是否有学生被成功分组
    if (majorGroups.size === 0) {
      throw new Error(`没有学生被正确分配到专业。请检查Excel文件中的专业字段是否正确。\n` +
                     `支持的专业: ${config.majors.join(', ')}\n` +
                     `支持的专业字段名: Current_Major, 专业, Major`)
    }
    
    let totalGroupedStudents = 0
    majorGroups.forEach((students) => {
      totalGroupedStudents += students.length
    })
    
    if (totalGroupedStudents === 0) {
      throw new Error(`所有学生都未能匹配到支持的专业。\n` +
                     `总学生数: ${studentsData.length}\n` +
                     `未匹配学生数: ${unmatchedCount}\n` +
                     `支持的专业: ${config.majors.join(', ')}`)
    }
    
    if (unmatchedCount > 0) {
      console.warn(`⚠️ 注意: ${unmatchedCount}/${studentsData.length} 学生未能匹配专业，将被跳过`)
    }
    
    const outputFiles: string[] = []
    let totalStudents = 0
    let output = `=== 阿里云预测开始 ===\n`
    
    // 并发预测所有专业
    const maxConcurrency = 2
    const majorEntries = Array.from(majorGroups.entries())
    const allResults: any[] = []
    
    for (let i = 0; i < majorEntries.length; i += maxConcurrency) {
      const batch = majorEntries.slice(i, i + maxConcurrency)
      
      const batchPromises = batch.map(async ([major, students]) => {
        return await predictMajor(major, students, year)
      })
      
      const batchResults = await Promise.all(batchPromises)
      allResults.push(...batchResults)
    }
    
    // 处理预测结果 - 修复数据结构检查
    for (const majorResult of allResults) {
      console.log(`🔍 检查 ${majorResult.major || '未知专业'} 的结果结构:`, {
        hasSuccess: majorResult.success !== undefined,
        successValue: majorResult.success,
        hasResult: majorResult.result !== undefined,
        hasResultResults: majorResult.result?.results !== undefined,
        hasResultData: majorResult.result?.data !== undefined,
        resultKeys: majorResult.result ? Object.keys(majorResult.result) : [],
      })
      
      // 详细查看results的内容
      if (majorResult.result?.results) {
        console.log(`🔍 ${majorResult.major} results详细内容:`)
        console.log(`   - results类型:`, typeof majorResult.result.results)
        console.log(`   - results是否为数组:`, Array.isArray(majorResult.result.results))
        if (Array.isArray(majorResult.result.results)) {
          console.log(`   - results长度:`, majorResult.result.results.length)
          if (majorResult.result.results.length > 0) {
            console.log(`   - results[0]结构:`, Object.keys(majorResult.result.results[0]))
            console.log(`   - results[0]内容预览:`, JSON.stringify(majorResult.result.results[0]).substring(0, 200))
          }
        } else {
          console.log(`   - results对象keys:`, Object.keys(majorResult.result.results))
          console.log(`   - results.Predictions存在:`, majorResult.result.results.Predictions !== undefined)
          if (majorResult.result.results.Predictions) {
            console.log(`   - Predictions长度:`, majorResult.result.results.Predictions?.length || 0)
          }
        }
      }
      
      let predictions = null
      const majorName = majorResult.major
      
      // 解析阿里云API响应格式 (根据我们的robust_api_server.py)
      if (majorResult.success && majorResult.result) {
        // 阿里云API返回格式: majorResult.result.data.results[0].result.results.Predictions
        if (majorResult.result.data?.results && Array.isArray(majorResult.result.data.results)) {
          const successResult = majorResult.result.data.results.find((r: any) => 
            r.success && r.major === majorName && r.result?.results?.Predictions
          )
          if (successResult && successResult.result.results.Predictions) {
            predictions = successResult.result.results.Predictions
            console.log(`📊 ✅ 获取 ${majorName} 预测数据: ${predictions.length} 条记录`)
          } else {
            console.log(`📊 ⚠️ ${majorName} 在results数组中未找到成功的预测结果`)
            console.log(`   - results数组长度: ${majorResult.result.data.results.length}`)
            majorResult.result.data.results.forEach((r: any, i: number) => {
              console.log(`   - results[${i}]: major="${r.major}", success=${r.success}, hasPredictions=${!!r.result?.results?.Predictions}`)
            })
          }
        } else {
          console.log(`📊 ❌ ${majorName} API响应格式不符合预期`)
          console.log(`   - majorResult.result.data存在: ${!!majorResult.result.data}`)
          console.log(`   - majorResult.result.data.results存在: ${!!majorResult.result.data?.results}`)
          console.log(`   - majorResult.result.data.results是数组: ${Array.isArray(majorResult.result.data?.results)}`)
        }
        
        // 处理预测数据
        if (predictions && predictions.length > 0) {
          // 获取专业代码
          const majorCode = MAJOR_CODE_MAP[majorName] || 'unknown'
          const outputFile = `Cohort${year}_Predictions_${majorCode}.xlsx`
          const outputPath = join(tempDir, outputFile)
          
          // 生成Excel文件
          try {
            // 确保输出目录存在
            const fs = require('fs')
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true })
              console.log(`📁 创建输出目录: ${tempDir}`)
            }
            
            const workbook = XLSX.utils.book_new()
            const worksheet = XLSX.utils.json_to_sheet(predictions)
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Predictions')
            
            // 添加统计信息
            if (majorResult.result?.statistics) {
              const statsSheet = XLSX.utils.json_to_sheet([{
                专业: majorName,
                学生数量: predictions.length,
                生成时间: new Date().toLocaleString(),
                ...majorResult.result.statistics
              }])
              XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics')
            }
            
            // 使用buffer方式写入文件，更安全
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
            fs.writeFileSync(outputPath, buffer)
            
            console.log(`✅ 生成 ${majorName} 预测文件: ${outputFile} (${predictions.length}名学生)`)
            outputFiles.push(outputFile)
            totalStudents += predictions.length
            output += `✓ ${majorName}: ${predictions.length} 名学生\n`
            
          } catch (fileError) {
            console.error(`❌ 保存 ${majorName} 预测文件失败:`, fileError)
            // 继续处理其他专业，不要因为一个文件失败就停止
            output += `✗ ${majorName}: 文件保存失败 - ${fileError.message}\n`
          }
        } else {
          console.log(`⚠️ ${majorName} 专业无预测数据`)
          console.log(`   - predictions为空:`, predictions === null)
          console.log(`   - predictions长度:`, predictions?.length || 0)
          output += `⚠️ ${majorName}: 无预测数据\n`
        }
      } else {
        console.log(`❌ ${majorResult.major} 专业预测失败: ${majorResult.error || '未知错误'}`)
        console.log(`   - success值:`, majorResult.success)
        console.log(`   - 错误详情:`, majorResult.error)
        output += `✗ ${majorResult.major}: 预测失败 - ${majorResult.error || '未知错误'}\n`
      }
    }
    
    // 生成汇总文件  
    if (outputFiles.length > 0) {
      const summaryFile = `Cohort${year}_Predictions_All.xlsx`
      const summaryPath = join(tempDir, summaryFile)
      
      try {
        const allPredictions: any[] = []
        for (const majorResult of allResults) {
          let predictions = null
          
          // 使用相同的数据结构检查逻辑
          if (majorResult.success) {
            if (majorResult.result?.results?.Predictions) {
              predictions = majorResult.result.results.Predictions
            } else if (majorResult.result?.data?.results) {
              if (Array.isArray(majorResult.result.data.results)) {
                const successResult = majorResult.result.data.results.find((r: any) => r.success && r.result?.results?.Predictions)
                if (successResult) {
                  predictions = successResult.result.results.Predictions
                }
              } else {
                predictions = majorResult.result.data.results.Predictions
              }
            } else if (majorResult.result && Array.isArray(majorResult.result)) {
              predictions = majorResult.result
            } else if (Array.isArray(majorResult.predictions)) {
              predictions = majorResult.predictions
            }
          }
          
          if (predictions && predictions.length > 0) {
            const processedPredictions = predictions.map((row: any) => ({
              ...row,
              Major: majorResult.major
            }))
            allPredictions.push(...processedPredictions)
            console.log(`📊 汇总文件添加 ${majorResult.major}: ${predictions.length} 条记录`)
          }
        }
        
        if (allPredictions.length > 0) {
          try {
            const workbook = XLSX.utils.book_new()
            const worksheet = XLSX.utils.json_to_sheet(allPredictions)
            XLSX.utils.book_append_sheet(workbook, worksheet, 'All_Predictions')
            
            // 使用buffer方式写入汇总文件
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
            const fs = require('fs')
            fs.writeFileSync(summaryPath, buffer)
            
            outputFiles.push(summaryFile)
            console.log(`✅ 生成汇总文件: ${summaryFile}`)
            output += `✓ 汇总文件: ${allPredictions.length} 名学生\n`
          } catch (summaryFileError) {
            console.error(`❌ 保存汇总文件失败:`, summaryFileError)
            output += `✗ 汇总文件: 保存失败 - ${summaryFileError.message}\n`
          }
        }
      } catch (summaryError) {
        console.error(`⚠️ 生成汇总文件失败:`, summaryError)
      }
    }
    
    output += `\n=== 🎉 阿里云预测完成 ===\n`
    output += `✓ 处理学生: ${totalStudents} 人\n`
    output += `✓ 生成文件: ${outputFiles.length} 个\n`
    
    console.log(output)
    
    return {
      success: outputFiles.length > 0,
          output: output,
      error: undefined,
          outputFiles: outputFiles
    }
    
      } catch (error) {
    console.error(`❌ 阿里云预测调用失败:`, error)
    return {
        success: false,
      output: `阿里云预测调用失败`,
      error: error instanceof Error ? error.message : '未知错误',
        outputFiles: []
    }
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

    // 创建临时目录 (兼容Vercel serverless环境)
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? '/tmp' 
      : process.cwd()
    const tempDir = join(baseDir, 'temp_predictions', `prediction_${Date.now()}`)
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true })
    }

    // 保存上传的文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadedFilePath = join(tempDir, file.name)
    await writeFile(uploadedFilePath, buffer)

    console.log(`文件已保存到: ${uploadedFilePath}`)
    console.log(`开始为${year}级处理...`)

    // 第一步：导入成绩数据到 academic_results 表
    console.log(`步骤 1/2: 导入成绩数据到数据库...`)
    let academicImportResult = null
    try {
      academicImportResult = await importAcademicResults(uploadedFilePath, year)
      if (academicImportResult.success && academicImportResult.directInsert) {
        console.log(`✅ 成绩数据直接导入完成`)
        console.log(`✅ 成功导入 ${academicImportResult.recordCount}/${academicImportResult.totalRecords} 条记录`)
        if (academicImportResult.errors && academicImportResult.errors.length > 0) {
          console.log(`⚠️ 有 ${academicImportResult.errors.length} 个批次出现错误`)
        }
      }
    } catch (error) {
      console.error(`成绩数据导入失败:`, error)
      // 导入失败，但不阻止预测继续进行
      console.log(`⚠️ 成绩数据导入失败，但预测将继续进行`)
    }

    // 第二步：运行预测算法
    console.log(`步骤 2/2: 运行预测算法...`)
    const result = await runPrediction(uploadedFilePath, year, tempDir)

    if (result.success) {
      // 计算处理的学生数量（从输出日志中提取）
      const studentCountMatch = result.output.match(/处理学生:\s*(\d+)\s*人/)
      const processedStudents = studentCountMatch ? parseInt(studentCountMatch[1]) : 0
      
      console.log('预测算法执行完成，等待文件系统同步...')
      
      // 等待10秒确保Python进程完全释放文件并写入完成
      await new Promise(resolve => setTimeout(resolve, 10000))
      console.log('文件系统同步等待完成，开始数据库导入流程...')
      
      console.log('开始导入数据库...')
      
      // 导入预测文件到数据库
      const importResults = {
        predictions: [] as string[],
        probability: false,
        errors: [] as string[]
      }
      
      try {
        // 导入各专业的预测数据
        for (const outputFile of result.outputFiles) {
          if (outputFile.includes('_All.xlsx')) {
            // 跳过汇总文件
            continue
          }
          
          // 从文件名提取专业信息
          const match = outputFile.match(/Cohort\d+_Predictions_(\w+)\.xlsx/)
          if (match) {
            const majorCode = match[1]
            const majorName = Object.keys(MAJOR_CODE_MAP).find(key => MAJOR_CODE_MAP[key] === majorCode)
            
            if (majorName) {
              const filePath = join(tempDir, outputFile)
              try {
                const predictionResult = await importPredictionToDatabase(filePath, year, majorName)
                if (predictionResult.success && predictionResult.directInsert) {
                  console.log(`✅ ${majorName} 预测数据直接导入完成: ${predictionResult.recordCount}/${predictionResult.totalRecords} 条记录`)
                  importResults.predictions.push(`${majorName} (${predictionResult.recordCount}条)`)
                } else {
                  throw new Error('数据库直接导入失败')
                }
              } catch (error) {
                const errorMsg = `${majorName} 专业预测数据导入失败: ${error instanceof Error ? error.message : String(error)}`
                console.error(`❌ ${errorMsg}`)
                
                // 立即返回错误，不继续处理其他专业
                return NextResponse.json({
                  success: false,
                  error: '预测数据导入数据库失败',
                  details: errorMsg,
                  failedMajor: majorName,
                  failedFile: outputFile,
                  year: year,
                  processedStudents: processedStudents,
                  outputFiles: result.outputFiles,
                  tempDir: tempDir,
                  log: result.output,
                  instructions: '请检查数据库表结构是否包含所需的字段，或联系管理员处理'
                }, { status: 500 })
              }
            }
          }
        }
        
        // 更新概率表
        try {
          const probabilityResult = await updateProbabilityTable(tempDir, year)
          if (probabilityResult && probabilityResult.success && probabilityResult.directInsert) {
            console.log(`✅ 概率表数据直接导入完成: ${probabilityResult.recordCount}/${probabilityResult.totalRecords} 条记录`)
            importResults.probability = `成功 (${probabilityResult.recordCount}条)`
          } else {
            console.log('⚠️ 概率表没有数据需要更新')
            importResults.probability = '跳过 (无数据)'
          }
        } catch (error) {
          const errorMsg = `概率表数据导入失败: ${error instanceof Error ? error.message : String(error)}`
          console.error(`❌ ${errorMsg}`)
          
          // 立即返回错误
          return NextResponse.json({
            success: false,
            error: '概率表数据导入数据库失败',
            details: errorMsg,
            year: year,
            processedStudents: processedStudents,
            outputFiles: result.outputFiles,
            tempDir: tempDir,
            log: result.output,
            instructions: '预测文件已生成成功，但概率表更新失败，请联系管理员处理'
          }, { status: 500 })
        }
        
        console.log('数据库直接导入完成')
        
      } catch (error) {
        console.error('数据库导入过程中发生错误:', error)
        importResults.errors.push(`数据库导入失败: ${error}`)
      }

      return NextResponse.json({
        success: true,
        message: `✅ 成功完成${year}级学生去向预测和数据库导入`,
        year: year,
        processedStudents: processedStudents,
        outputFiles: result.outputFiles,
        tempDir: tempDir,
        log: result.output,
        importResults: importResults,
        academicImportResult: academicImportResult, // 包含直接导入结果信息
        instructions: academicImportResult?.directInsert 
          ? '✅ 成绩数据和预测数据都已直接导入数据库'
          : '📝 如有需要，请检查MCP工具执行状态'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '预测处理失败',
        details: result.error || '未知错误',
        log: result.output,
        errors: [result.error || '预测脚本执行失败']
      }, { status: 500 })
    }

  } catch (error) {
    console.error('预测API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
