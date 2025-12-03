# 数据库表结构更新说明

## 隐私条款系统简化架构

为了支持新的简化隐私条款架构，**必须**更新 `user_privacy_agreements` 表结构。

### 必需的表结构更新

执行以下SQL语句来更新表结构：

```sql
-- 1. 添加新字段
ALTER TABLE user_privacy_agreements 
ADD COLUMN privacy_policy_file VARCHAR(255);

ALTER TABLE user_privacy_agreements 
ADD COLUMN privacy_policy_version VARCHAR(255);

-- 2. 清空旧数据（因为字段结构变化）
DELETE FROM user_privacy_agreements;

-- 3. 删除旧约束
ALTER TABLE user_privacy_agreements 
DROP CONSTRAINT IF EXISTS user_privacy_agreements_user_id_privacy_policy_id_key;

-- 4. 添加新约束
ALTER TABLE user_privacy_agreements 
ADD CONSTRAINT unique_user_file_version 
UNIQUE (user_id, privacy_policy_file, privacy_policy_version);

-- 5. 可选：删除旧字段
ALTER TABLE user_privacy_agreements 
DROP COLUMN IF EXISTS privacy_policy_id;
```

### 新字段说明

- **`privacy_policy_file`**: 存储隐私条款文件名（如 `privacy-policy-latest.docx`）
- **`privacy_policy_version`**: 存储文件的修改时间作为版本标识
- **`user_id`**: 用户哈希值
- **`agreed_at`**: 用户同意的时间
- **`ip_address`**: 用户IP地址
- **`user_agent`**: 用户浏览器信息
- **`created_at`**: 记录创建时间

### 完整的表结构

更新后的表结构：

```sql
CREATE TABLE IF NOT EXISTS user_privacy_agreements (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    privacy_policy_file VARCHAR(255) NOT NULL,
    privacy_policy_version VARCHAR(255) NOT NULL,
    agreed_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, privacy_policy_file, privacy_policy_version)
);
```

### 验证更新

执行完成后，可以用这个查询验证表结构：

```sql
-- 查看表结构
\d user_privacy_agreements

-- 或者使用
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_privacy_agreements';
```

### 重要提醒

⚠️ **必须先执行SQL更新，否则隐私条款功能无法正常工作！**

系统现在只使用新的字段结构，不再支持兼容模式。
