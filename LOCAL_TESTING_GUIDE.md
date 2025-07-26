# 本地CAS认证测试指南

## 🎯 测试环境配置

### 1. 创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```env
# Next.js 应用配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 会话加密密钥 (开发环境用)
SESSION_SECRET_KEY=development-secret-key-for-local-testing-only-32-chars

# 开发环境标识
NODE_ENV=development

# CAS认证模式 (development: 使用mock认证, production: 使用真实CAS)
CAS_MODE=development
```

### 2. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 🧪 测试流程

### 📋 完整认证流程测试

1. **访问受保护页面**
   ```
   http://localhost:3000/profile
   ```

2. **自动重定向到Mock CAS登录**
   - 页面会自动重定向到Mock CAS登录页面
   - URL: `http://localhost:3000/api/mock/cas/login?service=...`

3. **使用测试账号登录**
   
   **预设测试账号：**
   - 学号: `2021211001` / 密码: `test123` / 姓名: 张三
   - 学号: `2021211002` / 密码: `test123` / 姓名: 李四
   - 学号: `2021211003` / 密码: `test123` / 姓名: 王五

   **快捷登录：** 点击测试账号可自动填充表单

4. **验证认证成功**
   - 登录成功后会返回到原始页面 (`/profile`)
   - 侧边栏会显示用户信息（姓名和学号）
   - 可以正常访问其他受保护的页面

## 🔍 API端点测试

### Mock CAS 服务端点

#### 1. Mock CAS 登录页面
```bash
curl "http://localhost:3000/api/mock/cas/login?service=http://localhost:3000/api/auth/cas/callback"
```

#### 2. Mock CAS Ticket 验证
```bash
curl "http://localhost:3000/api/mock/cas/serviceValidate?ticket=ST-DEV-1234567890&service=http://localhost:3000/api/auth/cas/callback&username=2021211001"
```

### CAS 认证 API 端点

#### 1. 发起登录
```bash
curl -I "http://localhost:3000/api/auth/cas/login"
```

#### 2. 获取用户信息
```bash
curl -b cookies.txt "http://localhost:3000/api/auth/user"
```

#### 3. 登出
```bash
curl -I -b cookies.txt "http://localhost:3000/api/auth/cas/logout"
```

## 🎨 前端组件测试

### 1. 登录按钮组件测试

创建测试页面 `pages/test-login.tsx`：

```tsx
import { LoginButton } from '@/components/auth/LoginButton';

export default function TestLogin() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">登录按钮测试</h1>
      
      {/* 基本登录按钮 */}
      <div className="mb-4">
        <h2 className="text-lg mb-2">基本登录按钮:</h2>
        <LoginButton />
      </div>
      
      {/* 带返回URL的登录按钮 */}
      <div className="mb-4">
        <h2 className="text-lg mb-2">指定返回URL:</h2>
        <LoginButton returnUrl="/dashboard" />
      </div>
      
      {/* 自定义样式登录按钮 */}
      <div className="mb-4">
        <h2 className="text-lg mb-2">自定义文本:</h2>
        <LoginButton>自定义登录文本</LoginButton>
      </div>
    </div>
  );
}
```

### 2. 用户信息组件测试

创建测试页面 `pages/test-userinfo.tsx`：

```tsx
import { UserInfo } from '@/components/auth/UserInfo';
import { useAuth } from '@/contexts/AuthContext';

export default function TestUserInfo() {
  const { user, loading } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">用户信息组件测试</h1>
      
      <div className="mb-4">
        <h2 className="text-lg mb-2">用户信息组件:</h2>
        <UserInfo />
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg mb-2">认证状态:</h2>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>Logged In: {user?.isLoggedIn ? 'Yes' : 'No'}</p>
        {user && (
          <>
            <p>Name: {user.name}</p>
            <p>User ID: {user.userId}</p>
          </>
        )}
      </div>
    </div>
  );
}
```

### 3. 路由保护测试

创建测试页面 `pages/test-protected.tsx`：

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function TestProtected() {
  return (
    <ProtectedRoute>
      <div className="p-8">
        <h1 className="text-2xl mb-4">受保护页面测试</h1>
        <p>如果您能看到这个页面，说明认证成功！</p>
      </div>
    </ProtectedRoute>
  );
}
```

## 🔧 调试技巧

### 1. 查看浏览器开发者工具

- **Network Tab**: 查看CAS认证请求和响应
- **Application Tab**: 查看cookies和session存储
- **Console Tab**: 查看认证相关的日志

### 2. 服务器日志

在终端中可以看到以下日志：
```
[timestamp] GET /api/auth/cas/login - 重定向到CAS登录
[timestamp] GET /api/mock/cas/login?service=... - Mock CAS登录页面
[timestamp] GET /api/auth/cas/callback?ticket=... - CAS回调处理
[timestamp] GET /api/auth/cas/verify?ticket=... - Ticket验证
```

### 3. 常见问题排查

#### 问题1：重定向循环
**症状**: 页面不断重定向
**解决**: 检查 `.env.local` 文件中的配置是否正确

#### 问题2：认证失败
**症状**: 提示 "Invalid or expired ticket"
**解决**: 确保使用的是以 `ST-DEV-` 开头的测试票据

#### 问题3：用户信息不显示
**症状**: 登录成功但侧边栏无用户信息
**解决**: 检查AuthProvider是否正确包装了应用组件

## 🚀 高级测试

### 1. 会话管理测试

```javascript
// 在浏览器控制台中执行
// 查看会话信息
fetch('/api/auth/user')
  .then(r => r.json())
  .then(console.log);

// 手动清除会话
document.cookie = 'butp-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
```

### 2. 不同用户切换测试

1. 登录用户A (2021211001)
2. 访问各个页面验证功能
3. 登出
4. 登录用户B (2021211002)
5. 验证用户信息是否正确切换

### 3. 路由保护测试

测试以下场景：
- 未登录访问受保护页面 → 应重定向到登录
- 登录后访问受保护页面 → 应正常显示
- 登出后再访问受保护页面 → 应重新要求登录

## 📊 测试检查清单

- [ ] Mock CAS登录页面正常显示
- [ ] 测试账号可以正常登录
- [ ] 登录后正确显示用户信息
- [ ] 侧边栏用户信息显示正确
- [ ] 受保护页面访问控制正常
- [ ] 登出功能正常工作
- [ ] 会话管理功能正常
- [ ] 页面刷新后登录状态保持
- [ ] 多个标签页间登录状态同步

## 🎉 测试完成

完成上述测试后，您的CAS认证功能就已经在本地环境中正常工作了！

接下来可以：
1. 部署到测试环境
2. 配置真实的CAS认证服务器
3. 进行生产环境测试 