const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 8000;
const PDF_SERVICE_KEY = process.env.PDF_SERVICE_KEY || 'campus-pdf-2024-1755617095';

// 基础中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 简单的CORS处理
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-pdf-key');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'campus-pdf-service',
    version: '1.0.0',
    features: ['multipage-support', 'html-content', 'auto-pagination']
  });
});

// PDF生成服务 - 支持多页
app.post('/generate-pdf', async (req, res) => {
  const startTime = Date.now();
  let browser = null;
  
  try {
    // API密钥验证
    const apiKey = req.headers['x-pdf-key'];
    if (!apiKey || apiKey !== PDF_SERVICE_KEY) {
      return res.status(401).json({ error: '无效的API密钥' });
    }

    const { 
      url, 
      html, 
      viewportWidth = 1366, 
      filename = `export_${new Date().toISOString().slice(0, 10)}.pdf`,
      pdfOptions = {}
    } = req.body;

    console.log(`[${new Date().toISOString()}] 开始生成PDF: ${filename}`);

    // 启动浏览器
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome'
    });

    const page = await browser.newPage();
    
    // 设置视口
    await page.setViewport({
      width: parseInt(viewportWidth),
      height: 1080,
      deviceScaleFactor: 1
    });

    // 加载内容
    if (html) {
      console.log('使用HTML内容生成PDF');
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
    } else if (url) {
      console.log(`访问URL: ${url}`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
    } else {
      return res.status(400).json({ error: '需要提供 url 或 html 参数' });
    }

    // 等待页面完全渲染
    await page.waitForTimeout(2000);

    // 注入多页支持的CSS样式
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
    res.setHeader('X-Multipage-Support', 'enabled');

    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF生成失败:', error);
    res.status(500).json({ 
      error: '生成PDF失败', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 校内PDF服务 (多页支持版) 启动成功!`);
  console.log(`📍 服务地址: http://0.0.0.0:${PORT}`);
  console.log(`🔑 API密钥: ${PDF_SERVICE_KEY}`);
  console.log(`✨ 功能: 多页PDF生成, HTML内容支持, 智能分页`);
  console.log(`📋 健康检查: http://0.0.0.0:${PORT}/health`);
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
