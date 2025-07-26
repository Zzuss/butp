#!/bin/bash

# 更新CAS代理服务器以支持开发环境
# 用法: bash update-proxy-dev.sh

echo "=== 更新CAS代理服务器配置 ==="
echo ""

# 检查PM2是否运行
if ! pm2 list | grep -q "cas-proxy.*online"; then
    echo "❌ CAS代理服务器未运行，请先启动代理服务器"
    exit 1
fi

echo "✅ 检测到CAS代理服务器正在运行"

# 停止现有服务
echo "⏸️  停止现有代理服务..."
pm2 stop cas-proxy

# 备份原始配置
PROXY_DIR="$HOME/cas-proxy"
if [ -f "$PROXY_DIR/server.js" ]; then
    cp "$PROXY_DIR/server.js" "$PROXY_DIR/server.js.backup"
    echo "✅ 已备份原始配置"
fi

# 创建开发环境配置
echo "📝 创建开发环境配置..."
cat > $PROXY_DIR/server.js << 'EOF'
const express = require('express');
const app = express();

// 配置
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '10.3.58.3';
const TARGET_DOMAIN = process.env.TARGET_DOMAIN || 'butp.tech';
const DEV_MODE = process.env.DEV_MODE || 'false';

// 中间件：请求日志
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'CAS Proxy Server',
    version: '1.0.0',
    dev_mode: DEV_MODE
  });
});

// 根路径信息
app.get('/', (req, res) => {
  const targetUrl = DEV_MODE === 'true' ? 'http://localhost:3000' : `https://${TARGET_DOMAIN}`;
  res.json({
    service: 'CAS Proxy Server',
    status: 'running',
    callback_url: `http://${HOST}:${PORT}/api/auth/cas/callback`,
    target_url: targetUrl,
    dev_mode: DEV_MODE,
    timestamp: new Date().toISOString()
  });
});

// CAS回调代理端点
app.get('/api/auth/cas/callback', (req, res) => {
  const ticket = req.query.ticket;
  const timestamp = new Date().toISOString();
  
  if (!ticket) {
    console.error(`[${timestamp}] CAS callback missing ticket parameter`);
    return res.status(400).json({ 
      error: 'Missing ticket parameter',
      timestamp: timestamp
    });
  }
  
  console.log(`[${timestamp}] CAS callback received - Ticket: ${ticket.substring(0, 10)}...`);
  
  // 根据环境选择重定向目标
  const redirectUrl = DEV_MODE === 'true' 
    ? `http://localhost:3000/api/auth/cas/verify?ticket=${ticket}`
    : `https://${TARGET_DOMAIN}/api/auth/cas/verify?ticket=${ticket}`;
  
  console.log(`[${timestamp}] Redirecting to: ${redirectUrl} (DEV_MODE: ${DEV_MODE})`);
  
  // 302重定向
  res.redirect(302, redirectUrl);
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      '/',
      '/health',
      '/api/auth/cas/callback'
    ]
  });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Server Error:`, error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
});

// 启动服务器
const server = app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    CAS Proxy Server                          ║
╠══════════════════════════════════════════════════════════════╣
║  Status: Running                                             ║
║  Host: ${HOST}                                        ║
║  Port: ${PORT}                                                ║
║  Dev Mode: ${DEV_MODE}                                      ║
║  Target: ${DEV_MODE === 'true' ? 'http://localhost:3000' : `https://${TARGET_DOMAIN}`}                     ║
║  Callback URL: http://${HOST}:${PORT}/api/auth/cas/callback ║
║  Started: ${new Date().toISOString()}              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
const gracefulShutdown = (signal) => {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed. Goodbye!`);
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
  process.exit(1);
});
EOF

# 更新PM2配置以支持开发模式
echo "📝 更新PM2配置..."
cat > $PROXY_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cas-proxy',
    script: 'server.js',
    cwd: '$PROXY_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: '8080',
      HOST: '10.3.58.3',
      TARGET_DOMAIN: 'butp.tech',
      DEV_MODE: 'true'
    },
    log_file: '$PROXY_DIR/logs/combined.log',
    out_file: '$PROXY_DIR/logs/out.log',
    error_file: '$PROXY_DIR/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# 重启代理服务器
echo "🔄 重启代理服务器..."
pm2 start $PROXY_DIR/ecosystem.config.js --update-env

# 等待服务启动
sleep 3

# 验证服务状态
echo "✅ 验证服务状态..."
if pm2 list | grep -q "cas-proxy.*online"; then
    echo "✅ 代理服务器重启成功"
    
    # 测试健康检查
    if curl -f -s http://10.3.58.3:8080/health > /dev/null; then
        echo "✅ 健康检查通过"
        curl -s http://10.3.58.3:8080/health | grep -o '"dev_mode":"true"' && echo "✅ 开发模式已启用"
    else
        echo "❌ 健康检查失败"
    fi
else
    echo "❌ 代理服务器重启失败"
    exit 1
fi

echo ""
echo "=== 配置更新完成 ==="
echo ""
echo "🔧 配置变更："
echo "  - 启用开发模式 (DEV_MODE=true)"
echo "  - 重定向目标: http://localhost:3000"
echo "  - 回调地址保持: http://10.3.58.3:8080/api/auth/cas/callback"
echo ""
echo "📋 测试命令："
echo "  健康检查: curl http://10.3.58.3:8080/health"
echo "  回调测试: curl -I \"http://10.3.58.3:8080/api/auth/cas/callback?ticket=test\""
echo ""
echo "🔄 恢复生产模式："
echo "  bash update-proxy-dev.sh restore"
echo ""
EOF

# 添加恢复功能
if [ "$1" = "restore" ]; then
    echo "=== 恢复生产模式配置 ==="
    
    if [ -f "$PROXY_DIR/server.js.backup" ]; then
        cp "$PROXY_DIR/server.js.backup" "$PROXY_DIR/server.js"
        echo "✅ 已恢复原始配置"
        
        # 更新PM2配置为生产模式
        cat > $PROXY_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cas-proxy',
    script: 'server.js',
    cwd: '$PROXY_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: '8080',
      HOST: '10.3.58.3',
      TARGET_DOMAIN: 'butp.tech'
    },
    log_file: '$PROXY_DIR/logs/combined.log',
    out_file: '$PROXY_DIR/logs/out.log',
    error_file: '$PROXY_DIR/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
        
        pm2 restart cas-proxy
        echo "✅ 已恢复生产模式"
    else
        echo "❌ 未找到备份文件"
    fi
    exit 0
fi

echo "🎉 开发环境配置完成！现在可以测试CAS认证了。" 