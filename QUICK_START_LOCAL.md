# 🚀 本地CAS认证快速开始

## ⚡ 2分钟开始测试

### 步骤1：配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SESSION_SECRET_KEY=development-secret-key-for-local-testing-only-32-chars
NODE_ENV=development
```

### 步骤2：启动开发服务器

```bash
npm run dev
```

### 步骤3：测试认证

1. 打开浏览器访问：`http://localhost:3000/profile`
2. 会自动跳转到Mock CAS登录页面
3. 点击任一测试账号自动填充，或手动输入：
   - **学号**: `2021211001` / **密码**: `test123`
4. 点击登录，返回应用并显示用户信息

## 🎯 测试成功标志

- ✅ 能跳转到Mock CAS登录页面
- ✅ 能使用测试账号登录  
- ✅ 登录后侧边栏显示用户信息（张三 / 2021211001）
- ✅ 可以访问其他受保护页面
- ✅ 登出功能正常工作

## 📋 预设测试账号

- 学号: `2021211001` / 密码: `test123` / 姓名: 张三
- 学号: `2021211002` / 密码: `test123` / 姓名: 李四  
- 学号: `2021211003` / 密码: `test123` / 姓名: 王五

## 💡 重要提醒

⚠️ **在测试前，请先更新旧代码**：
需要更新4个文件中的旧认证系统引用，详见：`MIGRATION_CHECKLIST.md`

## 📚 完整指南

- **详细测试指南**：`LOCAL_DEVELOPMENT_GUIDE.md`
- **代码迁移清单**：`MIGRATION_CHECKLIST.md`
- **生产部署指南**：`PROXY_SERVER_SETUP.md`

## 🎉 下一步

本地测试通过后：
1. 部署应用到 `butp.tech`
2. 在 `10.3.58.3:8080` 部署代理服务器
3. 使用真实北邮账号测试生产环境 