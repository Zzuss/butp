# 本地CAS认证开发测试指南

## 🎯 开发流程说明

这是正确的CAS认证开发和部署流程：

1. **本地开发测试** (localhost:3000) → 使用Mock CAS验证功能逻辑
2. **生产环境部署** (butp.tech) → 使用真实CAS + 10.3.58.3:8080代理

## 🚀 第一阶段：本地开发测试

### 1. 环境配置

创建 `.env.local` 文件：

```env
# Next.js 应用配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 会话加密密钥
SESSION_SECRET_KEY=development-secret-key-for-local-testing-only-32-chars

# 开发环境（自动使用Mock CAS）
NODE_ENV=development

# 可选：如果想在本地测试真实CAS，设置为 real
# CAS_MODE=real
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 测试认证流程

访问：`http://localhost:3000/profile`

**预期流程**：
1. 重定向到Mock CAS登录页面 (`http://localhost:3000/api/mock/cas/login`)
2. 使用测试账号登录：
   - 学号: `2021211001` / 密码: `test123` / 姓名: 张三
   - 学号: `2021211002` / 密码: `test123` / 姓名: 李四  
   - 学号: `2021211003` / 密码: `test123` / 姓名: 王五
3. 登录成功后返回应用
4. 侧边栏显示用户信息
5. 可以正常访问受保护页面

### 4. 验证功能完整性

#### ✅ 测试检查清单

**基础认证功能**：
- [ ] 访问受保护页面自动重定向到登录
- [ ] Mock CAS登录页面正常显示
- [ ] 可以使用测试账号登录
- [ ] 登录后正确显示用户信息（姓名、学号）
- [ ] 侧边栏用户信息显示正确

**会话管理**：
- [ ] 页面刷新后登录状态保持
- [ ] 多个标签页登录状态同步
- [ ] 登出功能正常工作
- [ ] 登出后无法访问受保护页面

**路由保护**：
- [ ] 未登录时访问 `/profile` 重定向到登录
- [ ] 未登录时访问 `/dashboard` 重定向到登录
- [ ] 登录后可以正常访问所有页面
- [ ] 中间件正确拦截未认证请求

**API端点**：
- [ ] `GET /api/auth/cas/login` 正确重定向
- [ ] `GET /api/auth/cas/callback` 正确处理回调
- [ ] `GET /api/auth/cas/verify` 正确验证票据
- [ ] `GET /api/auth/user` 正确返回用户信息
- [ ] `GET /api/auth/cas/logout` 正确处理登出

### 5. 调试技巧

#### 查看网络请求
打开浏览器开发者工具 → Network标签，观察：
- CAS登录重定向
- Mock票据生成和验证
- 会话cookie设置
- API调用响应

#### 查看会话信息
在浏览器控制台执行：
```javascript
// 查看当前用户信息
fetch('/api/auth/user').then(r => r.json()).then(console.log);

// 查看cookies
document.cookie;
```

#### 服务器日志
在终端查看请求日志：
```
[timestamp] GET /api/auth/cas/login
[timestamp] GET /api/mock/cas/login?service=...
[timestamp] GET /api/auth/cas/callback?ticket=...
[timestamp] GET /api/auth/cas/verify?ticket=...
```

## 🌐 第二阶段：生产环境部署

### 1. 生产环境配置

在生产服务器上创建 `.env.local`：

```env
# 生产域名
NEXT_PUBLIC_SITE_URL=https://butp.tech

# 生产环境会话密钥（必须更换为安全密钥）
SESSION_SECRET_KEY=your-super-secure-production-session-key-32-chars-or-more

# 生产环境（自动使用真实CAS）
NODE_ENV=production
```

### 2. 部署代理服务器

在 `10.3.58.3:8080` 服务器上执行：

```bash
# 使用之前生成的部署脚本
sudo bash deploy-cas-proxy.sh
```

### 3. 验证生产环境

访问：`https://butp.tech/profile`

**预期流程**：
1. 重定向到真实CAS登录 (`https://auth.bupt.edu.cn/authserver/login`)
2. 使用真实北邮账号登录
3. CAS回调到 `http://10.3.58.3:8080/api/auth/cas/callback`
4. 代理转发到 `https://butp.tech/api/auth/cas/verify`
5. 验证成功，显示真实用户信息

## 🔄 环境切换

### 本地测试真实CAS（可选）

如果想在本地测试真实CAS连接：

```env
# .env.local
NODE_ENV=development
CAS_MODE=real  # 强制使用真实CAS
NEXT_PUBLIC_SITE_URL=https://your-ngrok-url.ngrok.io
```

需要使用ngrok等工具创建公网访问地址。

### 生产环境使用Mock（调试用）

如果生产环境需要调试：

```env
# 生产环境 .env.local
NODE_ENV=production
CAS_MODE=mock  # 强制使用Mock CAS（仅用于调试）
```

## 📊 完整测试流程

### 开发阶段测试

```bash
# 1. 启动本地开发
npm run dev

# 2. 运行测试
npm test  # 如果有测试

# 3. 验证功能
# 访问 http://localhost:3000/profile
# 完成所有测试检查清单项目

# 4. 构建验证
npm run build
npm start  # 验证生产构建
```

### 部署阶段测试

```bash
# 1. 部署代理服务器
ssh user@10.3.58.3
sudo bash deploy-cas-proxy.sh

# 2. 部署主应用到 butp.tech
# (根据您的部署方式)

# 3. 验证生产环境
# 访问 https://butp.tech/profile
# 使用真实北邮账号测试
```

## 🎯 最佳实践

### 开发建议

1. **优先本地测试**：使用Mock CAS充分测试所有功能
2. **逐步验证**：先测试基础认证，再测试业务功能
3. **日志记录**：保留详细的认证流程日志
4. **错误处理**：测试各种异常情况（网络错误、票据过期等）

### 部署建议

1. **环境隔离**：开发和生产环境配置严格分离
2. **安全配置**：生产环境使用安全的会话密钥
3. **监控报警**：设置CAS认证失败监控
4. **备份方案**：准备认证服务异常的备用方案

## 🎉 测试完成

完成本地测试后，您应该能够：

- ✅ 在localhost:3000完整测试CAS认证流程
- ✅ 验证所有认证相关功能正常工作
- ✅ 确认代码逻辑正确无误
- ✅ 准备好部署到生产环境

接下来就可以放心地部署到 `butp.tech` + `10.3.58.3:8080` 的生产环境了！ 