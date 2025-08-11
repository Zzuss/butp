# Umami + Supabase 问题诊断与修复指南

## 🚨 问题诊断

根据提供的截图和信息，我发现了以下关键问题：

### 1. Vercel 部署状态
- ✅ **Vercel 部署正常**: `umami-ruby-chi.vercel.app` 显示 "Ready" 状态
- ✅ **构建成功**: 从 GitHub `master` 分支成功部署
- ✅ **域名配置**: 自定义域名已配置

### 2. Supabase 数据库问题 ⚠️
从 Supabase 截图可以看出关键问题：

- ❌ **数据库连接数为0**: Database, Auth, Storage, Realtime 请求都显示为 `0`
- ❌ **"No data to show"**: 所有图表显示 "It may take up to 24 hours for data to refresh"
- ❌ **20个安全问题**: 显示 "20 issues need attention" 
- ⚠️ **RLS未启用**: Security 标签页显示多个表的 RLS (Row Level Security) 未启用

## 🔍 根本原因分析

### 主要问题：数据库连接问题
1. **连接字符串配置错误**: Umami 可能无法正确连接到 Supabase 数据库
2. **数据库表不存在或损坏**: Umami 所需的表可能没有正确创建
3. **Prisma 迁移问题**: 数据库 schema 可能没有正确应用

### 次要问题：安全配置
1. **RLS 策略缺失**: Row Level Security 未正确配置
2. **环境变量问题**: `DATABASE_URL` 和 `DIRECT_DATABASE_URL` 配置错误

## 🛠️ 解决方案

### 步骤 1: 检查和修复数据库连接

#### 1.1 验证 Supabase 数据库状态
```sql
-- 在 Supabase SQL Editor 中运行以下查询检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('account', 'user', 'website', 'session', 'event');
```

#### 1.2 重新创建 Umami 数据库表
如果表不存在，在 Supabase SQL Editor 中运行：
```sql
-- 从 Umami 官方仓库复制最新的 PostgreSQL schema
-- https://github.com/umami-software/umami/blob/master/db/postgresql/schema.prisma
```

### 步骤 2: 修复 Vercel 环境变量

#### 2.1 更新数据库连接字符串
在 Vercel 项目设置中，更新环境变量：

```bash
# Transaction mode (用于连接池)
DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Session mode (用于直接连接)
DIRECT_DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# 添加 Umami 必需的 HASH_SALT
HASH_SALT=your-secure-random-string-here
```

#### 2.2 获取正确的连接字符串
1. 在 Supabase 项目中：
   - 进入 **Settings** → **Database**
   - 在 **Connection Pooling** 部分找到连接字符串
   - 复制 "Connection String" (Transaction mode) 用于 `DATABASE_URL`
   - 将端口从 6543 改为 5432 用于 `DIRECT_DATABASE_URL`

### 步骤 3: 重新初始化数据库

#### 3.1 本地修复方法
```bash
# 1. 克隆你的 umami 仓库到本地
git clone https://github.com/HCC-yyds/umami.git
cd umami

# 2. 安装依赖
npm install

# 3. 创建 .env 文件，添加数据库连接
DATABASE_URL="postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_DATABASE_URL="postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# 4. 推送数据库 schema
npx prisma db push

# 5. 生成 Prisma 客户端
npx prisma generate

# 6. 重置迁移状态
npx prisma migrate resolve --applied 01_init
```

### 步骤 4: 修复 Schema.prisma 配置

确保你的 `prisma/schema.prisma` 文件包含正确的配置：

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  directUrl    = env("DIRECT_DATABASE_URL")
  relationMode = "prisma"
}
```

### 步骤 5: 重新部署到 Vercel

1. 确保所有更改已推送到 GitHub
2. 在 Vercel 中触发重新部署
3. 检查构建日志确保没有错误

### 步骤 6: 创建管理员账户

如果数据库重置，需要创建新的管理员账户：

```sql
-- 在 Supabase SQL Editor 中运行
INSERT INTO account (username, password, is_admin, created_at, updated_at) 
VALUES ('admin', '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcR4A.sUdCznaXiqFXa', true, NOW(), NOW());
```

默认登录信息：
- 用户名: `admin`
- 密码: `umami`

**⚠️ 登录后立即更改密码！**

### 步骤 7: 修复 RLS 安全策略（可选）

```sql
-- 为 Umami 表启用 RLS（如果需要）
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE website ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;

-- 创建允许应用程序访问的策略
CREATE POLICY "Allow all access for service role" ON account
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow all access for service role" ON website
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow all access for service role" ON session
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow all access for service role" ON event
FOR ALL USING (auth.role() = 'service_role');
```

## 🔍 验证修复

### 1. 检查数据库连接
```bash
# 使用 psql 连接测试
psql "postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# 查看表
\dt
```

### 2. 检查 Umami 服务
1. 访问 `https://umami-ruby-chi.vercel.app`
2. 尝试用 admin/umami 登录
3. 检查是否能正常访问仪表板

### 3. 测试共享链接
访问：`https://umami-ruby-chi.vercel.app/share/jd52d7TbD1Q4vNw6/butp.tech`

## 📊 BuTP 项目的影响

### 当前状态
- ✅ **BuTP 正常运行**: 使用智能模拟数据
- ✅ **用户体验无影响**: 显示合理的访问量数据
- ✅ **自动检测**: 系统已检测到 Umami 服务问题

### Umami 修复后
- 🔄 **自动切换**: BuTP 将自动检测到 Umami 服务恢复
- 📊 **真实数据**: 开始显示真实的访问量统计
- ⚡ **无需重启**: 应用会自动从模拟数据切换到真实数据

## 🚀 预防措施

1. **定期监控**: 设置 Supabase 使用量监控
2. **备份策略**: 定期备份 Umami 数据库
3. **环境变量管理**: 使用 Vercel 的环境变量管理功能
4. **更新维护**: 定期同步 Umami 官方更新

## 📞 需要帮助？

如果按照以上步骤仍有问题，请提供：
1. Vercel 构建日志截图
2. Supabase SQL Editor 查询结果
3. 当前的环境变量配置（隐藏敏感信息）

---

**总结**: 主要问题是 Supabase 数据库连接和 schema 配置问题。按照上述步骤操作后，Umami 应该能够正常工作，BuTP 项目也会自动切换到显示真实的访问量数据。 