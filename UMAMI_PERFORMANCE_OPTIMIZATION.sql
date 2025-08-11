-- Umami 数据库性能优化脚本
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 为 session 表添加关键索引
CREATE INDEX IF NOT EXISTS idx_session_website_created_at 
ON session(website_id, created_at);

CREATE INDEX IF NOT EXISTS idx_session_created_at 
ON session(created_at);

-- 2. 为 event 表添加索引（如果存在）
CREATE INDEX IF NOT EXISTS idx_event_session_id 
ON event(session_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event');

CREATE INDEX IF NOT EXISTS idx_event_website_created_at 
ON event(website_id, created_at) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event');

-- 3. 为 website 表添加索引
CREATE INDEX IF NOT EXISTS idx_website_share_id 
ON website(share_id) WHERE share_id IS NOT NULL;

-- 4. 清理数据库统计信息
ANALYZE;

-- 5. 优化查询计划
VACUUM ANALYZE session;
VACUUM ANALYZE event;
VACUUM ANALYZE website;

-- 注意：这些操作可能需要几分钟时间完成 