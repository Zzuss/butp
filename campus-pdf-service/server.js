const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 8000;
const PDF_SERVICE_KEY = process.env.PDF_SERVICE_KEY || 'campus-pdf-2024';

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false, // PDF生成需要
}));

// CORS配置 - 允许校内和VPN访问
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的域名列表
    const allowedOrigins = [
      'https://butp.tech',
      'http://localhost:3000',
      /^https?:\/\/.*\.butp\.tech$/,
      /^https?:\/\/10\.3\..*/, // 校内网段
      /^https?:\/\/192\.168\..*/, // 内网段
    ];
    
    // 允许无origin的请求（如Postman）
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-pdf-key'],
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// API密钥验证中间件
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-pdf-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== PDF_SERVICE_KEY) {
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
  max: 100, // 每个IP最多100次请求
  message: {
    error: 'Too many requests',
    message: '请求过于频繁，请稍后再试'
  }
});

app.use('/generate-pdf', limiter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'campus-pdf-service',
    version: '1.0.0'
  });
});

// PDF生成端点
app.post('/generate-pdf', verifyApiKey, async (req, res) => {
  let browser = null;
  const startTime = Date.now();
  
  try {
    const { 
      url, 
      html, 
      cookies = [], 
      pdfOptions = {}, 
      viewportWidth = 1366,
      filename 
    } = req.body;

    console.log(`[${new Date().toISOString()}] PDF生成请求:`, { 
      url: url?.substring(0, 50) + '...', 
      hasHtml: !!html,
      viewportWidth,
      clientIP: req.ip 
    });

    // 启动Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
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

    // 处理认证cookie
    if (req.headers.cookie) {
      try {
        const cookieHeader = req.headers.cookie;
        if (url) {
          const domain = new URL(url).hostname;
          const cookiePairs = cookieHeader.split(/;\s*/).map(pair => {
            const idx = pair.indexOf('=');
            const name = pair.substring(0, idx).trim();
            const value = pair.substring(idx + 1).trim();
            return { name, value, domain };
          }).filter(cookie => cookie.name && cookie.value);
          
          if (cookiePairs.length > 0) {
            await page.setCookie(...cookiePairs);
          }
        }
      } catch (e) {
        console.warn('Cookie设置失败:', e.message);
      }
    }

    // 加载内容
    if (html) {
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
    } else if (url) {
      console.log(`尝试访问URL: ${url}`);
      
      try {
        // 先测试网络连通性（使用Node.js内置模块）
        const https = require('https');
        const http = require('http');
        
        const testConnection = () => {
          return new Promise((resolve) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request({
              hostname: urlObj.hostname,
              port: urlObj.port,
              path: '/',
              method: 'HEAD',
              timeout: 10000
            }, (res) => {
              resolve(true);
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => resolve(false));
            req.end();
          });
        };
        
        const canConnect = await testConnection();
        if (!canConnect) {
          console.warn('网络连通性测试失败');
          // 注意：即使连通性测试失败，仍然尝试用Puppeteer加载页面
        }
        
        // 尝试访问页面
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', // 改为更宽松的等待条件
          timeout: 60000 // 增加超时时间
        });
        
        // 等待页面渲染
        await page.waitForTimeout(3000);
        
      } catch (error) {
        console.error('页面加载失败:', error.message);
        throw new Error(`无法加载页面 ${url}: ${error.message}`);
      }
    } else {
      return res.status(400).json({ error: '需要提供 url 或 html 参数' });
    }

    // 等待页面完全渲染
    await page.waitForTimeout(2000);

    // 注入样式优化 - 支持长内容多页生成
    await page.addStyleTag({
      content: `
        html, body {
          height: auto !important;
          min-height: auto !important;
          overflow: visible !important;
          page-break-inside: auto !important;
        }
        * {
          max-height: none !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          page-break-inside: auto !important;
        }
        
        /* 改善长内容的分页效果 */
        main, .main-content, article {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        
        /* 避免重要内容被截断 */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        
        /* 确保表格和卡片能够合理分页 */
        table, .card, .panel {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        
        /* 隐藏不需要导出的元素 */
        .no-export, .hide-on-pdf { 
          display: none !important; 
        }
        
        /* 打印媒体查询优化 */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `
    });

    // PDF生成选项 - 支持多页长内容
    const defaultPdfOptions = {
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false, // 允许内容超出单页
      margin: { 
        top: '12mm', 
        bottom: '12mm', 
        left: '12mm', 
        right: '12mm' 
      },
      displayHeaderFooter: false,
      // 关键：设置高度为自动，允许多页生成
      height: null, // 自动高度
      // 确保长内容能够正确分页
      pageRanges: '', // 生成所有页面
    };

    const finalOptions = { ...defaultPdfOptions, ...pdfOptions };
    const pdfBuffer = await page.pdf(finalOptions);

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] PDF生成完成: ${duration}ms, ${pdfBuffer.length} bytes`);

    // 设置响应头
    const defaultFilename = filename || `export_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${defaultFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-Generation-Time', `${duration}ms`);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF生成失败:', error);
    res.status(500).json({
      error: 'PDF generation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: '请求的资源不存在'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 校内PDF服务启动成功!`);
  console.log(`📍 服务地址: http://0.0.0.0:${PORT}`);
  console.log(`🔑 API密钥: ${PDF_SERVICE_KEY}`);
  console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务...');
  process.exit(0);
});
