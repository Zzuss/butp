import { existsSync, readFileSync } from 'fs'

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
  '习近平新时代中国特色社会主义思想概论（实践环节））': '习概（实践环节）', // 修复多余括号
  '习近平新时代中国特色社会主义思想概论(实践环节)': '习概（实践环节）', // 英文括号版本
  '习近平新时代中国特色社会主义思想概论(实践环节))': '习概（实践环节）', // 英文左+中文右括号
  '毛泽东思想和中国特色社会主义理论体系概论': '毛概',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节）': '毛概（实践环节）',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节））': '毛概（实践环节）', // 修复多余括号
  '毛泽东思想和中国特色社会主义理论体系概论(实践环节)': '毛概（实践环节）', // 英文括号版本
  '毛泽东思想和中国特色社会主义理论体系概论(实践环节))': '毛概（实践环节）', // 英文左+中文右括号
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

// 导入成绩数据到academic_results表
export async function importAcademicResults(filePath: string, year: string) {
  try {
    console.log(`开始导入成绩数据到 academic_results 表，文件: ${filePath}`)
    
    // 读取Excel文件
    const XLSX = require('xlsx')
    
    // 使用可靠的buffer读取方式
    console.log(`📁 读取成绩文件: ${filePath}`)
    if (!existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`)
    }
    
    const fileBuffer = readFileSync(filePath)
    console.log(`✅ 成绩文件读取成功，大小: ${fileBuffer.length} bytes`)
    
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) {
      throw new Error('Excel文件中没有找到工作表')
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    console.log(`从Excel文件读取到 ${jsonData.length} 条成绩记录`)
    
    if (jsonData.length === 0) {
      console.log('Excel文件中没有数据，跳过导入')
      return {
        success: true,
        recordCount: 0,
        totalRecords: 0,
        errors: [],
        sqlGenerated: false,
        directInsert: true
      }
    }
    
    // 直接操作数据库而不是生成SQL脚本
    console.log(`准备导入成绩数据到数据库`)
    
    // 处理和清理数据
    const processedData = jsonData.map((row: any) => {
      return {
        SNH: row.SNH || null,
        Semester_Offered: row.Semester_Offered || null,
        Current_Major: row.Current_Major || null,
        Course_ID: row.Course_ID || null,
        Course_Name: row.Course_Name || null,
        Grade: row.Grade ? String(row.Grade) : null,
        Grade_Remark: row.Grade_Remark || null,
        Course_Type: row.Course_Type || null,
        Course_Attribute: row['Course_Attribute '] || row.Course_Attribute || null, // 注意空格
        Hours: row.Hours ? String(row.Hours) : null,
        Credit: row.Credit ? String(row.Credit) : null,
        Offering_Unit: row.Offering_Unit || null,
        Tags: row.Tags || null,
        Description: row.Description || null,
        Exam_Type: row.Exam_Type || null,
        Assessment_Method: row['Assessment_Method '] || row.Assessment_Method || null, // 注意空格
        year: parseInt(year)
      }
    })
    
    // 直接批量插入数据库（像SNH页面那样）
    console.log(`开始直接导入成绩数据到数据库，共${processedData.length}条记录...`)
    
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 批量插入数据库（每批1000条，避免超时）
    let processedCount = 0
    const errors: string[] = []
    const batchSize = 1000
    
    console.log(`📊 数据导入策略: ${processedData.length}条记录，每批${batchSize}条`)
    
    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(processedData.length / batchSize)
      
      console.log(`🚀 执行批次 ${batchNum}/${totalBatches}: ${batch.length} 条记录`)
      
      try {
        const { error, count } = await supabase
          .from('academic_results')
          .insert(batch)
        
        if (error) {
          errors.push(`批次 ${batchNum}: ${error.message}`)
          console.error(`❌ 批次 ${batchNum} 失败:`, error.message)
        } else {
          processedCount += batch.length
          console.log(`✅ 批次 ${batchNum}/${totalBatches} 成功: ${batch.length} 条记录`)
        }
      } catch (dbError) {
        const errorMsg = `批次 ${batchNum}: 数据库连接错误`
        errors.push(errorMsg)
        console.error(`❌ 批次 ${batchNum} 数据库错误:`, dbError)
      }
      
      // 添加小延迟，避免过快请求
      if (i + batchSize < processedData.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`📊 导入完成统计: 成功 ${processedCount}/${processedData.length} 条记录`)
    
    if (errors.length > 0) {
      console.log(`⚠️ 导入过程中有 ${errors.length} 个批次出现错误:`)
      errors.forEach(error => console.log(`  - ${error}`))
    }
    
    return { 
      success: processedCount > 0, 
      recordCount: processedCount, 
      totalRecords: processedData.length,
      errors: errors,
      sqlGenerated: false,
      directInsert: true
    }
    
  } catch (error) {
    console.error(`导入成绩数据失败:`, error)
    throw error
  }
}

// 导入预测数据到数据库
export async function importPredictionToDatabase(filePath: string, year: string, major: string) {
  try {
    console.log(`开始导入预测数据: ${filePath} (${year}级 ${major})`)
    
    // 读取Excel文件 (使用buffer方式避免文件访问问题)
    const XLSX = require('xlsx')
    
    console.log(`📁 读取文件: ${filePath}`)
    if (!existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`)
    }
    
    const fileBuffer = readFileSync(filePath)
    console.log(`✅ 文件读取成功，大小: ${fileBuffer.length} bytes`)
    
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) {
      throw new Error('Excel文件中没有找到工作表')
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    console.log(`从预测文件读取到 ${jsonData.length} 条预测记录`)
    
    if (jsonData.length === 0) {
      return {
        success: true,
        recordCount: 0,
        totalRecords: 0,
        errors: [],
        directInsert: true
      }
    }
    
    // 应用字段映射规则 (将长字段名映射为短字段名，去除*号等)
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
    
    // 根据年级确定表名
    const tableMapping: { [key: string]: { [key: string]: string } } = {
      '2022': {
        '智能科学与技术': 'Cohort2022_Predictions_ai',
        '物联网工程': 'Cohort2022_Predictions_iot', 
        '电信工程及管理': 'Cohort2022_Predictions_tewm',
        '电子信息工程': 'Cohort2022_Predictions_ee'
      },
      '2023': {
        '智能科学与技术': 'Cohort2023_Predictions_ai',
        '物联网工程': 'Cohort2023_Predictions_iot',
        '电信工程及管理': 'Cohort2023_Predictions_tewm', 
        '电子信息工程': 'Cohort2023_Predictions_ee'
      },
      '2024': {
        '智能科学与技术': 'Cohort2024_Predictions_ai',
        '物联网工程': 'Cohort2024_Predictions_iot',
        '电信工程及管理': 'Cohort2024_Predictions_tewm',
        '电子信息工程': 'Cohort2024_Predictions_ee'
      }
    }
    
    const tableName = tableMapping[year]?.[major]
    if (!tableName) {
      throw new Error(`不支持的年级或专业: ${year}级 ${major}`)
    }
    
    console.log(`目标表: ${tableName}`)
    
    // 连接数据库
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 导入前先清空该专业的现有预测数据
    console.log(`🗑️ 清空表 ${tableName} 中的现有数据...`)
    const { error: deleteError, count: deletedCount } = await supabase
      .from(tableName)
      .delete({ count: 'exact' })
      .neq('SNH', 'dummy_value_that_should_not_exist') // 删除所有记录
    
    if (deleteError) {
      console.error(`⚠️ 清空表 ${tableName} 失败:`, deleteError)
      // 继续执行，可能是表不存在等情况
    } else {
      console.log(`✅ 已清空 ${deletedCount || 0} 条现有预测数据`)
    }
    
    // 批量插入数据
    let processedCount = 0
    const errors: string[] = []
    const batchSize = 1000
    
    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      
      try {
        const { error } = await supabase
          .from(tableName)
          .insert(batch)
        
        if (error) {
          errors.push(`批次 ${batchNum}: ${error.message}`)
          console.error(`❌ 批次 ${batchNum} 失败:`, error.message)
        } else {
          processedCount += batch.length
          console.log(`✅ 批次 ${batchNum} 成功: ${batch.length} 条记录`)
        }
      } catch (dbError) {
        const errorMsg = `批次 ${batchNum}: 数据库连接错误`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}:`, dbError)
      }
      
      // 添加小延迟
      if (i + batchSize < mappedData.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`📊 预测数据导入完成: 成功 ${processedCount}/${mappedData.length} 条记录`)
    
    return { 
      success: processedCount > 0, 
      recordCount: processedCount, 
      totalRecords: mappedData.length,
      errors: errors,
      directInsert: true
    }
    
  } catch (error) {
    console.error(`导入预测数据失败:`, error)
    throw error
  }
}
