# 数据库配置说明

## 🔧 环境变量配置

为了解决 `all-course-data` API 的数据库连接问题，请按照以下步骤配置环境变量：

### 1. 创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
# 复制 env.template 文件
cp env.template .env.local
```

### 2. 配置Supabase连接

在 `.env.local` 文件中配置以下变量：

```env
# Supabase PostgreSQL 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. 获取Supabase配置值

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 Settings > API
4. 复制以下信息：
   - **Project URL**: 填入 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. 验证配置

配置完成后，重启开发服务器：

```bash
npm run dev
# 或
yarn dev
```

## 🚨 当前问题分析

根据错误日志 `Failed to fetch source 1 data`，问题出现在：

1. **数据库连接失败**：Supabase客户端无法连接到数据库
2. **表访问权限**：可能没有访问 `Cohort2023_Predictions_ee` 表的权限
3. **配置过期**：硬编码的配置可能已过期

## ✅ 解决方案

### 方案1：使用环境变量（推荐）

按照上述步骤配置环境变量，这样更安全且易于管理。

### 方案2：更新硬编码配置

如果环境变量配置有困难，可以：

1. 检查硬编码配置是否仍然有效
2. 更新 `app/api/all-course-data/route.ts` 中的配置值
3. 确保数据库表存在且有访问权限

### 方案3：检查数据库权限

1. 确认 `Cohort2023_Predictions_ee` 表存在
2. 验证匿名用户有读取权限
3. 检查RLS（行级安全）策略设置

## 🔍 调试步骤

1. **检查环境变量**：
   ```bash
   node debug-confirm-modification.js
   ```

2. **测试API连接**：
   ```bash
   node test-all-course-data-api.js
   ```

3. **查看详细错误日志**：
   - 浏览器控制台会显示详细的数据库连接信息
   - 包括URL、错误代码、错误详情等

## 📋 配置检查清单

- [ ] `.env.local` 文件已创建
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已配置
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置
- [ ] 开发服务器已重启
- [ ] 数据库表存在且有访问权限
- [ ] 环境变量在API中正确加载

## 🆘 如果问题仍然存在

1. 检查Supabase项目状态
2. 验证网络连接
3. 查看Supabase日志
4. 联系Supabase支持

## 📞 技术支持

如果按照以上步骤仍然无法解决问题，请提供：

1. 完整的错误日志
2. 环境变量配置（隐藏敏感信息）
3. Supabase项目状态截图
4. 浏览器网络请求详情
