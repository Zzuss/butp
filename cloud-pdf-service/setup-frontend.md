# 前端配置指南

## 1. 更新环境变量

### 开发环境 (.env.local)
```bash
# 华为云PDF服务
CAMPUS_PDF_SERVICE_URL=https://your-domain.com/generate-pdf
# 或者使用IP (如果没有域名)
# CAMPUS_PDF_SERVICE_URL=http://123.456.789.012/generate-pdf
```

### 生产环境 (Vercel/Netlify)
在部署平台的环境变量中设置：
```
CAMPUS_PDF_SERVICE_URL=https://your-domain.com/generate-pdf
```

## 2. 更新API密钥

在CampusPdfServiceButton组件中更新API密钥：

```typescript
// 在fetch请求的headers中
headers: { 
  'Content-Type': 'application/json', 
  'x-pdf-key': 'huawei-pdf-2024-secure-key',  // 新的API密钥
  // ...其他headers
}
```

## 3. 测试连接

部署完成后，访问以下地址测试：

### 健康检查
```bash
# 有域名
curl https://your-domain.com/health

# 使用IP
curl http://123.456.789.012/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "huawei-cloud-pdf-service",
  "version": "1.0.0",
  "platform": "huawei-cloud"
}
```

### PDF生成测试
```bash
curl -X POST https://your-domain.com/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-pdf-key: huawei-pdf-2024-secure-key" \
  -d '{
    "html": "<html><body><h1>测试PDF</h1><p>这是一个测试文档</p></body></html>",
    "filename": "test.pdf"
  }' \
  --output test.pdf
```

## 4. 前端代码更新

确保CampusPdfServiceButton使用正确的服务地址：

```typescript
// 方案1: 使用环境变量 (推荐)
const campusService = process.env.NEXT_PUBLIC_CAMPUS_PDF_SERVICE_URL || campusServiceUrl || 'https://your-domain.com/generate-pdf'

// 方案2: 直接硬编码 (简单)
const campusService = campusServiceUrl || 'https://your-domain.com/generate-pdf'
```

## 5. 验证流程

1. ✅ 华为云服务器部署成功
2. ✅ 健康检查返回正常
3. ✅ 前端环境变量配置正确
4. ✅ API密钥匹配
5. ✅ 测试PDF生成功能
6. ✅ 验证中文字体渲染
7. ✅ 验证认证转发 (如果需要)

## 6. 常见问题

### Q: CORS错误
A: 检查华为云服务器的CORS配置，确保允许butp.tech域名访问

### Q: 字体乱码
A: 服务器已安装中文字体，如果仍有问题，检查HTML内容的字体设置

### Q: 超时错误
A: 检查华为云服务器的安全组设置，确保开放了相应端口

### Q: SSL证书问题
A: 如果使用免费域名，可能需要手动配置SSL，或者使用HTTP版本进行测试
