-- Umami 数据库性能优化脚本（修复版本）
-- 在 Supabase SQL Editor 中运行此脚本
-- 注意：VACUUM 命令需要单独运行，不能在事务块中执行

-- 首先检查哪些表实际存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('session', 'event', 'event_data', 'website', 'account', 'user');

-- 1. 为 session 表添加关键索引
CREATE INDEX IF NOT EXISTS idx_session_website_created_at 
ON session(website_id, created_at);

CREATE INDEX IF NOT EXISTS idx_session_created_at 
ON session(created_at);

-- 2. 为 website 表添加索引
CREATE INDEX IF NOT EXISTS idx_website_share_id 
ON website(share_id) WHERE share_id IS NOT NULL;

-- 3. 如果 event_data 表存在，为其添加索引
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_data') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_data_website_created_at ON event_data(website_id, created_at)';
    END IF;
END $$;

-- 4. 清理数据库统计信息
ANALYZE;

-- 完成索引创建
SELECT 'Index creation completed. Please run VACUUM commands separately.' as status;

-- 
-- 请在单独的SQL命令中运行以下 VACUUM 语句：
-- （一次运行一个，不要放在事务块中）
--

-- VACUUM ANALYZE session;
-- VACUUM ANALYZE website;
-- VACUUM ANALYZE account; 