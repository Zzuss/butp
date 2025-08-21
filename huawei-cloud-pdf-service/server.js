const express = require('express');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3000;
const PDF_SERVICE_KEY = process.env.PDF_SERVICE_KEY || 'huawei-pdf-2024-secure-key';

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
});

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS配置 - 允许来自butp.tech的请求
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://butp.tech',
    'https://www.butp.tech',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-pdf-key, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  } else {
    next();
  }
});

// API密钥验证中间件
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-pdf-key'];
  if (!apiKey || apiKey !== PDF_SERVICE_KEY) {
    logger.warn('Unauthorized API access attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      apiKey: apiKey ? 'provided' : 'missing'
    });
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: '需要有效的API密钥' 
    });
  }
  next();
};

// 限流配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 每个IP最多50次请求
  message: {
    error: 'Too many requests',
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/generate-pdf', limiter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'huawei-cloud-pdf-service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    uptime: process.uptime()
  });
});

// 服务信息端点
app.get('/info', (req, res) => {
  res.json({
    service: 'PDF Generation Service',
    provider: '华为云',
    features: [
      'HTML to PDF conversion',
      'URL to PDF conversion', 
      'Authentication support',
      'Chinese font support',
      'High quality rendering'
    ],
    limits: {
      maxRequestSize: '50MB',
      rateLimit: '50 requests per 15 minutes',
      timeout: '60 seconds'
    }
  });
});

// PDF生成端点
app.post('/generate-pdf', verifyApiKey, async (req, res) => {
  let browser = null;
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    const { 
      url, 
      html, 
      cookies = [], 
      pdfOptions = {}, 
      viewportWidth = 1366,
      filename 
    } = req.body;

    logger.info('PDF generation request received', {
      requestId,
      url: url?.substring(0, 50) + (url?.length > 50 ? '...' : ''),
      hasHtml: !!html,
      htmlLength: html?.length || 0,
      viewportWidth,
      clientIP: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });

    // 验证请求参数
    if (!url && !html) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '需要提供 url 或 html 参数' 
      });
    }

    // 启动Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
    });

    const page = await browser.newPage();

    // 设置视窗
    await page.setViewport({ 
      width: viewportWidth, 
      height: 900,
      deviceScaleFactor: 2
    });

    // 设置用户代理
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 处理认证cookie（支持从请求头和body传递）
    const allCookies = [];
    
    // 从请求头获取cookie
    if (req.headers.cookie) {
      try {
        const headerCookies = req.headers.cookie.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=');
          return {
            name: name?.trim() || '',
            value: value?.trim() || '',
            domain: url ? new URL(url).hostname : 'localhost',
            path: '/'
          };
        }).filter(c => c.name && c.value);
        allCookies.push(...headerCookies);
      } catch (e) {
        logger.warn('Failed to parse cookies from headers', { error: e.message });
      }
    }
    
    // 从body获取cookie
    if (cookies && cookies.length > 0) {
      allCookies.push(...cookies);
    }

    // 设置cookie
    if (allCookies.length > 0) {
      try {
        await page.setCookie(...allCookies);
        logger.info('Cookies set successfully', { 
          requestId, 
          cookieCount: allCookies.length 
        });
      } catch (e) {
        logger.warn('Failed to set cookies', { 
          requestId, 
          error: e.message 
        });
      }
    }

    // 加载内容
    if (html) {
      logger.info('Loading HTML content', { requestId });
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
    } else if (url) {
      logger.info('Navigating to URL', { requestId, url });
      
      // 检查URL是否可访问
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle0',
          timeout: 60000 
        });
      } catch (gotoError) {
        logger.error('Failed to navigate to URL', {
          requestId,
          url,
          error: gotoError.message
        });
        throw new Error(`无法访问URL: ${gotoError.message}`);
      }
    }

    // 等待页面完全渲染
    await page.waitForTimeout(2000);

    // 注入中文字体和样式优化
    await page.addStyleTag({
      content: `
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", "WenQuanYi Zen Hei", "SimHei", "SimSun", sans-serif !important;
        }
        .no-export, .no-print {
          display: none !important;
        }
        /* 隐藏可能的导航和不必要元素 */
        nav, .navbar, .sidebar, .fixed, .sticky {
          display: none !important;
        }
      `
    });

    // 检查页面是否为登录页面
    const pageTitle = await page.title();
    const pageUrl = await page.url();
    
    if (pageTitle.includes('登录') || pageTitle.includes('Login') || 
        pageUrl.includes('/login') || pageUrl.includes('/auth')) {
      logger.warn('Detected login page', {
        requestId,
        title: pageTitle,
        url: pageUrl
      });
    }

    // PDF生成选项
    const finalOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      ...pdfOptions
    };

    // 生成PDF
    logger.info('Starting PDF generation', { requestId });
    const pdfBuffer = await page.pdf(finalOptions);

    // 设置响应头
    const downloadFilename = filename || `huawei_export_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

    const duration = Date.now() - startTime;
    logger.info('PDF generation completed successfully', {
      requestId,
      filename: downloadFilename,
      size: pdfBuffer.length,
      duration: duration + 'ms',
      sizeKB: Math.round(pdfBuffer.length / 1024) + 'KB'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('PDF generation failed', {
      requestId,
      error: error.message,
      stack: error.stack,
      duration: duration + 'ms'
    });
    
    res.status(500).json({ 
      error: 'PDF generation failed', 
      message: error.message,
      requestId
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: '服务器内部错误'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: '请求的资源不存在'
  });
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`华为云PDF服务已启动`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid
  });
  console.log(`🚀 华为云PDF服务已启动在端口 ${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📊 服务信息: http://localhost:${PORT}/info`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// 错误处理
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

module.exports = app;
