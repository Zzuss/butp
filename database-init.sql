-- BuTP 投票系统数据库初始化脚本

-- 创建投票选项表
CREATE TABLE IF NOT EXISTS voting_options (
  id SERIAL PRIMARY KEY,
  option_key VARCHAR(10) NOT NULL UNIQUE,
  option_text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户投票记录表
CREATE TABLE IF NOT EXISTS user_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  option_id INTEGER NOT NULL REFERENCES voting_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, option_id)
);

-- 插入初始投票选项
INSERT INTO voting_options (option_key, option_text) VALUES
  ('A', '移动端应用开发'),
  ('B', '人工智能与机器学习功能'),
  ('C', '社交学习与讨论功能'),
  ('D', '职业规划与就业指导'),
  ('E', '多语言国际化支持')
ON CONFLICT (option_key) DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_option_id ON user_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_voting_options_vote_count ON voting_options(vote_count DESC);

-- 创建增加票数的函数
CREATE OR REPLACE FUNCTION increment_vote_count(option_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE voting_options 
  SET vote_count = vote_count + 1, updated_at = NOW()
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- 创建减少票数的函数
CREATE OR REPLACE FUNCTION decrement_vote_count(option_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE voting_options 
  SET vote_count = GREATEST(0, vote_count - 1), updated_at = NOW()
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voting_options_updated_at
  BEFORE UPDATE ON voting_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 