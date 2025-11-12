# 成绩导入管理 - 影子表机制

## 概述

本功能使用影子表机制安全导入成绩数据到 `academic_results` 表，实现真正的原子交换，无数据空档期。

## 初始化步骤

### 1. 创建影子表和RPC函数

在Supabase SQL Editor中执行 `scripts/create-shadow-table-rpc.sql` 脚本，这将：

- 创建 `academic_results_shadow` 影子表（字段名使用双引号保持大小写）
- 创建 `swap_academic_results_tables()` RPC函数（原子交换表）
- 创建 `clear_shadow_table()` RPC函数（清空影子表）
- 创建 `shadow_table_exists()` RPC函数（检查表是否存在）

**重要提示**：
- 影子表的字段名必须与原表 `academic_results` 完全一致（包括大小写）
- 如果之前创建的影子表字段名都是小写，请先执行 `scripts/fix-shadow-table-columns.sql` 修复

### 2. 验证RPC函数

执行以下SQL验证函数是否创建成功：

```sql
-- 检查函数是否存在
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('swap_academic_results_tables', 'clear_shadow_table', 'shadow_table_exists');
```

## 工作原理

### 原子交换流程

1. **清空影子表**：确保从干净状态开始
2. **导入数据到影子表**：将所有文件数据分批导入影子表
3. **原子交换表**：使用PostgreSQL的 `ALTER TABLE ... RENAME` 操作
   - 将 `academic_results` 重命名为 `academic_results_old`（备份）
   - 将 `academic_results_shadow` 重命名为 `academic_results`（原子操作）
   - 删除 `academic_results_old`（可选）

### 优势

- ✅ **无空档期**：表交换是原子操作，不会出现数据为空的情况
- ✅ **事务安全**：整个交换过程在PostgreSQL事务中执行
- ✅ **自动回滚**：如果导入失败，自动清空影子表，不影响原表
- ✅ **备份保护**：原表会先备份为 `academic_results_old`

## 使用流程

1. 访问 `/admin/grades-import` 页面
2. 上传成绩Excel文件（支持多个文件）
3. 查看文件列表，可以删除不需要的文件
4. 点击"开始导入到数据库"按钮
5. 系统自动执行：
   - 检查影子表是否存在
   - 清空影子表
   - 导入数据到影子表
   - 原子交换表（无空档期）
   - 如果失败，自动回滚

## 回滚机制

如果导入过程中出现错误：

1. **导入失败**：自动清空影子表，原表数据不受影响
2. **交换失败**：原表保持不变，影子表数据被清空

## 手动回滚（如果需要）

如果交换后需要恢复到之前的数据：

```sql
-- 恢复原表
ALTER TABLE academic_results RENAME TO academic_results_shadow;
ALTER TABLE academic_results_old RENAME TO academic_results;
```

## 注意事项

1. **首次使用前**：必须在Supabase中执行 `scripts/create-shadow-table-rpc.sql` 脚本
2. **备份表**：`academic_results_old` 会在交换时自动创建，如果需要保留备份，可以修改RPC函数不删除它
3. **权限要求**：RPC函数需要 `SECURITY DEFINER` 权限来执行DDL操作
4. **并发安全**：建议在导入过程中不要同时执行其他操作

## 故障排查

### 错误：影子表不存在

**解决方案**：执行 `scripts/create-shadow-table-rpc.sql` 脚本创建影子表

### 错误：RPC函数不存在

**解决方案**：执行 `scripts/create-shadow-table-rpc.sql` 脚本创建RPC函数

### 错误：权限不足

**解决方案**：确保RPC函数有 `SECURITY DEFINER` 权限，并且服务端密钥有执行权限

### 错误：字段名大小写不匹配

**症状**：导入时出现字段名错误，提示字段不存在

**原因**：PostgreSQL默认将未加双引号的字段名转换为小写，导致与原表字段名不一致

**解决方案**：
1. 如果影子表是空的，直接删除重建：
   ```sql
   DROP TABLE IF EXISTS academic_results_shadow;
   ```
   然后执行 `scripts/create-shadow-table-rpc.sql` 脚本

2. 如果影子表有数据，执行 `scripts/fix-shadow-table-columns.sql` 脚本修复字段名

