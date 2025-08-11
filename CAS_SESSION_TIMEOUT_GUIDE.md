# CAS会话超时功能使用指南

## 🎯 功能概述

为BuTP项目的CAS认证系统添加了30分钟不活跃自动过期功能，确保系统安全性。
**已简化**：移除了警告提示和手动延长功能，实现静默自动管理。

## ⏰ 超时配置

### 时间设置
- **会话超时**: 30分钟不活跃后自动过期
- **无警告**: 不再显示警告提示
- **无手动延长**: 移除了用户手动延长功能

### 配置位置
```typescript
// lib/session.ts
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟
```

## 🔧 技术实现

### 1. 会话数据结构
```typescript
export interface SessionData {
  userId: string;
  userHash: string;
  name: string;
  isLoggedIn: boolean;
  isCasAuthenticated: boolean;
  loginTime: number;
  lastActiveTime: number; // 🆕 最后活跃时间
}
```

### 2. 核心函数
```typescript
// 检查会话是否过期
isSessionExpired(session: SessionData): boolean

// 检查会话是否即将过期
isSessionNearExpiry(session: SessionData): boolean

// 更新会话活跃时间
updateSessionActivity(session: SessionData): void

// 获取会话剩余时间
getSessionRemainingTime(session: SessionData): number
```

### 3. API端点
- `GET /api/auth/user` - 自动更新活跃时间，检查超时

## 🎨 前端组件

### SessionTimeoutWarning组件
**已简化**：不再显示任何警告，返回空组件。

```tsx
<SessionTimeoutWarning />
```

### 集成到AuthContext
```tsx
const { user, logout } = useAuth()
```

## 📱 用户体验

### 简化使用流程
1. **用户登录**: 设置`loginTime`和`lastActiveTime`
2. **页面操作**: 每次访问`/api/auth/user`都会更新`lastActiveTime`
3. **30分钟后**: 自动登出，跳转到登录页面

### 自动会话管理
系统通过以下方式自动管理会话：
- 🖱️ **任何页面操作** - 自动重置活跃时间
- 📄 **访问任何受保护页面** - 自动更新活跃时间
- ⏰ **静默过期** - 30分钟后无提示自动登出

## 🧪 测试页面

访问 `/test-session-timeout` 查看完整的会话超时测试界面：

### 功能展示
- ✅ 用户信息和登录时间显示
- ✅ 简化的会话状态说明
- ✅ 立即登出测试
- ✅ 静默超时机制演示

### 测试步骤
1. 登录系统后访问测试页面
2. 观察用户会话信息
3. 测试立即登出功能
4. 等待30分钟验证自动登出（可选）

## 🔒 安全特性

### 自动过期保护
- ✅ 30分钟无操作自动登出
- ✅ 防止会话被恶意利用
- ✅ 确保敏感数据安全

### 简洁设计
- ✅ 静默自动管理
- ✅ 无干扰用户体验
- ✅ 透明的超时机制

### 健壮性设计
- ✅ 服务端验证会话有效性
- ✅ 客户端实时状态同步
- ✅ 错误处理和自动恢复
- ✅ 跨页面状态一致性

## 📊 监控和日志

### 服务端日志
```
User API: session activity updated
User API: session expired, logging out
```

### 浏览器控制台
```
(静默运行，无额外日志输出)
```

## 🛠️ 自定义配置

### 修改超时时间
```typescript
// lib/session.ts
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 改为60分钟
```

### 重新启用警告功能（如需要）
如果需要重新添加警告功能，可以：
1. 恢复`SESSION_WARNING_MS`配置
2. 修改`isSessionNearExpiry`函数逻辑
3. 重新实现`SessionTimeoutWarning`组件
4. 更新AuthContext返回会话状态信息

## 🎉 部署说明

### 生产环境配置
1. 确保`SESSION_SECRET_KEY`足够安全
2. 设置正确的cookie安全选项
3. 配置HTTPS以保证cookie安全传输
4. 监控会话超时日志

### 兼容性说明
- ✅ 兼容现有的CAS认证流程
- ✅ 兼容开发登录模式
- ✅ 不影响现有用户体验
- ✅ 向后兼容旧会话数据

---

## 🚀 总结

这个简化的会话超时功能为BuTP项目提供了：

1. **安全保障**: 30分钟自动过期防止会话劫持
2. **简洁体验**: 无警告干扰，静默自动管理
3. **技术健壮**: 服务端验证和透明处理
4. **易于维护**: 简化的代码结构和逻辑
5. **高性能**: 减少了前端组件和状态管理开销

现在你的CAS认证系统具备了简洁而安全的会话管理功能！🎯 