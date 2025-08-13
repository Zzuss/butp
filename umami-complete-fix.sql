-- Umami 数据库完整修复脚本
-- 在 Supabase SQL Editor 中运行

-- 1. 确保有完整的 user 表结构（Umami 官方使用 user 表）
DROP TABLE IF EXISTS "user" CASCADE;
CREATE TABLE "user" (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(60) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP(3)
);

-- 2. 插入管理员用户（密码: umami）
INSERT INTO "user" (user_id, username, password, role, created_at, updated_at)
VALUES (
  '41e2b680-648e-4b09-bcd7-3e2b10c06264'::uuid,
  'admin',
  '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcBIHBEWuVXNYLfJ5Py',
  'admin',
  NOW(),
  NOW()
);

-- 3. 确保 website 表有正确的 user_id 引用
UPDATE website 
SET user_id = '41e2b680-648e-4b09-bcd7-3e2b10c06264'::uuid
WHERE domain = 'butp.tech';

-- 4. 创建必要的索引
CREATE INDEX IF NOT EXISTS idx_user_username ON "user"(username);
CREATE INDEX IF NOT EXISTS idx_website_user_id ON website(user_id);
CREATE INDEX IF NOT EXISTS idx_session_website_id ON session(website_id);

-- 5. 验证数据
SELECT 'User table:' as info, user_id, username, role FROM "user";
SELECT 'Website table:' as info, website_id, name, domain, user_id FROM website;
SELECT 'Join test:' as info, u.username, w.name, w.domain 
FROM "user" u 
JOIN website w ON u.user_id = w.user_id;

-- 完成提示
SELECT 'Database setup completed successfully!' as status; 