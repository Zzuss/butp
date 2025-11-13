# 数据库权限设置

由于使用ANON_KEY而不是SERVICE_ROLE_KEY，需要确保数据库的RLS策略允许匿名用户操作。

## 🔧 需要在Supabase中执行的SQL

### 1. 禁用相关表的RLS（推荐用于后台处理）

```sql
-- 禁用导入相关表的RLS，允许匿名用户操作
ALTER TABLE import_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_file_details DISABLE ROW LEVEL SECURITY;

-- 如果需要，也可以禁用成绩表的RLS（谨慎操作）
ALTER TABLE academic_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_results_old DISABLE ROW LEVEL SECURITY;
```

### 2. 或者创建允许匿名用户的RLS策略

```sql
-- 为import_tasks表创建策略
CREATE POLICY "Allow anon access to import_tasks" ON import_tasks
FOR ALL USING (true);

-- 为import_file_details表创建策略  
CREATE POLICY "Allow anon access to import_file_details" ON import_file_details
FOR ALL USING (true);

-- 为academic_results表创建策略
CREATE POLICY "Allow anon access to academic_results" ON academic_results
FOR ALL USING (true);

-- 为academic_results_old表创建策略
CREATE POLICY "Allow anon access to academic_results_old" ON academic_results_old
FOR ALL USING (true);
```

### 3. 确保RPC函数可以被匿名用户调用

```sql
-- 授予匿名用户执行RPC函数的权限
GRANT EXECUTE ON FUNCTION truncate_results_old() TO anon;
GRANT EXECUTE ON FUNCTION swap_results_with_old() TO anon;
```

## ⚠️ 安全注意事项

使用ANON_KEY意味着：
- 任何知道你的ANON_KEY的人都可以访问这些表
- 建议在生产环境中使用SERVICE_ROLE_KEY
- 如果必须使用ANON_KEY，确保：
  1. 限制网络访问（只允许ECS服务器IP）
  2. 定期轮换密钥
  3. 监控异常访问

## 🔍 测试权限

执行上述SQL后，运行测试脚本：
```bash
node test-connection.js
```

应该看到所有权限测试都通过。
