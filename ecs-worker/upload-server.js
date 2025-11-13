const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const winston = require('winston')
require('dotenv').config()

const app = express()
const PORT = process.env.UPLOAD_PORT || 3001

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/upload.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, 'temp')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    // 使用传入的fileId作为文件名
    const fileId = req.body.fileId
    const extension = path.extname(file.originalname) || '.xlsx'
    cb(null, `${fileId}${extension}`)
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  },
  fileFilter: function (req, file, cb) {
    // 检查文件类型
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持Excel文件'))
    }
  }
})

// 中间件
app.use(express.json())
app.use((req, res, next) => {
  // 允许跨域
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// 文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有找到文件'
      })
    }

    const { fileId, originalName } = req.body
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: '缺少文件ID'
      })
    }

    logger.info(`📁 文件上传成功: ${originalName} -> ${req.file.filename}`)
    logger.info(`   文件大小: ${req.file.size} bytes`)
    logger.info(`   存储路径: ${req.file.path}`)

    res.json({
      success: true,
      message: '文件上传成功',
      file: {
        id: fileId,
        originalName: originalName,
        filename: req.file.filename,
        size: req.file.size,
        path: req.file.path
      }
    })

  } catch (error) {
    logger.error('文件上传失败:', error)
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      details: error.message
    })
  }
})

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// 文件列表接口
app.get('/files', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
      .map(file => {
        const filePath = path.join(UPLOAD_DIR, file)
        const stats = fs.statSync(filePath)
        return {
          filename: file,
          size: stats.size,
          uploadTime: stats.mtime.toISOString()
        }
      })

    res.json({
      success: true,
      files: files,
      count: files.length
    })

  } catch (error) {
    logger.error('获取文件列表失败:', error)
    res.status(500).json({
      success: false,
      error: '获取文件列表失败'
    })
  }
})

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件太大，最大支持50MB'
      })
    }
  }

  logger.error('服务器错误:', error)
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  })
})

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 文件上传服务启动成功`)
  logger.info(`📡 监听端口: ${PORT}`)
  logger.info(`📁 上传目录: ${UPLOAD_DIR}`)
  logger.info(`🌐 健康检查: http://localhost:${PORT}/health`)
})

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('🛑 收到关闭信号，正在关闭服务器...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('🛑 收到终止信号，正在关闭服务器...')
  process.exit(0)
})
