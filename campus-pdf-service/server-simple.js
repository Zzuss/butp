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
    version: '1.0.0'
  });
});

// PDF生成接口
app.post('/generate-pdf', async (req, res) => {
  console.log('收到PDF生成请求:', new Date().toISOString());
  
  try {
    // API密钥验证
    const apiKey = req.headers['x-pdf-key'];
    if (!apiKey || apiKey !== PDF_SERVICE_KEY) {
      return res.status(401).json({ error: '无效的API密钥' });
    }

    const { html, url, viewportWidth = 1366, filename = 'export.pdf', pdfOptions = {} } = req.body;

    if (!html && !url) {
      return res.status(400).json({ error: '需要提供 html 或 url 参数' });
    }

    console.log('启动浏览器...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // 设置视口
    await page.setViewport({
      width: viewportWidth,
      height: 1080,
      deviceScaleFactor: 1
    });

    console.log('加载内容...');
    
    // 加载内容
    if (html) {
      console.log('使用HTML内容...');
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    } else if (url) {
      console.log(`访问URL: ${url}`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    }

    // 等待渲染
    await page.waitForTimeout(2000);

    console.log('生成PDF...');
    
    // PDF选项
    const defaultPdfOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        bottom: '12mm',
        left: '12mm',
        right: '12mm'
      }
    };

    const finalPdfOptions = { ...defaultPdfOptions, ...pdfOptions };
    const pdfBuffer = await page.pdf(finalPdfOptions);

    await browser.close();

    console.log('PDF生成成功，大小:', pdfBuffer.length, 'bytes');

    // 设置响应头
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF生成失败:', error);
    res.status(500).json({ 
      error: 'PDF生成失败', 
      details: error.message 
    });
  }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 校内PDF服务启动成功!`);
  console.log(`📍 服务地址: http://0.0.0.0:${PORT}`);
  console.log(`🔑 API密钥: ${PDF_SERVICE_KEY}`);
  console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
});

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});
