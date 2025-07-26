# 🧪 CAS认证功能测试手册

## 📋 测试前准备

### 1. 配置环境变量

```bash
# 复制环境变量模板
cp env.template .env.local

# 编辑配置文件
nano .env.local
```

**必须配置的关键变量：**
- `NEXT_PUBLIC_SUPABASE_URL`: 你的Supabase项目URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase匿名密钥
- `SESSION_SECRET_KEY`: 会话加密密钥（生产环境使用随机字符串）

### 2. 构建和部署选项

#### 方式1：快速本地构建
```bash
bash quick-build.sh
```

#### 方式2：完整构建和部署
```bash
bash build-and-deploy.sh
```

#### 方式3：只构建不部署
```bash
bash build-and-deploy.sh --local-only
```

#### 方式4：手动构建
```bash
npm install
npm run build
npm start
```

## 🔍 测试流程

### 第一步：基础功能测试

1. **健康检查**
   ```bash
   curl https://butp.tech/health
   ```
   预期返回：`{"status":"ok"}`

2. **主页访问**
   - 访问：`https://butp.tech/`
   - 预期：正常显示主页

3. **登录页面**
   - 访问：`https://butp.tech/login`
   - 预期：显示登录选项

### 第二步：CAS认证流程测试

#### 测试1：保护路由重定向
1. **访问受保护页面**
   ```bash
   curl -I "https://butp.tech/dashboard"
   ```
   
2. **预期结果**
   ```
   HTTP/1.1 302 Found
   Location: https://auth.bupt.edu.cn/authserver/login?service=http://10.3.58.3:8080/api/auth/cas/callback
   ```

#### 测试2：完整认证流程
1. **浏览器访问**：`https://butp.tech/dashboard`
2. **自动重定向到**：北邮CAS登录页面
3. **输入北邮账号密码**进行认证
4. **CAS回调到代理服务器**：`http://10.3.58.3:8080/api/auth/cas/callback?ticket=xxx`
5. **代理服务器转发到**：`https://butp.tech/api/auth/cas/verify?ticket=xxx`
6. **系统验证用户**：检查学号是否在数据库中
7. **自动跳转到登录页面**：`https://butp.tech/login`
8. **自动完成登录**：使用哈希值登录
9. **最终访问目标页面**：`https://butp.tech/dashboard`

#### 测试3：会话状态检查
```bash
# 检查用户会话（需要登录后的cookie）
curl -b cookies.txt "https://butp.tech/api/auth/user"
```

### 第三步：代理服务器测试

1. **代理服务器健康检查**
   ```bash
   curl http://10.3.58.3:8080/health
   ```

2. **CAS回调转发测试**
   ```bash
   curl -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=test"
   ```
   
   预期：重定向到 `https://butp.tech/api/auth/cas/verify?ticket=test`

## 📊 测试检查清单

### CAS认证系统
- [ ] 访问受保护页面自动重定向到CAS
- [ ] CAS登录成功后正确回调
- [ ] 代理服务器正确转发回调
- [ ] 系统验证学号哈希值
- [ ] 自动完成最终登录
- [ ] 登录后可访问所有受保护页面

### 页面功能
- [ ] 主页 (`/`) 正常显示
- [ ] 登录页 (`/login`) 正常显示
- [ ] 仪表板 (`/dashboard`) 需要登录
- [ ] 成绩页 (`/grades`) 需要登录
- [ ] 个人资料 (`/profile`) 需要登录
- [ ] 分析页 (`/analysis`) 需要登录

### 系统集成
- [ ] Supabase数据库连接正常
- [ ] 学号哈希验证功能正常
- [ ] 会话管理正常
- [ ] 登出功能正常

## 🐛 常见问题排查

### 问题1：构建失败
**可能原因：**
- 环境变量未配置
- 依赖安装失败
- TypeScript类型错误

**解决方案：**
```bash
# 检查环境变量
cat .env.local

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查构建日志
npm run build
```

### 问题2：CAS重定向不正确
**检查项目：**
1. `lib/cas.ts` 中的配置是否正确
2. 代理服务器是否正常运行
3. service参数是否指向正确的回调地址

**排查命令：**
```bash
# 检查CAS配置
curl -I "https://butp.tech/dashboard"

# 检查代理服务器
curl http://10.3.58.3:8080/health
```

### 问题3：学号验证失败
**可能原因：**
- Supabase连接失败
- 学号不在数据库中
- 哈希算法不匹配

**排查步骤：**
1. 检查Supabase配置
2. 确认学号在 `academic_results` 表中
3. 验证SHA256哈希值

### 问题4：会话管理问题
**检查项目：**
- SESSION_SECRET_KEY是否配置
- Cookie设置是否正确
- HTTPS配置是否正常

## 📝 测试记录模板

```
测试时间：____年__月__日 __:__
测试环境：□ 开发环境 □ 生产环境
测试人员：________________

### 基础功能测试
□ 主页访问正常
□ 健康检查通过
□ 登录页面显示正常

### CAS认证测试
□ 保护路由重定向正常
□ CAS登录页面可访问
□ 认证成功后回调正常
□ 代理转发功能正常
□ 用户验证成功
□ 自动登录完成

### 系统集成测试
□ 数据库连接正常
□ 会话管理正常
□ 页面权限控制正常

### 问题记录
问题描述：________________
错误信息：________________
解决方案：________________

测试结果：□ 通过 □ 部分通过 □ 失败
备注：____________________
```

## 🚀 自动化测试脚本

创建自动化测试：

```bash
#!/bin/bash
echo "=== CAS认证系统自动化测试 ==="

# 1. 健康检查
echo "1. 健康检查..."
curl -f https://butp.tech/health || echo "❌ 健康检查失败"

# 2. 重定向测试
echo "2. CAS重定向测试..."
REDIRECT=$(curl -s -I "https://butp.tech/dashboard" | grep Location)
if [[ "$REDIRECT" == *"auth.bupt.edu.cn"* ]]; then
    echo "✅ CAS重定向正常"
else
    echo "❌ CAS重定向异常"
fi

# 3. 代理服务器测试
echo "3. 代理服务器测试..."
curl -f http://10.3.58.3:8080/health || echo "❌ 代理服务器异常"

echo "=== 测试完成 ==="
```

保存为 `test-cas.sh` 并运行：
```bash
bash test-cas.sh
``` 