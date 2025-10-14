import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync, mkdirSync } from 'fs'

// 专业代码映射
const MAJOR_CODE_MAP: { [key: string]: string } = {
  '智能科学与技术': 'ai',
  '电子信息工程': 'ee',
  '物联网工程': 'iot',
  '电信工程及管理': 'tewm'
}

// 反向映射：代码到专业名
const CODE_MAJOR_MAP: { [key: string]: string } = {
  'ai': '智能科学与技术',
  'ee': '电子信息工程',
  'iot': '物联网工程',
  'tewm': '电信工程及管理'
}

// Excel列名到数据库字段名的映射
const COLUMN_NAME_MAP: Record<string, string> = {
  // 移除星号和多余空格的映射（为Excel文件中可能存在的带星号字段）
  '线性代数*': '线性代数',
  '高等数学A(上) *': '高等数学A(上)',
  '高等数学A(下) *': '高等数学A(下)',
  '数据结构*': '数据结构',
  '数据库系统*': '数据库系统',
  '数字电路设计*': '数字电路设计',
  'JAVA高级语言程序设计*': 'JAVA高级语言程序设计',
  '操作系统*': '操作系统',
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
  
  // 23级特有课程映射（从Excel带星号到数据库不带星号）
  '通信与网络*': '通信与网络',
  '密码学与网络安全*': '密码学与网络安全',
  '无线射频识别(RFID) *': '无线射频识别(RFID)',
  '无线传感器网络*': '无线传感器网络',
  '云计算*': '云计算',
  '物联网工程实践*': '物联网工程实践',
  '智能基础架构与数据架构*': '智能基础架构与数据架构',
  '物联网技术导论*': '物联网技术导论',
  '工程数学*': '工程数学',
  '概率论与随机过程*': '概率论与随机过程',
  '程序设计基础*': '程序设计基础',
  '电子系统基础*': '电子系统基础',
  '电子电路基础*': '电子电路基础',
  '信号与系统*': '信号与系统',
  '数字信号处理*': '数字信号处理',
  '企业管理*': '企业管理',
  '互联网协议与网络*': '互联网协议与网络',
  '电磁场与电磁波*': '电磁场与电磁波',
  '产品开发与营销*': '产品开发与营销',
  '数字系统设计*': '数字系统设计',
  '高级网络程序设计*': '高级网络程序设计',
  '微波、毫米波与光传输*': '微波、毫米波与光传输',
  '微处理器系统设计*': '微处理器系统设计',
  '现代无线技术*': '现代无线技术',
  '宽带技术与光纤*': '宽带技术与光纤',
  '企业技术战略*': '企业技术战略',
  '大学物理D（上）*': '大学物理D（上）',
  '大学物理D（下）*': '大学物理D（下）',
  
  // EE专业特有课程映射
  '多媒体基础*': '多媒体基础',
  '数字音频基础*': '数字音频基础',
  '高级变换*': '高级变换',
  '图形与视频处理*': '图形与视频处理',
  '交互式媒体设计*': '交互式媒体设计',
  '深度学习与计算视觉*': '深度学习与计算视觉',
  '数据设计*': '数据设计',
  
  // 实训课程映射
  'Design & Build实训（智能）': 'Design & Build实训（智能）',
  'Design & Build实训': 'Design & Build实训',
  'Design & Build实训（电子）': 'Design & Build实训（电子）',
  
  // 其他课程映射
  '中间件技术*': '中间件技术',
  'Java高级语言程序设计*': 'Java高级语言程序设计',
  '工程创新与技术*': '工程创新与技术',
  
  // 长名称缩写映射
  '习近平新时代中国特色社会主义思想概论': '习概',
  '习近平新时代中国特色社会主义思想概论（实践环节）': '习概（实践环节）',
  '毛泽东思想和中国特色社会主义理论体系概论': '毛概',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节）': '毛概（实践环节）',
  
  // 处理多余括号的映射（Excel文件格式错误修复）
  '习近平新时代中国特色社会主义思想概论（实践环节））': '习概（实践环节）',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节））': '毛概（实践环节）',
}

// 将Excel列名映射为数据库字段名
function mapColumnName(excelColumnName: string): string {
  return COLUMN_NAME_MAP[excelColumnName] || excelColumnName
}

// 从文件名检测专业信息
function detectMajorFromFilename(filename: string): string | null {
  for (const [majorName, majorCode] of Object.entries(MAJOR_CODE_MAP)) {
    if (filename.toLowerCase().includes(`_${majorCode}.xlsx`) || 
        filename.toLowerCase().includes(`_${majorCode}_`)) {
      return majorName
    }
  }
  return null
}

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

// 导入预测文件到数据库的核心函数
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
      return {
        success: false,
        recordCount: 0,
        totalRecords: 0,
        errors: ['文件中没有数据'],
        tableName: tableName
      }
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
    
    // 直接插入数据库
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
      tableName: tableName
    }
    
  } catch (error) {
    console.error(`导入 ${majorName} 预测数据失败:`, error)
    throw error
  }
}

// 更新概率表（从预测数据中提取概率信息）
async function updateProbabilityTableFromFile(filePath: string, year: string, majorName: string) {
  try {
    console.log(`开始从文件提取概率数据: ${filePath}`)
    
    // 等待文件基本可访问
    const fileReady = await waitForFile(filePath)
    if (!fileReady) {
      console.log(`概率文件在等待时间内不可访问，跳过: ${filePath}`)
      return { success: false, recordCount: 0, errors: ['文件不可访问'] }
    }
    
    // 使用重试机制读取概率数据
    console.log(`开始读取概率数据: ${filePath}`)
    let jsonData: any[] = []
    
    // 尝试读取文件
    let readSuccess = false
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`概率文件读取尝试 ${attempt}/2...`)
        
        if (attempt === 1) {
          const XLSX = require('xlsx')
          const workbook = XLSX.readFile(filePath)
          const worksheet = workbook.Sheets['Predictions']
          if (worksheet) {
            jsonData = XLSX.utils.sheet_to_json(worksheet)
            readSuccess = true
          }
        } else {
          // 缓冲读取
          const fs = require('fs')
          const XLSX = require('xlsx')
          const buffer = fs.readFileSync(filePath)
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
      console.log(`跳过无法读取的概率文件: ${filePath}`)
      return { success: false, recordCount: 0, errors: ['无法读取文件或文件为空'] }
    }
    
    // 提取概率数据
    const probabilityData = []
    for (const row of jsonData) {
      if (row.SNH && row.current_pred !== undefined) {
        probabilityData.push({
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
    
    if (probabilityData.length === 0) {
      console.log('没有找到概率数据，跳过更新概率表')
      return { success: false, recordCount: 0, errors: ['没有找到有效的概率数据'] }
    }
    
    console.log(`开始导入 ${probabilityData.length} 条概率数据到数据库`)
    
    // 直接插入数据库
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 首先清空表中对应年级和专业的数据
    console.log(`清空概率表中 ${year} 级 ${majorName} 的现有数据...`)
    const { error: deleteError } = await supabase
      .from('cohort_probability')
      .delete()
      .eq('year', parseInt(year))
      .eq('major', majorName)
    
    if (deleteError) {
      console.error(`清空概率表中 ${year} 级 ${majorName} 数据失败:`, deleteError)
    } else {
      console.log(`✓ 概率表中 ${year} 级 ${majorName} 数据清空完成`)
    }
    
    // 批量插入概率数据到数据库
    let processedCount = 0
    const errors: string[] = []
    const batchSize = 1000
    
    console.log(`📊 概率数据导入策略: ${probabilityData.length}条记录，每批${batchSize}条`)
    
    for (let i = 0; i < probabilityData.length; i += batchSize) {
      const batch = probabilityData.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(probabilityData.length / batchSize)
      
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
      if (i + batchSize < probabilityData.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`📊 ${majorName}概率数据导入完成统计: 成功 ${processedCount}/${probabilityData.length} 条记录`)
    
    return { 
      success: processedCount > 0, 
      recordCount: processedCount, 
      totalRecords: probabilityData.length,
      errors: errors
    }
    
  } catch (error) {
    console.error('更新概率表失败:', error)
    return { 
      success: false, 
      recordCount: 0, 
      errors: [error instanceof Error ? error.message : '未知错误'] 
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const year = formData.get('year') as string
    const manualMajor = formData.get('major') as string

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    if (!year || !['2021', '2022', '2023', '2024'].includes(year)) {
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

    // 确定专业
    let majorName = manualMajor
    if (!majorName) {
      majorName = detectMajorFromFilename(file.name)
    }

    if (!majorName || !MAJOR_CODE_MAP[majorName]) {
      return NextResponse.json({ 
        error: `无法确定专业，请检查文件名格式或手动选择专业。支持的专业：${Object.keys(MAJOR_CODE_MAP).join('、')}` 
      }, { status: 400 })
    }

    // 创建临时目录
    const tempDir = join(process.cwd(), 'temp_predictions', `import_${Date.now()}`)
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true })
    }

    // 保存上传的文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadedFilePath = join(tempDir, file.name)
    await writeFile(uploadedFilePath, buffer)

    console.log(`文件已保存到: ${uploadedFilePath}`)
    console.log(`开始导入 ${year}级 ${majorName} 的预测数据...`)

    // 导入预测数据到对应的表
    const importResult = await importPredictionToDatabase(uploadedFilePath, year, majorName)
    
    // 同时更新概率表
    const probabilityResult = await updateProbabilityTableFromFile(uploadedFilePath, year, majorName)
    
    if (importResult.success) {
      console.log(`✅ ${majorName} 预测数据导入完成`)
      
      const allErrors = [...importResult.errors]
      if (probabilityResult.success) {
        console.log(`✅ ${majorName} 概率数据导入完成`)
      } else {
        console.log(`⚠️ ${majorName} 概率数据导入失败`)
        allErrors.push(...probabilityResult.errors)
      }

      return NextResponse.json({
        success: true,
        message: `✅ 成功导入${year}级${majorName}的预测数据`,
        year: year,
        major: majorName,
        importedCount: importResult.recordCount,
        totalCount: importResult.totalRecords,
        tableName: importResult.tableName,
        probabilityImported: probabilityResult.success ? probabilityResult.recordCount : 0,
        errors: allErrors
      })
    } else {
      return NextResponse.json({
        success: false,
        message: `导入${year}级${majorName}的预测数据失败`,
        year: year,
        major: majorName,
        importedCount: 0,
        totalCount: 0,
        tableName: importResult.tableName,
        errors: importResult.errors
      }, { status: 500 })
    }

  } catch (error) {
    console.error('预测表导入API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
