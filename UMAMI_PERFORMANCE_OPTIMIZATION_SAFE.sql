-- Umami 数据库性能优化脚本（安全版本）
-- 在 Supabase SQL Editor 中运行此脚本

-- 首先检查哪些表实际存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('session', 'event', 'event_data', 'website', 'account', 'user');

-- 1. 为 session 表添加关键索引（这个表肯定存在）
CREATE INDEX IF NOT EXISTS idx_session_website_created_at 
ON session(website_id, created_at);

CREATE INDEX IF NOT EXISTS idx_session_created_at 
ON session(created_at);

-- 2. 为 website 表添加索引（这个表也存在）
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

-- 5. 优化已存在表的查询计划
VACUUM ANALYZE session;
VACUUM ANALYZE website;
VACUUM ANALYZE account;

-- 6. 如果有其他表，也进行优化
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_data') THEN
        EXECUTE 'VACUUM ANALYZE event_data';
    END IF;
END $$;

-- 完成
SELECT 'Database optimization completed' as status; 