# 🔄 CAS认证迁移检查清单

## ⚠️ 需要手动更新的文件

在启用CAS认证之前，需要更新以下文件中对旧认证系统的引用：

### 📝 需要更新的文件列表

1. **`components/voting-poll.tsx`** (第7行)
   ```typescript
   // 替换这行：
   import { useSimpleAuth } from "@/contexts/simple-auth-context"
   
   // 为：
   import { useAuth } from "@/contexts/AuthContext"
   ```

2. **`app/login/page.tsx`** (第8行)
   ```typescript
   // 替换这行：
   import { useSimpleAuth } from "@/contexts/simple-auth-context"
   
   // 为：
   import { useAuth } from "@/contexts/AuthContext"
   ```

3. **`app/grades/page.tsx`** (第5行)
   ```typescript
   // 替换这行：
   import { useSimpleAuth } from "@/contexts/simple-auth-context"
   
   // 为：
   import { useAuth } from "@/contexts/AuthContext"
   ```

4. **`app/dashboard/page.tsx`** (第8行)
   ```typescript
   // 替换这行：
   import { useSimpleAuth } from '@/contexts/simple-auth-context'
   
   // 为：
   import { useAuth } from '@/contexts/AuthContext'
   ```

### 🔧 Hook使用方式更新

在这些文件中，还需要更新hook的使用方式：

**旧的使用方式：**
```typescript
const { currentStudent, logout } = useSimpleAuth();

// 访问用户信息
currentStudent.name  // 姓名
currentStudent.id    // 学号
```

**新的使用方式：**
```typescript
const { user, logout } = useAuth();

// 访问用户信息
user?.name     // 姓名
user?.userId   // 学号
user?.isLoggedIn  // 登录状态
```

### 🎯 快速替换命令

如果您使用VSCode，可以使用全局搜索替换：

1. 按 `Ctrl+Shift+H` 打开全局替换
2. 搜索：`useSimpleAuth`
3. 替换为：`useAuth`
4. 搜索：`simple-auth-context`
5. 替换为：`AuthContext`
6. 搜索：`currentStudent`
7. 替换为：`user`

### ⚡ 自动更新脚本

您也可以运行以下命令进行批量替换：

```bash
# Windows PowerShell
(Get-Content "components/voting-poll.tsx") -replace "useSimpleAuth", "useAuth" -replace "simple-auth-context", "AuthContext" -replace "currentStudent", "user" | Set-Content "components/voting-poll.tsx"

(Get-Content "app/login/page.tsx") -replace "useSimpleAuth", "useAuth" -replace "simple-auth-context", "AuthContext" -replace "currentStudent", "user" | Set-Content "app/login/page.tsx"

(Get-Content "app/grades/page.tsx") -replace "useSimpleAuth", "useAuth" -replace "simple-auth-context", "AuthContext" -replace "currentStudent", "user" | Set-Content "app/grades/page.tsx"

(Get-Content "app/dashboard/page.tsx") -replace "useSimpleAuth", "useAuth" -replace "simple-auth-context", "AuthContext" -replace "currentStudent", "user" | Set-Content "app/dashboard/page.tsx"
```

```bash
# macOS/Linux
sed -i '' 's/useSimpleAuth/useAuth/g; s/simple-auth-context/AuthContext/g; s/currentStudent/user/g' components/voting-poll.tsx app/login/page.tsx app/grades/page.tsx app/dashboard/page.tsx
```

### 🔍 验证更新

更新完成后，检查以下几点：

1. **编译检查**：运行 `npm run build` 确保没有编译错误
2. **类型检查**：运行 `npm run type-check` 检查TypeScript类型
3. **功能测试**：访问更新的页面确保功能正常

### 📋 更新后的用户数据结构

注意新的用户数据结构：

```typescript
// 旧结构 (SimpleAuth)
interface Student {
  id: string;
  name: string;
}

// 新结构 (CAS Auth)
interface User {
  userId: string;    // 对应旧的 id
  name: string;      // 保持不变
  isLoggedIn: boolean;
  loginTime: number;
}
```

### ✅ 完成检查清单

- [ ] 更新 `components/voting-poll.tsx`
- [ ] 更新 `app/login/page.tsx`
- [ ] 更新 `app/grades/page.tsx`
- [ ] 更新 `app/dashboard/page.tsx`
- [ ] 验证编译通过
- [ ] 测试页面功能正常
- [ ] 确认用户数据访问正确

## 🎉 迁移完成

完成这些更新后，您的应用就可以完全使用新的CAS认证系统了！ 