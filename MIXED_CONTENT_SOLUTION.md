# Mixed Content 问题解决方案

## 🔍 **问题诊断**

### **现象**
- ✅ `http://localhost:3000/dashboard` → 快速测试正常
- ❌ `https://butp.tech/dashboard` → Mixed Content错误

### **根本原因**
**HTTPS页面无法访问HTTP资源**（浏览器安全策略）
```
Mixed Content: The page at 'https://butp.tech/dashboard' was loaded over HTTPS, 
but requested an insecure resource 'http://10.3.58.3:8000/generate-pdf'. 
This request has been blocked; the content must be served over HTTPS.
```

## 🛠️ **解决方案**

### **已实现：前端智能协议检测**

所有PDF导出组件现在会自动检测当前页面协议：

```javascript
// 检测当前协议，优先使用HTTPS校内服务
const isHttps = window.location.protocol === 'https:'
const campusServiceUrl = isHttps ? 
  'https://10.3.58.3:8443/generate-pdf' : 
  'http://10.3.58.3:8000/generate-pdf'
```

**涉及的组件**：
- ✅ `AuthenticatedUrlExportButton.tsx` - 认证导出按钮
- ✅ `QuickExternalTestButton.tsx` - 快速测试按钮  
- ✅ `CampusPdfServiceButton.tsx` - 校内服务按钮

### **需要部署：校内服务器HTTPS支持**

#### **1. 在校内服务器执行配置**
```bash
cd /path/to/campus-pdf-service
chmod +x enable-https.sh
bash enable-https.sh
```

#### **2. 启动HTTPS服务**
```bash
bash start-https-service.sh
```

#### **3. 验证部署**
```bash
# 检查HTTP服务 (8000端口)
curl http://10.3.58.3:8000/health

# 检查HTTPS服务 (8443端口)  
curl -k https://10.3.58.3:8443/health
```

## 📋 **端口配置**

| 协议 | 端口 | 用途 | 客户端 |
|------|------|------|--------|
| HTTP | 8000 | 本地开发 | `http://localhost:3000` |
| HTTPS | 8443 | 生产环境 | `https://butp.tech` |

## 🔒 **SSL证书配置**

### **自签名证书**（内网使用）
脚本会自动生成自签名证书：
- 📜 证书文件：`ssl/cert.pem`
- 🔑 私钥文件：`ssl/key.pem`  
- 🌐 域名：`10.3.58.3`

### **浏览器信任配置**
首次访问时需要：
1. 浏览器访问 `https://10.3.58.3:8443/health`
2. 点击"高级" → "继续访问"
3. 添加安全例外

## 📊 **测试流程**

### **本地开发环境**
```bash
# 1. 启动本地服务
npm run dev

# 2. 访问 http://localhost:3000/dashboard
# 3. 点击"快速测试" → 应该成功（使用HTTP服务）
```

### **生产环境**
```bash
# 1. 确保HTTPS服务运行
curl -k https://10.3.58.3:8443/health

# 2. 访问 https://butp.tech/dashboard  
# 3. 点击"快速测试" → 应该成功（使用HTTPS服务）
```

## 🎯 **预期结果**

修复后的行为：
- 🌐 **`https://butp.tech`** → 自动使用 `https://10.3.58.3:8443`
- 🖥️ **`http://localhost:3000`** → 自动使用 `http://10.3.58.3:8000`
- ✅ **无Mixed Content错误**
- ✅ **PDF导出功能正常**

## 🚨 **故障排除**

### **如果HTTPS测试仍失败**：

1. **检查服务状态**
   ```bash
   ps aux | grep node
   netstat -tlnp | grep 8443
   ```

2. **检查防火墙**
   ```bash
   # 开放8443端口
   sudo ufw allow 8443
   # 或
   sudo firewall-cmd --add-port=8443/tcp --permanent
   ```

3. **检查SSL证书**
   ```bash
   openssl x509 -in ssl/cert.pem -text -noout
   ```

4. **重新生成证书**
   ```bash
   rm -rf ssl/
   bash enable-https.sh
   ```

## 📞 **部署检查清单**

- [ ] 校内服务器已运行HTTPS服务（8443端口）
- [ ] 防火墙已开放8443端口
- [ ] SSL证书已生成
- [ ] 前端代码已更新协议检测逻辑
- [ ] 浏览器已信任自签名证书
- [ ] `https://butp.tech/dashboard` 快速测试成功
