# 校内PDF服务部署指南

## 问题诊断

### 503 Service Unavailable 错误分析

当在 `https://butp.tech/dashboard` 点击快速测试按钮出现 503 错误，而在 `http://localhost:3000/dashboard` 正常工作时，问题在于：

- **本地环境**: 可以直接访问校内网络 `10.3.58.3:8000` ✅
- **生产环境**: 部署服务器无法访问校内网络 `10.3.58.3:8000` ❌

## 解决方案

### 方案1: 环境变量配置 (推荐)

在生产环境中设置环境变量，指向可公网访问的PDF服务：

```bash
# 设置环境变量
CAMPUS_PDF_SERVICE_URL=https://your-public-pdf-service.com/generate-pdf
```

### 方案2: 在校内部署公网可访问的PDF服务

#### 2.1 配置HTTPS版本的校内PDF服务

在校内服务器上运行：

```bash
# 1. 生成SSL证书并配置HTTPS
cd ~/BuTP/campus-pdf-service
bash enable-https.sh

# 2. 启动HTTPS版本的服务
bash start-https-service.sh
```

这将在 `https://10.3.58.3:8443` 启动HTTPS版本的PDF服务。

#### 2.2 配置反向代理 (Nginx)

如果校内服务器有公网IP，可以配置Nginx反向代理：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    location /pdf/ {
        proxy_pass http://10.3.58.3:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 方案3: 使用云端PDF服务

部署PDF服务到云平台 (Vercel, Railway, etc.):

```bash
# 1. 创建云端PDF服务项目
git clone your-pdf-service-repo
cd pdf-service

# 2. 部署到云平台
# (具体步骤依据所选平台)

# 3. 设置环境变量
CAMPUS_PDF_SERVICE_URL=https://your-cloud-pdf-service.vercel.app/generate-pdf
```

## 当前代码优化

已更新的代码会自动检测环境并选择合适的PDF服务地址：

```typescript
// 自动环境检测
const campusServiceUrl = process.env.CAMPUS_PDF_SERVICE_URL || 'http://10.3.58.3:8000/generate-pdf'
```

## 部署检查清单

- [ ] 确认生产环境可以访问配置的PDF服务URL
- [ ] 设置正确的环境变量 `CAMPUS_PDF_SERVICE_URL`
- [ ] 验证API密钥配置正确
- [ ] 测试健康检查端点 `/api/pdf/health`
- [ ] 测试PDF生成端点 `/api/pdf/generate`

## 调试方法

1. **检查健康状态**:
   ```bash
   curl https://butp.tech/api/pdf/health
   ```

2. **查看服务器日志**:
   检查Vercel或其他部署平台的日志输出

3. **本地测试**:
   ```bash
   # 设置环境变量后本地测试
   CAMPUS_PDF_SERVICE_URL=https://your-service.com/generate-pdf npm run dev
   ```

## 网络架构图

```
浏览器 (butp.tech)
    ↓ HTTPS
Next.js 服务器 (/api/pdf/*)
    ↓ HTTP/HTTPS (根据环境变量)
PDF服务 (校内/云端)
    ↓
生成的PDF文件
```

## 注意事项

- 校内网络通常限制外网访问内网服务
- 生产环境需要可公网访问的PDF服务
- 考虑安全性：API密钥、CORS配置等
- 监控服务可用性和性能
