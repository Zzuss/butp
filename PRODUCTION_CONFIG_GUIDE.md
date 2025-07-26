# 🏭 生产环境配置指南

## 🎯 当前状态
- ✅ 代理服务器已部署在 `10.3.58.3:8080`
- ✅ CAS配置已准备就绪
- ⏳ 需要配置生产环境变量

## 🔧 第一步：创建生产环境变量

在您的 `butp.tech` 服务器上创建 `.env.local` 文件：

```bash
# 连接到butp.tech服务器
ssh your-user@butp.tech

# 进入项目目录
cd /path/to/your/nextjs/project

# 创建生产环境配置
cat > .env.local << 'EOF'
# 🌐 网站配置
NEXT_PUBLIC_SITE_URL=https://butp.tech

# 🔐 会话密钥 (请更换为复杂的密钥，至少32字符)
SESSION_SECRET_KEY=your-production-session-secret-key-must-be-32-chars-or-longer-please-change-this

# 🏭 环境标识
NODE_ENV=production
EOF
```

⚠️ **重要**: 请将 `SESSION_SECRET_KEY` 更换为安全的随机字符串！

### 生成安全密钥的方法：

```bash
# 方法1: 使用openssl
openssl rand -base64 32

# 方法2: 使用Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法3: 在线生成
# 访问 https://generate-secret.vercel.app/32
```

## 🚀 第二步：部署应用到butp.tech

### 如果使用PM2：
```bash
# 安装依赖
npm install

# 构建应用
npm run build

# 启动应用
pm2 start npm --name "butp-app" -- start

# 保存PM2配置
pm2 save
```

### 如果使用Docker：
```bash
# 构建镜像
docker build -t butp-app .

# 运行容器
docker run -d --name butp-app -p 3000:3000 --env-file .env.local butp-app
```

### 如果使用Vercel/Netlify：
在部署平台的环境变量设置中添加：
- `NEXT_PUBLIC_SITE_URL`: `https://butp.tech`
- `SESSION_SECRET_KEY`: `你生成的安全密钥`
- `NODE_ENV`: `production`

## 🧪 第三步：测试CAS认证流程

### 完整认证流程测试：

1. **访问受保护页面**：
   ```
   https://butp.tech/profile
   ```

2. **预期行为**：
   - 自动重定向到北邮CAS登录页面
   - CAS登录URL应该包含：`service=http://10.3.58.3:8080/api/auth/cas/callback`

3. **登录成功后**：
   - CAS回调到：`http://10.3.58.3:8080/api/auth/cas/callback?ticket=xxx`
   - 代理服务器转发到：`https://butp.tech/api/auth/cas/verify?ticket=xxx`
   - 验证成功后重定向到：`https://butp.tech/profile`

### 测试命令：

```bash
# 1. 测试代理服务器健康状态
curl http://10.3.58.3:8080/health

# 2. 测试应用健康状态
curl https://butp.tech/api/auth/user

# 3. 测试完整登录流程
# 手动访问：https://butp.tech/profile
```

## 🔍 第四步：验证生产环境

### 检查CAS配置：

```bash
# 在butp.tech服务器上
cd /path/to/your/nextjs/project

# 检查环境变量
cat .env.local

# 检查构建状态
npm run build

# 检查应用日志
pm2 logs butp-app
# 或
docker logs butp-app
```

### 验证CAS流程：

访问以下页面确保功能正常：
- ✅ `https://butp.tech/` - 主页正常访问
- ✅ `https://butp.tech/profile` - 自动跳转到CAS登录
- ✅ 使用北邮账号登录后，能正常返回并显示用户信息
- ✅ 侧边栏显示真实的用户姓名和学号
- ✅ 登出功能正常工作

## 🎉 部署完成检查清单

- [ ] 在butp.tech上创建了正确的 `.env.local` 文件
- [ ] 生成并设置了安全的 `SESSION_SECRET_KEY`
- [ ] 应用已成功部署到 `https://butp.tech`
- [ ] 代理服务器在 `10.3.58.3:8080` 正常运行
- [ ] 完整CAS认证流程测试通过
- [ ] 用户信息正确显示在应用中
- [ ] 所有受保护页面正常工作

## 🚨 故障排除

### 问题1: CAS登录后无法返回应用

**检查**：
- 确认 `NODE_ENV=production` 已设置
- 检查代理服务器是否运行：`./cas-proxy-ctl.sh status`
- 查看代理服务器日志：`./cas-proxy-ctl.sh logs`

### 问题2: 会话无法创建

**检查**：
- 确认 `SESSION_SECRET_KEY` 长度至少32字符
- 检查 `NEXT_PUBLIC_SITE_URL` 设置正确
- 确认HTTPS证书有效

### 问题3: 用户信息显示异常

**检查**：
- 确认所有代码迁移已完成
- 检查浏览器控制台是否有JavaScript错误
- 验证 `/api/auth/user` 端点返回正确数据

## 📞 需要帮助？

如果遇到问题，请检查：
1. 代理服务器日志：`./cas-proxy-ctl.sh logs`
2. Next.js应用日志：`pm2 logs butp-app`
3. 浏览器开发者工具的Network标签
4. CAS服务器是否可正常访问：`https://auth.bupt.edu.cn/authserver` 