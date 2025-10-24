# Supabase Storage 隐私条款系统设置指南

系统现在完全使用 **Supabase Storage** 管理隐私条款文件，适用于 Vercel 等 serverless 平台。

## 🚀 快速设置

### 1. 创建 Storage Bucket
在 Supabase 控制台的 SQL Editor 中运行：

```sql
-- 创建隐私条款文件存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('privacy-files', 'privacy-files', true)
ON CONFLICT (id) DO NOTHING;
```

### 2. 设置访问策略
```sql
-- 允许所有人读取隐私条款文件
CREATE POLICY "Allow public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'privacy-files');

-- 允许管理员上传/更新文件
CREATE POLICY "Allow admin write access" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'privacy-files');

CREATE POLICY "Allow admin update access" ON storage.objects 
FOR UPDATE USING (bucket_id = 'privacy-files');

CREATE POLICY "Allow admin delete access" ON storage.objects 
FOR DELETE USING (bucket_id = 'privacy-files');
```

### 3. 运行数据库迁移
```sql
-- 在 Supabase SQL Editor 中运行整个 migrations/create_privacy_policy_storage.sql 文件
```

## ✅ 完成！

设置完成后，系统将：
- ✅ 管理员可以上传任意格式的隐私条款文件
- ✅ 文件存储在 Supabase Storage 中
- ✅ 数据库只存储元数据（文件名、大小、版本等）
- ✅ 用户看到的始终是最新文件内容
- ✅ 上传新文件后，所有用户需要重新同意
- ✅ 支持 Vercel 等 serverless 平台完美运行

## 🛠️ 数据架构

### 文件存储
- **位置**: Supabase Storage bucket `privacy-files`
- **文件名**: `privacy-policy-latest.{extension}`
- **支持格式**: .docx, .doc, .pdf, .txt, .html

### 数据库表
- **`privacy_policy`**: 存储文件元数据和版本信息
- **`privacy_agreements`**: 存储用户同意记录

### API 端点
- **上传**: `POST /api/admin/privacy-policy/replace`
- **读取**: `GET /api/privacy-content`
- **同意检查**: `GET /api/auth/privacy-agreement`
- **记录同意**: `POST /api/auth/privacy-agreement`

## 📱 使用流程

1. **管理员上传新文件** → 文件保存到 Supabase Storage
2. **系统自动创建版本记录** → 数据库存储元数据
3. **用户访问时** → 从 Storage 实时读取最新文件
4. **强制重新同意** → 基于版本比较自动触发

所有功能现在都完全兼容 Vercel 部署！🎉
