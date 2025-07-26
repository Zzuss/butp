#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置参数
SERVER_IP="10.3.58.3"
PROXY_DIR="/root/cas-proxy"
TARGET_DOMAIN="butp.tech"

echo -e "${BLUE}=== 恢复生产环境代理服务器配置 ===${NC}"

echo -e "${YELLOW}正在连接到服务器 $SERVER_IP...${NC}"

ssh root@$SERVER_IP << EOF
set -e

echo "停止代理服务..."
pm2 stop cas-proxy || true

echo "备份当前配置..."
if [ -f $PROXY_DIR/server.js ]; then
    cp $PROXY_DIR/server.js $PROXY_DIR/server.js.backup
fi

if [ -f $PROXY_DIR/ecosystem.config.js ]; then
    cp $PROXY_DIR/ecosystem.config.js $PROXY_DIR/ecosystem.config.js.backup
fi

echo "生成生产环境 server.js..."
cat > $PROXY_DIR/server.js << 'SERVER_EOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const port = 8080;

// 目标域名
const TARGET_DOMAIN = 'butp.tech';

// CORS配置
app.use(cors({
  origin: [\`https://\${TARGET_DOMAIN}\`, 'https://auth.bupt.edu.cn'],
  credentials: true
}));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CAS Proxy Server',
    version: '1.0.0'
  });
});

// 根路径重定向
app.get('/', (req, res) => {
  const targetUrl = \`https://\${TARGET_DOMAIN}\`;
  console.log(\`Redirecting root request to: \${targetUrl}\`);
  res.redirect(302, targetUrl);
});

// CAS回调处理
app.get('/api/auth/cas/callback', (req, res) => {
  const ticket = req.query.ticket;
  console.log(\`CAS callback received with ticket: \${ticket}\`);
  
  if (!ticket) {
    console.error('No ticket provided in CAS callback');
    return res.status(400).send('Bad Request: Missing ticket parameter');
  }
  
  // 重定向到实际应用的verify端点
  const redirectUrl = \`https://\${TARGET_DOMAIN}/api/auth/cas/verify?ticket=\${ticket}\`;
  console.log(\`Redirecting to: \${redirectUrl}\`);
  res.redirect(302, redirectUrl);
});

// 代理其他请求到目标服务器
app.use('/', createProxyMiddleware({
  target: \`https://\${TARGET_DOMAIN}\`,
  changeOrigin: true,
  secure: true,
  followRedirects: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(\`Proxying \${req.method} \${req.url} to \${TARGET_DOMAIN}\`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy Error');
  }
}));

app.listen(port, '0.0.0.0', () => {
  console.log(\`CAS Proxy server running at http://0.0.0.0:\${port}\`);
  console.log(\`Target domain: \${TARGET_DOMAIN}\`);
  console.log(\`Environment: PRODUCTION\`);
});
SERVER_EOF

echo "生成生产环境 ecosystem.config.js..."
cat > $PROXY_DIR/ecosystem.config.js << 'ECOSYSTEM_EOF'
module.exports = {
  apps: [{
    name: 'cas-proxy',
    script: 'server.js',
    cwd: '/root/cas-proxy',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '/var/log/cas-proxy-error.log',
    out_file: '/var/log/cas-proxy-out.log',
    log_file: '/var/log/cas-proxy.log',
    time: true
  }]
};
ECOSYSTEM_EOF

echo "重启代理服务..."
pm2 start $PROXY_DIR/ecosystem.config.js

echo "等待服务启动..."
sleep 3

echo "验证服务状态..."
pm2 status cas-proxy
pm2 logs cas-proxy --lines 10

echo "测试代理服务..."
curl -s http://localhost:8080/health | python3 -m json.tool || echo "JSON格式化失败，原始响应:"
curl -s http://localhost:8080/health

echo "生产环境代理服务器配置恢复完成！"
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 生产环境代理服务器配置恢复成功！${NC}"
    echo -e "${BLUE}代理服务器现在将请求转发到: https://butp.tech${NC}"
else
    echo -e "${RED}❌ 恢复过程中出现错误${NC}"
    exit 1
fi 