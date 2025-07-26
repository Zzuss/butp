# CAS认证测试指南

## 概述

本指南详细说明如何测试从CAS认证到学号哈希值登录的完整流程。系统现在使用**真实的Supabase数据库验证**，确保只有数据库中存在的学号才能登录。

## 🔍 重要发现

**数据库哈希算法确认**：
- 数据库中的SNH字段存储的是**64位SHA256哈希值**
- 格式：小写十六进制字符串，如 `000ded13b3d1e6f3276740881104c25ace1d3d4cbdd75f775c9b6dbac8efd2cb`
- 系统使用的SHA256算法与数据库完全匹配 ✅

## 认证流程

### 完整流程图
```
用户访问受保护页面 → CAS认证 → 学号哈希化 → 数据库验证 → 自动登录 → 访问系统
```

### 详细步骤
1. **用户访问受保护的网址**（如 `/dashboard`）
2. **Middleware检查认证状态**，未认证则重定向到CAS
3. **CAS认证**：重定向到北邮CAS服务器
4. **CAS回调**：认证成功后回调到系统
5. **票据验证**：验证CAS票据获取用户信息
6. **学号哈希化**：将学号转换为SHA256哈希值
7. **数据库验证**：检查哈希值是否在Supabase数据库中存在
8. **Session存储**：存储CAS认证信息（但未完成登录）
9. **重定向到登录页**：自动重定向到 `/login`
10. **自动完成登录**：检测CAS认证信息并用哈希值完成最终登录
11. **跳转到目标页面**：登录成功后跳转到dashboard

## 测试环境配置

### 生产环境（10.3.58.3）
- 代理服务器：`http://10.3.58.3:8080`
- 网站域名：`https://butp.tech`
- CAS服务器：`https://auth.bupt.edu.cn/authserver`
- **Supabase数据库**：实时验证学号哈希值

### 开发环境
- 本地开发：`http://localhost:3000`
- Mock CAS：`http://localhost:3000/api/mock/cas`
- **本地Supabase**：使用相同的数据库进行验证

## 测试步骤

### 1. 认证状态检查页面
访问 `/auth-status` 查看当前认证状态：
- CAS认证状态
- 登录状态
- 用户信息
- Session详情
- **数据库验证状态**

### 2. 测试完整登录流程

#### 方法1：直接访问受保护页面
1. 访问 `https://butp.tech/dashboard`
2. 系统应自动重定向到CAS登录页面
3. 使用北邮学号密码登录
4. **系统验证学号是否在数据库中存在**
5. 认证成功后自动跳转回dashboard

#### 方法2：从登录页开始
1. 访问 `https://butp.tech/login`
2. 点击"登录BuTP系统"按钮
3. 完成CAS认证
4. **系统自动验证数据库中的哈希值**
5. 自动完成哈希值登录并跳转

#### 方法3：使用认证状态页面
1. 访问 `https://butp.tech/auth-status`
2. 点击"测试CAS登录"按钮
3. 完成认证流程
4. 返回状态页面查看认证结果

#### 方法4：测试哈希值验证（高级）
1. 访问 `https://butp.tech/login`
2. 在备用登录框中输入真实的数据库哈希值：
   ```
   000ded13b3d1e6f3276740881104c25ace1d3d4cbdd75f775c9b6dbac8efd2cb
   ```
3. 点击"使用哈希值登录"
4. 系统应验证哈希值并完成登录

### 3. 验证学号哈希化

认证成功后，可以在以下位置查看哈希值：
- 认证状态页面：显示原始学号和哈希值
- 浏览器开发者工具：检查session cookies
- 后端日志：查看哈希化过程
- **数据库验证日志**：确认哈希值匹配

## API端点说明

### 认证相关API
- `GET /api/auth/cas/login` - 发起CAS登录
- `GET /api/auth/cas/callback` - CAS认证回调
- `GET /api/auth/cas/verify` - 验证CAS票据并检查数据库
- `GET /api/auth/cas/check-session` - 检查CAS认证状态
- `POST /api/auth/cas/complete-login` - 完成最终登录
- `POST /api/auth/validate-hash` - **验证哈希值是否在数据库中存在**
- `GET /api/auth/cas/logout` - 登出
- `GET /api/auth/user` - 获取用户信息

### 测试API端点
可以使用curl或浏览器开发者工具测试：

```bash
# 检查认证状态
curl -b cookies.txt "https://butp.tech/api/auth/cas/check-session"

# 获取用户信息
curl -b cookies.txt "https://butp.tech/api/auth/user"

# 验证哈希值（新增）
curl -X POST -H "Content-Type: application/json" \
  -d '{"hash":"000ded13b3d1e6f3276740881104c25ace1d3d4cbdd75f775c9b6dbac8efd2cb"}' \
  "https://butp.tech/api/auth/validate-hash"
```

## 数据库集成

### Supabase数据库结构
- **表名**：`academic_results`
- **学号哈希字段**：`SNH` (Student Number Hash)
- **哈希格式**：64位SHA256，小写十六进制
- **验证逻辑**：实时查询数据库确认哈希值存在

### 数据库验证流程
1. CAS返回原始学号
2. 使用SHA256生成哈希值
3. 查询 `academic_results.SNH` 字段
4. 验证哈希值是否存在
5. 只有存在的哈希值才允许登录

## 调试信息

### 浏览器开发者工具
1. **Network标签**：查看认证请求和重定向
2. **Application标签**：检查cookies和session
3. **Console标签**：查看JavaScript日志

### 服务器日志
关键日志信息：
- CAS票据验证过程
- 学号哈希化过程
- **数据库验证查询**
- Session创建和更新
- 重定向流程

### 常见调试点
```javascript
// 在浏览器控制台检查session状态
fetch('/api/auth/cas/check-session', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log);

// 检查用户信息
fetch('/api/auth/user', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log);

// 验证哈希值（新增）
fetch('/api/auth/validate-hash', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hash: 'your-hash-here' })
})
.then(r => r.json())
.then(console.log);
```

## 问题排查

### 常见问题

1. **CAS认证失败**
   - 检查CAS服务器连接
   - 验证回调URL配置
   - 查看网络请求日志

2. **学号哈希化问题**
   - 检查crypto模块是否正常工作
   - 验证学号格式是否正确
   - 查看服务器端日志

3. **数据库验证失败（新增）**
   - 检查Supabase连接状态
   - 验证学号是否在数据库中存在
   - 查看数据库查询日志
   - 确认SNH字段数据格式

4. **Session问题**
   - 检查cookie设置
   - 验证session密钥配置
   - 确认域名和路径设置

5. **重定向问题**
   - 检查URL配置
   - 验证代理服务器设置
   - 查看middleware日志

### 日志检查命令
```bash
# 查看应用日志
pm2 logs butp

# 查看nginx日志（如果使用）
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 检查Supabase连接
curl -H "apikey: YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/academic_results?select=SNH&limit=1"
```

## 环境变量

确保以下环境变量正确配置：

```bash
# 生产环境
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://butp.tech
SESSION_SECRET_KEY=your-secret-key

# Supabase配置（重要）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 开发环境
NODE_ENV=development
CAS_MODE=real  # 使用真实CAS（可选）
```

## 测试用例

### 1. 基本认证流程
- [ ] 访问受保护页面自动重定向到CAS
- [ ] CAS认证成功后正确回调
- [ ] 学号正确哈希化
- [ ] **数据库验证成功**
- [ ] Session正确创建
- [ ] 自动完成登录并跳转

### 2. 数据库验证测试（新增）
- [ ] 有效学号成功通过数据库验证
- [ ] 无效学号被数据库验证拒绝
- [ ] 哈希值格式正确性验证
- [ ] 数据库连接错误处理

### 3. 边界情况
- [ ] 无效的CAS票据处理
- [ ] 网络超时处理
- [ ] Session过期处理
- [ ] 重复登录处理
- [ ] **数据库查询失败处理**

### 4. 安全测试
- [ ] Session安全性验证
- [ ] CSRF保护验证
- [ ] XSS防护验证
- [ ] 哈希值不可逆验证
- [ ] **数据库访问权限验证**

## 成功标准

认证流程成功的标志：
1. ✅ CAS认证成功返回用户信息
2. ✅ 学号正确转换为64位SHA256哈希值
3. ✅ **哈希值在Supabase数据库中验证成功**
4. ✅ Session包含完整的认证信息
5. ✅ 登录页面自动检测并完成登录
6. ✅ 用户可以正常访问受保护的页面
7. ✅ 认证状态在整个应用中正确维护
8. ✅ **只有数据库中存在的学号才能登录**

## 实际测试哈希值

从数据库中提取的真实哈希值样本（用于测试）：
```
000ded13b3d1e6f3276740881104c25ace1d3d4cbdd75f775c9b6dbac8efd2cb
0018742398e7a8749b61fb7f74ea50d081685f149f3f4e43bacfc59b0df93e94
0019c51af74c6d54140cc59b3cb8aecbee95c850aaea9464f688b8012a65c6a4
```

## 联系支持

如果遇到问题，请检查：
1. 认证状态页面的详细信息
2. 浏览器开发者工具的网络和控制台日志
3. 服务器端的应用日志
4. **Supabase数据库连接状态**
5. **学号哈希值是否在数据库中存在**

提供这些信息有助于快速定位和解决问题。 