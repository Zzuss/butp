# CAS代理服务器部署指南

本文档说明如何部署和运行CAS代理服务器，用于支持弹窗式CAS认证流程。

## 架构概述

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   前端页面      │────▶│  代理服务器      │────▶│   CAS服务器     │
│  (login.tsx)    │     │  (:8080)         │     │ (auth.bupt.edu.cn│
└─────────────────┘     └──────────────────┘     └─────────────────┘
       │                         │                         │
       │                         │◀─────────────────────────│
       │                         │  (ticket + callback)     │
       │◀─────────────────────────│
       │   (HTML + postMessage)   │
       │◀─────────────────────────│
       │  (CAS_SUCCESS + ticket)  │
       │
       ▼
┌─────────────────┐
│ Next.js API     │
│ /api/auth/cas/  │
│ verify-ticket   │
└─────────────────┘
```

## 前置要求

1. **VPN连接**：代理服务器运行在内网 (10.3.58.3:8080)，需要VPN连接访问
2. **Node.js >= 16.0.0**
3. **端口8080可用**

## 部署步骤

### 1. 安装依赖

```bash
npm install express cors
# 或
npm install --save express cors
```

### 2. 配置环境变量

在 `.env.local` 或 `.env.production` 中添加：

```bash
# CAS代理服务器URL
NEXT_PUBLIC_CAS_PROXY_URL=http://10.3.58.3:8080

# 网站URL（用于CAS回调）
NEXT_PUBLIC_SITE_URL=https://butp.tech
```

### 3. 启动代理服务器

```bash
# 方式1：直接运行
node cas-proxy-server.js

# 方式2：使用PM2（推荐生产环境）
pm2 start cas-proxy-server.js --name cas-proxy

# 方式3：使用nodemon（开发环境）
nodemon cas-proxy-server.js
```

### 4. 验证部署

```bash
# 健康检查
curl http://10.3.58.3:8080/health

# 应该返回：
# {
#   "status": "ok",
#   "timestamp": "2024-xx-xx...",
#   "service": "cas-proxy-server"
# }
```

## 使用现有部署脚本

项目已包含以下部署脚本：

- `deploy-cas-proxy.sh` - 部署到生产环境
- `restore-proxy-production.sh` - 恢复生产环境配置
- `update-proxy-dev.sh` - 更新开发环境配置
- `verify-proxy.sh` - 验证代理服务器状态

## 端点说明

### GET /api/auth/cas/proxy-login

启动CAS认证流程。

**查询参数：**
- `returnUrl` (可选): 认证成功后返回的URL，默认 `/dashboard`

**示例：**
```
http://10.3.58.3:8080/api/auth/cas/proxy-login?returnUrl=/dashboard
```

### GET /api/auth/cas/callback

接收CAS服务器的回调，返回HTML页面通过postMessage传递ticket。

**查询参数：**
- `ticket`: CAS服务票据（由CAS服务器提供）
- `returnUrl`: 返回URL

### GET /health

健康检查端点。

## 故障排查

### 问题1：无法连接到代理服务器

**症状：** 前端弹出窗口无法打开或连接超时

**解决方案：**
1. 确认VPN连接正常
2. 检查端口8080是否被占用：`netstat -ano | findstr :8080`
3. 验证代理服务器是否运行：`curl http://10.3.58.3:8080/health`

### 问题2：弹出窗口被阻止

**症状：** 点击登录按钮后没有弹出窗口

**解决方案：**
1. 浏览器可能阻止了弹出窗口，请允许弹出窗口
2. 检查浏览器控制台是否有错误

### 问题3：postMessage未收到

**症状：** CAS认证成功但前端没有收到ticket

**解决方案：**
1. 检查弹出窗口的console是否有错误
2. 验证父窗口和弹出窗口的域名配置
3. 检查CORS配置

## 安全注意事项

1. **生产环境postMessage目标域**：
   - 当前实现使用 `'*'` 允许所有域
   - 生产环境应指定具体域名以提高安全性

2. **CORS配置**：
   - 当前允许所有来源 `origin: '*'`
   - 生产环境应限制为前端域名

3. **VPN访问**：
   - 代理服务器仅在VPN内网可访问
   - 确保VPN连接稳定

## 与旧版本兼容性

新的弹窗式流程与旧的直接跳转流程兼容：

- 旧的 `/api/auth/cas/login` 和 `/api/auth/cas/callback` 端点仍然可用
- 前端保留了 `cas_success=true` URL参数的处理逻辑
- 可以通过配置 `NEXT_PUBLIC_CAS_PROXY_URL` 来启用或禁用新的弹窗流程

## 日志示例

```
[2024-xx-xxTxx:xx:xx.xxxZ] Redirecting to CAS login: {
  returnUrl: '/dashboard',
  callbackUrl: 'http://10.3.58.3:8080/api/auth/cas/callback?returnUrl=%2Fdashboard',
  casLoginUrl: 'https://auth.bupt.edu.cn/authserver/login?service=...'
}
[2024-xx-xxTxx:xx:xx.xxxZ] CAS callback received: {
  hasTicket: true,
  ticket: 'ST-xxxxx-xxxxx-xxxxxxxxxx',
  returnUrl: '/dashboard'
}
```

## 相关文件

- `cas-proxy-server.js` - 代理服务器主文件
- `app/api/auth/cas/verify-ticket/route.ts` - Next.js ticket验证端点
- `app/login/page.tsx` - 前端登录页面
- `lib/cas.ts` - CAS配置和工具函数
