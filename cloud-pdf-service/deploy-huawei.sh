#!/bin/bash

# 华为云PDF服务一键部署脚本
# 使用方法：bash deploy-huawei.sh your-domain.com

set -e

DOMAIN=${1:-""}
SERVICE_PORT=8443
HTTP_PORT=80
HTTPS_PORT=443

echo "🚀 华为云PDF服务部署开始..."
echo "📋 部署信息："
echo "   - 域名: ${DOMAIN:-'将使用IP访问'}"
echo "   - 服务端口: $SERVICE_PORT"
echo "   - 时间: $(date)"
echo ""

# 1. 系统更新和基础软件安装
echo "📦 步骤1: 安装基础软件..."
sudo apt update -y
sudo apt install -y curl wget git vim nginx certbot python3-certbot-nginx

# 2. 安装Node.js 18
echo "📦 步骤2: 安装Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ NPM版本: $(npm --version)"

# 3. 安装Chrome和字体
echo "📦 步骤3: 安装Chrome浏览器和中文字体..."

# 安装Chrome
if ! command -v google-chrome &> /dev/null; then
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt update -y
    sudo apt install -y google-chrome-stable
fi

# 安装中文字体
sudo apt install -y fonts-noto-cjk fonts-wqy-zenhei fonts-wqy-microhei

echo "✅ Chrome版本: $(google-chrome --version)"

# 4. 创建服务目录和用户
echo "📦 步骤4: 创建服务用户和目录..."
sudo useradd -r -s /bin/bash -d /opt/pdf-service pdf-service 2>/dev/null || true
sudo mkdir -p /opt/pdf-service
sudo chown pdf-service:pdf-service /opt/pdf-service

# 5. 部署应用代码
echo "📦 步骤5: 部署PDF服务..."
cd /opt/pdf-service

# 创建package.json
sudo -u pdf-service tee package.json > /dev/null << 'EOF'
{
  "name": "huawei-cloud-pdf-service",
  "version": "1.0.0",
  "description": "华为云PDF生成服务",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "puppeteer": "^21.0.0",
    "express-rate-limit": "^6.7.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# 安装依赖
echo "📦 安装NPM依赖..."
sudo -u pdf-service npm install

# 创建主服务文件
sudo -u pdf-service tee server.js > /dev/null << 'EOF'
const express = require('express');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 8443;
const API_KEY = process.env.PDF_API_KEY || 'huawei-pdf-2024-secure-key';

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS配置
app.use(cors({
  origin: ['https://butp.tech', 'http://localhost:3000', 'https://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-pdf-key', 'Cookie']
}));

// Body解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每IP限制100次
  message: {
    error: 'Too many requests',
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/generate-pdf', limiter);

// API密钥验证
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-pdf-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: '需要有效的API密钥' 
    });
  }
  next();
};

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'huawei-cloud-pdf-service',
    version: '1.0.0',
    platform: 'huawei-cloud',
    node_version: process.version,
    memory: process.memoryUsage()
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '华为云PDF生成服务',
    endpoints: {
      health: '/health',
      generate: '/generate-pdf (POST)'
    },
    documentation: 'https://github.com/your-repo/pdf-service'
  });
});

// PDF生成主端点
app.post('/generate-pdf', verifyApiKey, async (req, res) => {
  let browser = null;
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { 
      url, 
      html, 
      cookies = [], 
      pdfOptions = {}, 
      viewportWidth = 1366,
      filename 
    } = req.body;

    console.log(`[${requestId}] 📄 PDF生成请求:`, { 
      hasUrl: !!url,
      hasHtml: !!html,
      htmlLength: html?.length || 0,
      viewportWidth,
      clientIP: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });

    if (!url && !html) {
      return res.status(400).json({ 
        error: 'Missing content',
        message: '需要提供 url 或 html 参数' 
      });
    }

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
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--font-render-hinting=none',
        '--disable-font-subpixel-positioning'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      executablePath: '/usr/bin/google-chrome'
    });

    const page = await browser.newPage();

    // 视窗设置
    await page.setViewport({ 
      width: parseInt(viewportWidth) || 1366, 
      height: 900,
      deviceScaleFactor: 2
    });

    // User Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 处理认证Cookie
    if (req.headers.cookie || cookies.length > 0) {
      try {
        let cookiesArray = [];
        
        if (req.headers.cookie) {
          cookiesArray = req.headers.cookie.split(';').map(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=');
            const value = valueParts.join('='); // 处理value中包含=的情况
            
            return {
              name: name?.trim() || '',
              value: value?.trim() || '',
              domain: url ? new URL(url).hostname : '.butp.tech',
              path: '/',
              httpOnly: false,
              secure: url ? url.startsWith('https') : true
            };
          }).filter(c => c.name && c.value);
        }
        
        // 合并请求体中的cookies
        cookiesArray = [...cookiesArray, ...cookies];
          
        if (cookiesArray.length > 0) {
          console.log(`[${requestId}] 🍪 设置Cookies:`, cookiesArray.length);
          await page.setCookie(...cookiesArray);
        }
      } catch (e) {
        console.warn(`[${requestId}] ⚠️ Cookie设置失败:`, e.message);
      }
    }

    // 加载内容
    if (html) {
      console.log(`[${requestId}] 📝 使用HTML内容 (${html.length} 字符)`);
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
    } else if (url) {
      console.log(`[${requestId}] 🌐 访问URL: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
    }

    // 等待渲染
    await page.waitForTimeout(2000);

    // 注入中文字体和样式优化
    await page.addStyleTag({
      content: `
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: "Noto Sans CJK SC", "WenQuanYi Zen Hei", "Microsoft YaHei", "SimHei", "SimSun", sans-serif !important;
        }
        .no-export, .sidebar, nav[role="navigation"] { 
          display: none !important; 
        }
        @media print {
          .no-print { display: none !important; }
        }
      `
    });

    // PDF生成选项
    const finalOptions = {
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      ...pdfOptions
    };

    console.log(`[${requestId}] 🖨️ 生成PDF...`);
    const pdfBuffer = await page.pdf(finalOptions);

    // 响应头设置
    const downloadFilename = filename || `huawei_pdf_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(pdfBuffer);

    console.log(`[${requestId}] ✅ PDF生成成功:`, {
      filename: downloadFilename,
      size: `${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`,
      duration: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ PDF生成失败:`, error.message);
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

// 错误处理
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: '服务器内部错误' 
  });
});

// 启动服务
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 华为云PDF服务已启动`);
  console.log(`📍 端口: ${PORT}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📊 内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('🛑 收到关闭信号，正在优雅关闭...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});
EOF

# 6. 配置系统服务
echo "📦 步骤6: 配置系统服务..."
sudo tee /etc/systemd/system/pdf-service.service > /dev/null << EOF
[Unit]
Description=华为云PDF生成服务
After=network.target

[Service]
Type=simple
User=pdf-service
Group=pdf-service
WorkingDirectory=/opt/pdf-service
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8443
Environment=PDF_API_KEY=huawei-pdf-2024-secure-key

# 限制资源使用
LimitNOFILE=65536
MemoryMax=2G
CPUQuota=200%

# 日志
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pdf-service

[Install]
WantedBy=multi-user.target
EOF

# 7. 配置Nginx反向代理
echo "📦 步骤7: 配置Nginx..."
sudo tee /etc/nginx/sites-available/pdf-service > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN:-_};
    
    # 重定向到HTTPS (如果有域名)
    $(if [ -n "$DOMAIN" ]; then echo "return 301 https://\$server_name\$request_uri;"; fi)
    
    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:8443;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    $(if [ -z "$DOMAIN" ]; then cat << 'SUBEOF'
    # 如果没有域名，直接代理到应用
    location / {
        proxy_pass http://127.0.0.1:8443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # 支持大文件上传
        client_max_body_size 50M;
    }
SUBEOF
    fi)
}

$(if [ -n "$DOMAIN" ]; then cat << SUBEOF
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL配置将由certbot自动添加
    
    location / {
        proxy_pass http://127.0.0.1:8443;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # 支持大文件上传
        client_max_body_size 50M;
        
        # CORS头
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, x-pdf-key' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
}
SUBEOF
fi)
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/pdf-service /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 8. 配置SSL证书 (如果有域名)
if [ -n "$DOMAIN" ]; then
    echo "📦 步骤8: 配置SSL证书..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
fi

# 9. 启动服务
echo "📦 步骤9: 启动服务..."
sudo systemctl daemon-reload
sudo systemctl enable pdf-service
sudo systemctl start pdf-service
sudo systemctl enable nginx
sudo systemctl start nginx

# 10. 健康检查
echo "📦 步骤10: 服务健康检查..."
sleep 5

echo "🔍 检查PDF服务状态..."
sudo systemctl status pdf-service --no-pager || true

echo "🔍 检查Nginx状态..."
sudo systemctl status nginx --no-pager || true

echo "🔍 测试服务连通性..."
if [ -n "$DOMAIN" ]; then
    curl -f https://$DOMAIN/health || echo "❌ HTTPS健康检查失败"
else
    curl -f http://localhost/health || echo "❌ HTTP健康检查失败"
fi

# 11. 输出部署结果
echo ""
echo "🎉 华为云PDF服务部署完成！"
echo ""
echo "📋 服务信息："
echo "   - 应用目录: /opt/pdf-service"
echo "   - 服务端口: 8443"
echo "   - 系统服务: pdf-service"
if [ -n "$DOMAIN" ]; then
    echo "   - 访问地址: https://$DOMAIN"
    echo "   - 健康检查: https://$DOMAIN/health"
    echo "   - API端点: https://$DOMAIN/generate-pdf"
else
    SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "获取IP失败")
    echo "   - 访问地址: http://$SERVER_IP"
    echo "   - 健康检查: http://$SERVER_IP/health"
    echo "   - API端点: http://$SERVER_IP/generate-pdf"
fi
echo ""
echo "📋 管理命令："
echo "   - 查看状态: sudo systemctl status pdf-service"
echo "   - 查看日志: sudo journalctl -fu pdf-service"
echo "   - 重启服务: sudo systemctl restart pdf-service"
echo "   - 停止服务: sudo systemctl stop pdf-service"
echo ""
echo "📋 前端配置："
if [ -n "$DOMAIN" ]; then
    echo "   环境变量: CAMPUS_PDF_SERVICE_URL=https://$DOMAIN/generate-pdf"
    echo "   API密钥: x-pdf-key: huawei-pdf-2024-secure-key"
else
    echo "   环境变量: CAMPUS_PDF_SERVICE_URL=http://$SERVER_IP/generate-pdf"
    echo "   API密钥: x-pdf-key: huawei-pdf-2024-secure-key"
fi
echo ""
echo "✅ 部署成功！现在可以使用PDF服务了。"
