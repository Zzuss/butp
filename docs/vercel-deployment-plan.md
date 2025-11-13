# Vercel部署优化方案

## 🎯 核心问题
1. 内存状态在无服务器函数间不共享
2. 文件存储需要持久化解决方案
3. 后台处理需要适配无服务器环境

## 🔧 解决方案

### 方案A：数据库存储文件元数据（推荐）
```sql
-- 创建文件存储表
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id TEXT UNIQUE NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_path TEXT, -- Vercel Blob存储路径
  status TEXT DEFAULT 'uploaded' -- uploaded, processing, completed, failed
);
```

### 方案B：使用Vercel Blob存储
- 文件上传到 `@vercel/blob`
- 元数据存储在Supabase
- 无需本地文件系统

### 方案C：边缘函数优化
- 使用Vercel Edge Functions
- 更长的执行时间限制
- 更好的并发处理

## 🚀 实施步骤

### 1. 安装Vercel Blob
```bash
npm install @vercel/blob
```

### 2. 更新文件上传API
```typescript
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  
  // 上传到Vercel Blob
  const blob = await put(filename, request.body, {
    access: 'public',
  });
  
  // 保存元数据到数据库
  await supabase.from('uploaded_files').insert({
    file_id: blob.pathname,
    original_name: filename,
    file_size: blob.size,
    file_path: blob.url
  });
}
```

### 3. 优化处理队列
- 使用数据库轮询替代内存状态
- 每个函数调用处理少量文件
- 利用Vercel Cron Jobs定期触发

## ⚡ 性能优化
1. 减少函数冷启动
2. 优化数据库查询
3. 使用边缘缓存
4. 分批处理大文件
