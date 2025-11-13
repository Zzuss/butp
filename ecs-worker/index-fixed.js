const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const winston = require('winston')
const cron = require('node-cron')
require('dotenv').config()

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// 配置
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 1000
const TEMP_DIR = path.join(__dirname, process.env.TEMP_DIR || 'temp')
const MAX_CONCURRENT_TASKS = parseInt(process.env.MAX_CONCURRENT_TASKS) || 2

// 确保临时目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true })
}

class ImportWorker {
  constructor() {
    this.isProcessing = false
    this.currentTasks = new Set()
  }

  // 启动工作进程
  async start() {
    logger.info('🚀 ECS导入工作进程启动')
    
    // 立即检查一次
    await this.processQueue()
    
    // 每30秒检查一次队列
    cron.schedule('*/30 * * * * *', async () => {
      if (!this.isProcessing && this.currentTasks.size < MAX_CONCURRENT_TASKS) {
        await this.processQueue()
      }
    })

    // 每小时清理临时文件
    cron.schedule('0 * * * *', async () => {
      await this.cleanupTempFiles()
    })

    logger.info('✅ 定时任务已启动')
  }

  // 处理队列
  async processQueue() {
    if (this.isProcessing) {
      return
    }

    try {
      this.isProcessing = true
      
      // 查找待处理的任务
      const { data: tasks, error } = await supabase
        .from('import_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(MAX_CONCURRENT_TASKS - this.currentTasks.size)

      if (error) {
        throw error
      }

      if (!tasks || tasks.length === 0) {
        return
      }

      logger.info(`📋 找到 ${tasks.length} 个待处理任务`)

      // 并发处理任务
      const promises = tasks.map(task => this.processTask(task))
      await Promise.all(promises)

    } catch (error) {
      logger.error('处理队列失败:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // 处理单个任务
  async processTask(task) {
    const taskId = task.id
    this.currentTasks.add(taskId)

    try {
      logger.info(`🔄 开始处理任务: ${taskId}`)

      // 标记任务为处理中
      await supabase
        .from('import_tasks')
        .update({ status: 'processing' })
        .eq('id', taskId)

      // 清空影子表
      await this.clearShadowTable()

      // 获取任务的文件列表
      const { data: files, error: filesError } = await supabase
        .from('import_file_details')
        .select('*')
        .eq('task_id', taskId)
        .eq('status', 'pending')

      if (filesError) {
        throw filesError
      }

      if (!files || files.length === 0) {
        throw new Error('没有找到待处理的文件')
      }

      let totalRecords = 0
      let importedRecords = 0
      let hasErrors = false

      // 处理每个文件
      for (const file of files) {
        try {
          const result = await this.processFile(file)
          totalRecords += result.totalRecords
          importedRecords += result.importedRecords
        } catch (fileError) {
          logger.error(`处理文件失败: ${file.file_name}`, fileError)
          hasErrors = true
          
          // 标记文件处理失败
          await supabase
            .from('import_file_details')
            .update({
              status: 'failed',
              error_message: fileError.message
            })
            .eq('id', file.id)
        }
      }

      // 完成任务
      if (hasErrors || importedRecords === 0) {
        await this.failTask(taskId, totalRecords, importedRecords, '部分文件处理失败')
      } else {
        await this.completeTask(taskId, totalRecords, importedRecords)
      }

    } catch (error) {
      logger.error(`任务处理失败: ${taskId}`, error)
      await this.failTask(taskId, 0, 0, error.message)
    } finally {
      this.currentTasks.delete(taskId)
    }
  }

  // 处理单个文件
  async processFile(fileDetail) {
    logger.info(`📄 处理文件: ${fileDetail.file_name}`)

    // 标记文件为处理中
    await supabase
      .from('import_file_details')
      .update({ 
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', fileDetail.id)

    // 下载文件
    const filePath = await this.downloadFile(fileDetail)
    
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (jsonData.length === 0) {
      throw new Error('文件中没有数据')
    }

    // 处理数据
    const processedData = jsonData.map(row => this.mapExcelRow(row))
    
    // 分批导入
    let importedCount = 0
    for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
      const batch = processedData.slice(i, i + BATCH_SIZE)
      
      const { error } = await supabase
        .from('academic_results_old')
        .insert(batch)

      if (error) {
        throw new Error(`批次导入失败: ${error.message}`)
      }

      importedCount += batch.length
      logger.info(`✅ 批次导入成功: ${importedCount}/${processedData.length}`)
    }

    // 更新文件状态
    await supabase
      .from('import_file_details')
      .update({
        status: 'completed',
        records_count: jsonData.length,
        imported_count: importedCount
      })
      .eq('id', fileDetail.id)

    // 清理临时文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    return {
      totalRecords: jsonData.length,
      importedRecords: importedCount
    }
  }

  // 下载文件（智能选择本地或线上）
  async downloadFile(fileDetail) {
    const fileName = `${fileDetail.file_id}.xlsx`
    const filePath = path.join(TEMP_DIR, fileName)
    
    // 如果文件已存在，直接返回
    if (fs.existsSync(filePath)) {
      logger.info(`文件已存在，跳过下载: ${fileName}`)
      return filePath
    }
    
    // 从环境变量获取下载源，或使用默认值
    const downloadSources = process.env.DOWNLOAD_SOURCES 
      ? process.env.DOWNLOAD_SOURCES.split(',')
      : ['https://butp.tech', 'http://localhost:3000', 'http://127.0.0.1:3000']
    
    const downloadUrls = downloadSources.map(source => 
      `${source.trim()}/api/admin/grades-import/download/${fileDetail.file_id}`
    )
    
    for (let i = 0; i < downloadUrls.length; i++) {
      const downloadUrl = downloadUrls[i]
      try {
        logger.info(`📥 尝试从源 ${i + 1} 下载文件: ${downloadUrl}`)
        
        const response = await axios({
          method: 'GET',
          url: downloadUrl,
          responseType: 'stream',
          timeout: 15000, // 15秒超时，因为要尝试多个源
          headers: {
            'User-Agent': 'ECS-Worker/1.0'
          }
        })
        
        const writer = fs.createWriteStream(filePath)
        response.data.pipe(writer)
        
        return new Promise((resolve, reject) => {
          writer.on('finish', () => {
            logger.info(`✅ 文件下载完成: ${fileName} (源: ${i + 1})`)
            resolve(filePath)
          })
          writer.on('error', (error) => {
            logger.error(`❌ 文件写入失败: ${fileName}`, error)
            reject(error)
          })
          
          // 设置超时
          setTimeout(() => {
            writer.destroy()
            reject(new Error('下载超时'))
          }, 20000)
        })
        
      } catch (error) {
        logger.warn(`⚠️ 源 ${i + 1} 下载失败: ${error.message}`)
        
        // 如果不是最后一个源，继续尝试下一个
        if (i < downloadUrls.length - 1) {
          continue
        }
        
        // 所有源都失败了
        logger.error(`❌ 所有下载源都失败: ${fileName}`)
        throw new Error(`文件下载失败: 尝试了 ${downloadUrls.length} 个源，都无法下载`)
      }
    }
  }

  // 数据映射
  mapExcelRow(row) {
    return {
      SNH: row.SNH || null,
      Name: row.Name || null,
      Course_Name: row.Course_Name || null,
      Course_Code: row.Course_Code || null,
      Credit: row.Credit ? parseFloat(row.Credit) : null,
      Grade: row.Grade || null,
      Score: row.Score ? parseFloat(row.Score) : null,
      GPA: row.GPA ? parseFloat(row.GPA) : null,
      Semester: row.Semester || null,
      Exam_Type: row.Exam_Type || null,
      Assessment_Method: row['Assessment_Method '] || row.Assessment_Method || null,
      year: row.year ? parseInt(row.year) : null,
    }
  }

  // 清空影子表
  async clearShadowTable() {
    logger.info('🧹 清空影子表')
    try {
      const { error } = await supabase.rpc('truncate_results_old')
      if (error) {
        throw error
      }
    } catch (error) {
      // 如果RPC失败，使用DELETE
      const { error: deleteError } = await supabase
        .from('academic_results_old')
        .delete()
        .neq('SNH', 'dummy_value_that_should_not_exist')
      
      if (deleteError) {
        throw deleteError
      }
    }
  }

  // 完成任务
  async completeTask(taskId, totalRecords, importedRecords) {
    logger.info(`🎉 任务完成: ${taskId}`)
    
    // 执行原子交换
    const { error: swapError } = await supabase.rpc('swap_results_with_old')
    if (swapError) {
      throw new Error(`原子交换失败: ${swapError.message}`)
    }

    // 更新任务状态
    await supabase
      .from('import_tasks')
      .update({
        status: 'completed',
        total_records: totalRecords,
        imported_records: importedRecords,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
  }

  // 任务失败
  async failTask(taskId, totalRecords, importedRecords, errorMessage) {
    logger.error(`❌ 任务失败: ${taskId} - ${errorMessage}`)
    
    // 清空影子表作为回滚
    await this.clearShadowTable()

    // 更新任务状态
    await supabase
      .from('import_tasks')
      .update({
        status: 'failed',
        total_records: totalRecords,
        imported_records: importedRecords,
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
  }

  // 清理临时文件
  async cleanupTempFiles() {
    try {
      const files = fs.readdirSync(TEMP_DIR)
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24小时

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file)
        const stats = fs.statSync(filePath)
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath)
          logger.info(`🗑️ 清理过期文件: ${file}`)
        }
      }
    } catch (error) {
      logger.error('清理临时文件失败:', error)
    }
  }
}

// 启动工作进程
const worker = new ImportWorker()
worker.start().catch(error => {
  logger.error('启动工作进程失败:', error)
  process.exit(1)
})

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('🛑 收到关闭信号，正在优雅关闭...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('🛑 收到终止信号，正在优雅关闭...')
  process.exit(0)
})
