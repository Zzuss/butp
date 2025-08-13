# Umami数据库连接修复完整指南

## 🎯 问题分析

**当前状态**：
- Umami服务地址：`https://umami-teal-omega.vercel.app`
- 错误信息：无法连接到 `aws-0-ap-northeast-2.pooler.supabase.com:5432`
- 根本原因：Umami有自己独立的Supabase数据库，连接配置有问题

## 🛠️ 修复步骤

### 步骤1：确认Umami的Supabase项目信息

首先需要确认Umami使用的Supabase项目：

1. **登录Supabase控制台** → [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **查找Umami项目**：
   - 项目名称可能包含 "umami" 
   - 项目URL应该是 `aws-0-ap-northeast-2.pooler.supabase.com`
   - 检查项目的Region是否为 `ap-northeast-2` (Seoul)

### 步骤2：获取正确的数据库连接信息

在Umami的Supabase项目中：

1. **进入 Settings → Database**
2. **找到Connection Pooling部分**
3. **复制连接字符串**：

```bash
# Transaction mode (连接池模式)
DATABASE_URL=postgres://postgres.PROJECT_REF:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Session mode (会话模式)  
DIRECT_DATABASE_URL=postgres://postgres.PROJECT_REF:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

### 步骤3：在Vercel中更新环境变量

1. **登录Vercel控制台** → [https://vercel.com/dashboard](https://vercel.com/dashboard)

2. **找到umami-teal-omega项目**

3. **进入项目设置**：
   - 点击项目名称
   - 点击 "Settings" 标签
   - 点击 "Environment Variables"

4. **添加/更新以下环境变量**：

```bash
# 数据库连接（必需）
DATABASE_URL=postgres://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

DIRECT_DATABASE_URL=postgres://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres

# Umami配置（必需）
HASH_SALT=your-secure-random-string-at-least-32-chars-long

# 应用配置
APP_SECRET=your-app-secret-key
TRACKER_SCRIPT_NAME=script.js
FORCE_SSL=1

# 环境设置
NODE_ENV=production
```

5. **确保环境设置为 "Production"**

### 步骤4：检查和修复数据库Schema

如果数据库连接成功但仍有问题，可能需要重置数据库：

#### 4.1 检查数据库表

在Umami的Supabase项目中，进入 **SQL Editor**，运行：

```sql
-- 检查Umami必需的表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('account', 'user', 'website', 'session', 'event', 'session_data', 'website_event');
```

#### 4.2 如果表不存在，创建Umami Schema

```sql
-- Umami数据库Schema（简化版）
CREATE TABLE IF NOT EXISTS account (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS website (
    website_id SERIAL PRIMARY KEY,
    website_uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id INTEGER REFERENCES account(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(500),
    share_id VARCHAR(64) UNIQUE,
    rev_id INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
    session_id SERIAL PRIMARY KEY,
    session_uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    website_id INTEGER REFERENCES website(website_id) ON DELETE CASCADE,
    hostname VARCHAR(100),
    browser VARCHAR(20),
    os VARCHAR(20),
    device VARCHAR(20),
    screen VARCHAR(11),
    language VARCHAR(35),
    country CHAR(2),
    subdivision1 CHAR(3),
    subdivision2 CHAR(3),
    city VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS website_event (
    event_id SERIAL PRIMARY KEY,
    website_id INTEGER REFERENCES website(website_id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES session(session_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    url_path VARCHAR(500) NOT NULL,
    url_query VARCHAR(1000),
    referrer_path VARCHAR(500),
    referrer_query VARCHAR(1000),
    referrer_domain VARCHAR(500),
    page_title VARCHAR(500),
    event_type INTEGER DEFAULT 1,
    event_name VARCHAR(50)
);

-- 创建必要的索引
CREATE INDEX IF NOT EXISTS idx_website_domain ON website(domain);
CREATE INDEX IF NOT EXISTS idx_session_created_at ON session(created_at);
CREATE INDEX IF NOT EXISTS idx_session_website_id ON session(website_id);
CREATE INDEX IF NOT EXISTS idx_website_event_created_at ON website_event(created_at);
CREATE INDEX IF NOT EXISTS idx_website_event_session_id ON website_event(session_id);
CREATE INDEX IF NOT EXISTS idx_website_event_website_id ON website_event(website_id);
```

#### 4.3 创建默认管理员账户

```sql
-- 创建默认管理员（密码：umami）
INSERT INTO account (username, password, is_admin, created_at, updated_at) 
VALUES ('admin', '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcR4A.sUdCznaXiqFXa', true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
```

### 步骤5：重新部署Umami

1. **在Vercel中触发重新部署**：
   - 在项目页面点击 "Redeploy"
   - 或者在GitHub中推送一个新的提交

2. **监控部署日志**：
   - 检查构建是否成功
   - 查看是否有数据库连接错误

### 步骤6：验证修复结果

#### 6.1 测试Umami服务

```bash
# 在BuTP项目中运行测试
node test-umami-connection.js
```

#### 6.2 访问Umami管理界面

1. 访问：`https://umami-teal-omega.vercel.app/login`
2. 使用默认账户登录：
   - 用户名：`admin`
   - 密码：`umami`
3. **重要**：登录后立即更改密码！

#### 6.3 检查BuTP项目的访问统计

访问BuTP项目的任何页面，然后在Umami仪表板中查看是否有访问数据。

## 🔧 备用解决方案

### 方案A：使用本地Prisma修复

如果有Umami的源码访问权限：

```bash
# 1. 克隆Umami项目
git clone https://github.com/umami-software/umami.git
cd umami

# 2. 安装依赖
npm install

# 3. 配置环境变量
echo "DATABASE_URL=postgres://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true" > .env
echo "DIRECT_DATABASE_URL=postgres://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" >> .env

# 4. 推送数据库schema
npx prisma db push

# 5. 生成客户端
npx prisma generate
```

### 方案B：重新创建Umami服务

如果修复困难，可以考虑：

1. 创建新的Umami实例
2. 使用其他统计服务（如Google Analytics、Plausible）
3. 继续使用BuTP的智能模拟数据（当前完全可行）

## 📊 修复后的验证清单

- [ ] Umami网站可以正常访问
- [ ] 可以使用admin/umami登录
- [ ] 仪表板显示网站列表
- [ ] BuTP项目的访问数据开始显示
- [ ] 没有数据库连接错误

## ⚠️ 注意事项

1. **安全性**：修复后立即更改默认密码
2. **备份**：操作前备份现有数据（如果有）
3. **环境变量**：确保敏感信息不要泄露
4. **监控**：修复后定期检查服务状态

## 🎯 预期结果

修复完成后：
- ✅ Umami服务正常运行
- ✅ BuTP项目自动检测到真实数据可用
- ✅ 访问统计从模拟数据切换到真实数据
- ✅ 用户可以看到实时的访问统计信息 