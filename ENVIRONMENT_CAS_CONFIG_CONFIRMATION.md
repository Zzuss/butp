# 环境配置确认 - CAS 认证

## 🎯 环境区分

### 本地开发环境 (localhost)
- **不需要 CAS 认证**
- 直接使用哈希值登录或开发登录
- 跳过所有 CAS 相关流程

### 生产环境 (butp.tech)  
- **需要 CAS 认证**
- 通过北邮统一认证系统
- 使用代理服务器处理回调

## ✅ 当前配置状态

### 1. 中间件 (middleware.ts)
```typescript
// ✅ 正确配置
const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                   request.nextUrl.hostname === '127.0.0.1' ||
                   process.env.NODE_ENV === 'development';

if (isLocalhost) {
  // 本地环境：直接重定向到登录页面，跳过CAS认证
  return NextResponse.redirect(loginUrl);
}
```

### 2. CAS 配置 (lib/cas.ts)
```typescript
// ✅ 正确配置
const isDevelopment = process.env.NODE_ENV === 'development';
const useMockCAS = isDevelopment && process.env.CAS_MODE !== 'real';

// 回调URL根据环境自动切换
serviceUrl: isProduction 
  ? 'http://10.3.58.3:8080/api/auth/cas/callback'  // 生产环境
  : 'http://localhost:3000/api/auth/cas/callback',  // 开发环境
```

### 3. 登录页面 (app/login/page.tsx)
```typescript
// ✅ 正确配置
const isDev = process.env.NODE_ENV === 'development' || 
              window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1'

if (isDev) {
  // 本地开发环境直接跳过CAS认证检查
  console.log('Login page: localhost detected, skipping CAS auth check')
  return
}
```

## 🚀 工作流程

### 本地开发环境 (localhost:3000)
```
访问受保护页面 → 中间件检测localhost → 重定向到/login → 显示哈希登录界面
```

### 生产环境 (butp.tech)
```
访问受保护页面 → 中间件检测生产环境 → 重定向到CAS登录 → CAS认证 → 回调验证 → 登录成功
```

## 🔧 环境变量

### 本地开发 (.env.local)
```env
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# CAS_MODE=real  # 如果需要在本地测试真实CAS，取消注释
```

### 生产环境 (Vercel)
```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://butp.tech
```

## ✅ 验证清单

- [x] 本地环境不触发 CAS 认证
- [x] 本地环境显示哈希登录界面
- [x] 生产环境正确触发 CAS 认证
- [x] 中间件正确检测环境
- [x] CAS 配置根据环境自动切换
- [x] 登录页面根据环境显示不同内容

## 🎯 最近修复的问题

**问题**：生产环境 CAS 票据验证失败
**解决**：合并 callback 和 verify 逻辑，减少重定向跳转
**影响**：只影响生产环境的 CAS 认证流程，本地开发环境不受影响

## 📝 开发建议

1. **本地开发**：继续使用哈希值登录，无需配置 CAS
2. **CAS 测试**：如需在本地测试 CAS，设置 `CAS_MODE=real`
3. **生产部署**：确保环境变量正确设置 