-- 创建隐私条款同意表
-- 在Supabase SQL Editor中运行此脚本

-- 创建privacy_agreement表
CREATE TABLE IF NOT EXISTS privacy_agreement (
    id SERIAL PRIMARY KEY,
    SNH VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_privacy_agreement_snh ON privacy_agreement(SNH);
CREATE INDEX IF NOT EXISTS idx_privacy_agreement_created_at ON privacy_agreement(created_at);

-- 添加注释
COMMENT ON TABLE privacy_agreement IS '用户隐私条款同意记录表';
COMMENT ON COLUMN privacy_agreement.id IS '主键ID';
COMMENT ON COLUMN privacy_agreement.SNH IS '学生学号哈希值';
COMMENT ON COLUMN privacy_agreement.created_at IS '同意时间';
COMMENT ON COLUMN privacy_agreement.updated_at IS '更新时间';

-- 启用RLS（行级安全）
ALTER TABLE privacy_agreement ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 允许用户查看自己的记录
CREATE POLICY "Users can view their own privacy agreement" ON privacy_agreement
    FOR SELECT USING (SNH = current_setting('request.jwt.claims', true)::json->>'user_hash');

-- 允许用户插入自己的记录
CREATE POLICY "Users can insert their own privacy agreement" ON privacy_agreement
    FOR INSERT WITH CHECK (SNH = current_setting('request.jwt.claims', true)::json->>'user_hash');

-- 允许用户更新自己的记录
CREATE POLICY "Users can update their own privacy agreement" ON privacy_agreement
    FOR UPDATE USING (SNH = current_setting('request.jwt.claims', true)::json->>'user_hash');

-- 允许用户删除自己的记录
CREATE POLICY "Users can delete their own privacy agreement" ON privacy_agreement
    FOR DELETE USING (SNH = current_setting('request.jwt.claims', true)::json->>'user_hash');

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_privacy_agreement_updated_at 
    BEFORE UPDATE ON privacy_agreement 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 显示表结构
\d privacy_agreement;

-- 显示创建的索引
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'privacy_agreement';

-- 显示RLS策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'privacy_agreement';
