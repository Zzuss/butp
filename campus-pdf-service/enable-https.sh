#!/bin/bash

# 校内PDF服务HTTPS配置脚本

echo "🔒 开始配置校内PDF服务的HTTPS支持..."

# 创建SSL证书目录
mkdir -p ssl

# 生成自签名证书（用于内网）
echo "📜 生成自签名SSL证书..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
  -subj "/C=CN/ST=Guangdong/L=Zhuhai/O=BUTP/OU=PDF Service/CN=10.3.58.3"

# 创建HTTPS版本的服务器
cat > server-https.js << 'EOF'
const express = require('express');
const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 8443; // HTTPS端口

// 读取SSL证书
const options = {
  key: fs.readFileSync('ssl/key.pem'),
  cert: fs.readFileSync('ssl/cert.pem')
};

// 中间件配置
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS配置 - 允许HTTPS访问
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-pdf-key');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  } else {
    next();
  }
});

// API密钥验证
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-pdf-key'];
  if (!apiKey || apiKey !== 'campus-pdf-2024-1755617095') {
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
    service: 'campus-pdf-service-https',
    version: '1.0.0',
    port: PORT,
    protocol: 'https'
  });
});

// PDF生成端点（复制原有逻辑）
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

    console.log(`[${new Date().toISOString()}] HTTPS PDF生成请求:`, { 
      url: url?.substring(0, 50) + '...', 
      hasHtml: !!html,
      viewportWidth,
      clientIP: req.ip 
    });

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
    if (req.headers.cookie || cookies.length > 0) {
      try {
        const cookiesArray = req.headers.cookie ? 
          req.headers.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return {
              name: name?.trim() || '',
              value: value?.trim() || '',
              domain: url ? new URL(url).hostname : 'localhost',
              path: '/'
            };
          }).filter(c => c.name && c.value) : cookies;
          
          if (cookiesArray.length > 0) {
            await page.setCookie(...cookiesArray);
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
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
    } else {
      return res.status(400).json({ error: '需要提供 url 或 html 参数' });
    }

    // 等待页面完全渲染
    await page.waitForTimeout(2000);

    // 注入样式优化
    await page.addStyleTag({
      content: `
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: "Noto Sans CJK SC", "WenQuanYi Zen Hei", "Microsoft YaHei", "SimHei", "SimSun", sans-serif !important;
        }
        .no-export { display: none !important; }
      `
    });

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
      ...pdfOptions
    };

    // 生成PDF
    const pdfBuffer = await page.pdf(finalOptions);

    // 设置响应头
    const downloadFilename = filename || `campus_export_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

    console.log(`[${new Date().toISOString()}] HTTPS PDF生成成功:`, {
      filename: downloadFilename,
      size: pdfBuffer.length,
      duration: Date.now() - startTime + 'ms'
    });

  } catch (error) {
    console.error('HTTPS PDF生成失败:', error);
    res.status(500).json({ 
      error: 'PDF generation failed', 
      message: error.message 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// 创建HTTPS服务器
const server = https.createServer(options, app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔒 校内PDF服务 (HTTPS) 已启动在端口 ${PORT}`);
  console.log(`🌐 访问地址: https://10.3.58.3:${PORT}`);
  console.log(`🔍 健康检查: https://10.3.58.3:${PORT}/health`);
});

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});
EOF

echo "✅ HTTPS服务器配置文件已创建: server-https.js"

# 创建启动脚本
cat > start-https-service.sh << 'EOF'
#!/bin/bash

echo "🔒 启动校内PDF服务 (HTTPS版本)..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查SSL证书
if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
    echo "❌ SSL证书不存在，请先运行: bash enable-https.sh"
    exit 1
fi

# 停止现有进程
pkill -f "node server" 2>/dev/null || true
pkill -f "node server-https" 2>/dev/null || true

# 启动HTTPS服务
echo "🚀 启动HTTPS PDF服务..."
nohup node server-https.js > https-service.log 2>&1 &

sleep 2

# 健康检查
echo "🔍 检查服务状态..."
curl -k https://localhost:8443/health || echo "❌ 服务启动失败"

echo "✅ HTTPS PDF服务已启动"
echo "📊 查看日志: tail -f https-service.log"
echo "🔍 健康检查: curl -k https://10.3.58.3:8443/health"
EOF

chmod +x start-https-service.sh

echo "✅ HTTPS配置完成！"
echo ""
echo "📋 部署步骤:"
echo "1. 生成SSL证书: bash enable-https.sh"
echo "2. 启动HTTPS服务: bash start-https-service.sh"
echo "3. 更新前端配置指向: https://10.3.58.3:8443"
echo ""
echo "⚠️  注意: 自签名证书需要在浏览器中手动信任"
