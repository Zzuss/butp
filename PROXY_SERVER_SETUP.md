# 10.3.58.3 代理服务器设置指南

## 🎯 服务器配置需求

您需要在服务器 `10.3.58.3` 上设置一个代理服务，将CAS回调请求转发到您的实际应用域名 `butp.tech`。

## 🚀 方案一：Node.js Express 代理服务

### 1. 在10.3.58.3服务器上创建项目目录
```bash
# SSH连接到服务器
ssh username@10.3.58.3

# 创建项目目录
mkdir -p /opt/cas-proxy
cd /opt/cas-proxy
```

### 2. 初始化Node.js项目
```bash
# 初始化package.json
npm init -y

# 安装express
npm install express
```

### 3. 创建代理服务器代码
创建文件 `server.js`：
```javascript
const express = require('express');
const app = express();

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CAS回调代理端点
app.get('/api/auth/cas/callback', (req, res) => {
  const ticket = req.query.ticket;
  
  if (!ticket) {
    return res.status(400).json({ error: 'Missing ticket parameter' });
  }
  
  console.log(`[${new Date().toISOString()}] CAS callback received, ticket: ${ticket}`);
  
  // 重定向到实际应用的verify端点
  const redirectUrl = `https://butp.tech/api/auth/cas/verify?ticket=${ticket}`;
  
  console.log(`[${new Date().toISOString()}] Redirecting to: ${redirectUrl}`);
  
  res.redirect(302, redirectUrl);
});

// 启动服务器
const PORT = 8080;
const HOST = '10.3.58.3';

app.listen(PORT, HOST, () => {
  console.log(`CAS Proxy Server running on http://${HOST}:${PORT}`);
  console.log(`Callback URL: http://${HOST}:${PORT}/api/auth/cas/callback`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
```

### 4. 创建启动脚本
创建文件 `start.sh`：
```bash
#!/bin/bash
cd /opt/cas-proxy
node server.js
```

### 5. 设置文件权限
```bash
chmod +x start.sh
```

### 6. 测试服务器
```bash
# 启动服务器
./start.sh

# 在另一个终端测试
curl http://10.3.58.3:8080/health
```

## 🔧 方案二：Nginx 反向代理

### 1. 安装Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 创建Nginx配置
创建文件 `/etc/nginx/sites-available/cas-proxy`：
```nginx
server {
    listen 8080;
    server_name 10.3.58.3;
    
    # 日志配置
    access_log /var/log/nginx/cas-proxy.access.log;
    error_log /var/log/nginx/cas-proxy.error.log;
    
    # 健康检查
    location /health {
        return 200 '{"status":"ok","timestamp":"$time_iso8601"}';
        add_header Content-Type application/json;
    }
    
    # CAS回调代理
    location /api/auth/cas/callback {
        # 记录日志
        access_log /var/log/nginx/cas-callback.log;
        
        # 重定向到实际应用
        return 302 https://butp.tech/api/auth/cas/verify$is_args$args;
    }
    
    # 默认处理
    location / {
        return 404;
    }
}
```

### 3. 启用配置
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/cas-proxy /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🐳 方案三：Docker 容器部署

### 1. 创建Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码
COPY server.js ./

# 暴露端口
EXPOSE 8080

# 启动应用
CMD ["node", "server.js"]
```

### 2. 创建docker-compose.yml
```yaml
version: '3.8'

services:
  cas-proxy:
    build: .
    ports:
      - "8080:8080"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    networks:
      - cas-network

networks:
  cas-network:
    driver: bridge
```

### 3. 部署容器
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f cas-proxy
```

## 🔍 测试和验证

### 1. 测试代理服务
```bash
# 测试健康检查
curl http://10.3.58.3:8080/health

# 测试回调转发（模拟）
curl -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=ST-123456"
```

### 2. 完整CAS认证流程测试
1. 访问您的应用：`https://butp.tech/profile`
2. 应该重定向到：`https://auth.bupt.edu.cn/authserver/login?service=http://10.3.58.3:8080/api/auth/cas/callback`
3. 登录后CAS会回调：`http://10.3.58.3:8080/api/auth/cas/callback?ticket=xxx`
4. 代理服务器转发到：`https://butp.tech/api/auth/cas/verify?ticket=xxx`
5. 最终返回：`https://butp.tech/profile`

## 🛡️ 安全建议

### 1. 防火墙配置
```bash
# 只允许必要的端口访问
sudo ufw allow 8080/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable
```

### 2. 限制访问来源
```nginx
# 只允许CAS服务器访问
location /api/auth/cas/callback {
    allow 211.68.69.240;  # CAS服务器IP
    deny all;
    return 302 https://butp.tech/api/auth/cas/verify$is_args$args;
}
```

### 3. 日志监控
```bash
# 监控访问日志
tail -f /var/log/nginx/cas-callback.log

# 或者Node.js应用日志
journalctl -u cas-proxy -f
```

## 📋 系统服务配置（推荐）

### 1. 创建systemd服务文件
创建文件 `/etc/systemd/system/cas-proxy.service`：
```ini
[Unit]
Description=CAS Proxy Server
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/cas-proxy
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 2. 启用服务
```bash
# 重载systemd配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start cas-proxy

# 设置开机自启
sudo systemctl enable cas-proxy

# 查看服务状态
sudo systemctl status cas-proxy
```

## 🎉 部署完成检查清单

- [ ] 服务器 `10.3.58.3` 可以访问
- [ ] 代理服务在端口 `8080` 正常运行
- [ ] 健康检查端点 `/health` 响应正常
- [ ] CAS回调端点 `/api/auth/cas/callback` 可以正确转发
- [ ] 防火墙规则已配置
- [ ] 服务已设置为开机自启
- [ ] 日志监控已配置

完成这些步骤后，您的CAS认证代理服务就已经准备就绪了！ 