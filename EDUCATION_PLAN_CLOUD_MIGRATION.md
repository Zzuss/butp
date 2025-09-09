# 培养方案云存储迁移指南

## 问题概述

原来的培养方案功能 (`/education-plan`) 依赖本地文件系统存储，在生产环境（如 Vercel）中无法正常工作，因为：

1. **文件系统限制**：Vercel 等云平台的文件系统是只读和临时的
2. **数据丢失**：重新部署后上传的文件会丢失
3. **无法访问**：生产环境无法直接访问本地文件

## 解决方案

已将文件存储迁移到 **Supabase Storage**，实现：

✅ **持久化存储**：文件永久保存在云端  
✅ **生产环境兼容**：在 butp.tech 正常工作  
✅ **功能不变**：保持原有的上传、下载、删除功能  
✅ **自动备份**：云端自动备份和冗余  

## 技术实现

### 1. 后端 API 更新

- **`/api/education-plan`**：从 Supabase Storage 获取文件列表
- **`/api/education-plan/upload`**：上传文件到 Supabase Storage
- **`/api/education-plan/delete`**：从 Supabase Storage 删除文件

### 2. 前端组件更新

- **下载功能**：使用 Supabase 公开 URL
- **文件管理**：兼容云存储和本地存储
- **错误处理**：增强错误提示和处理

### 3. 新增工具函数

在 `lib/supabase.ts` 中添加：
- `uploadEducationPlan()` - 文件上传
- `deleteEducationPlan()` - 文件删除  
- `listEducationPlans()` - 文件列表
- `getEducationPlanUrl()` - 获取公开链接

## 部署步骤

### 步骤 1：环境配置

确保生产环境的 `.env.local` 包含正确的 Supabase 配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 步骤 2：创建 Storage Bucket

在 Supabase Dashboard 中：

1. 进入 **Storage** → **Buckets**
2. 创建新 bucket：
   - **名称**：`education-plans`
   - **Public**：启用（允许公开访问）
   - **文件大小限制**：50MB
   - **允许的文件类型**：`application/pdf`

或者运行迁移脚本会自动创建。

### 步骤 3：迁移现有文件

运行迁移脚本将本地文件上传到 Supabase：

```bash
# 安装依赖（如果还没有）
npm install

# 运行迁移脚本
node scripts/migrate-education-plans.js
```

迁移脚本会：
- 自动检查和创建 Storage Bucket
- 上传本地 `public/Education_Plan_PDF/` 中的所有 PDF 文件
- 跳过已存在的文件
- 显示迁移进度和结果

### 步骤 4：部署代码

```bash
# 构建和部署
npm run build
git add .
git commit -m "migrate education plans to Supabase Storage"
git push
```

### 步骤 5：验证功能

1. 访问 `https://butp.tech/education-plan`
2. 测试文件列表显示
3. 测试文件上传功能
4. 测试文件下载功能
5. 测试文件删除功能

## 文件迁移结果

原本地文件：
- `Education_Plan_PDF_2020.pdf`
- `Education_Plan_PDF_2022.pdf`
- `Education_Plan_PDF_2023.pdf`
- `Education_Plan_PDF_2024.pdf`

迁移后这些文件将在 Supabase Storage 中可用，并且可以通过公开 URL 访问。

## 使用说明

### 上传文件

1. 选择 PDF 文件
2. 输入年份（如：2024）
3. 点击"上传文件"
4. 文件将以 `Education_Plan_PDF_2024.pdf` 格式保存

### 下载文件

- 点击下载按钮即可直接下载文件
- 文件通过 Supabase 的 CDN 提供，速度快且稳定

### 删除文件

- 点击删除按钮确认删除
- 文件将从云存储中永久删除

## 兼容性说明

代码保持向后兼容：
- 如果 Supabase 不可用，会尝试使用本地路径
- 现有的文件名格式和验证规则保持不变
- API 响应格式保持一致

## 故障排除

### 1. 上传失败

**可能原因**：
- 文件太大（>50MB）
- 非 PDF 文件
- Supabase 配置错误

**解决方法**：
- 检查文件格式和大小
- 验证环境变量配置
- 查看浏览器控制台错误

### 2. 下载失败

**可能原因**：
- 文件不存在
- Supabase Storage 配置问题
- 网络连接问题

**解决方法**：
- 检查文件是否存在于 Supabase Storage
- 验证 bucket 的公开访问设置
- 检查网络连接

### 3. 迁移脚本失败

**可能原因**：
- 环境变量未设置
- Supabase 权限不足
- 本地文件不存在

**解决方法**：
- 检查 `.env.local` 配置
- 确认 Supabase 项目权限
- 验证本地文件路径

## 技术支持

如需帮助，请检查：

1. **Supabase Dashboard**：查看 Storage 状态和文件
2. **浏览器控制台**：查看 JavaScript 错误
3. **网络面板**：检查 API 请求状态
4. **服务器日志**：查看后端错误信息

---

## 总结

通过此次迁移，培养方案功能现在可以在生产环境中稳定运行，文件数据得到可靠保存，并且具备了更好的扩展性和维护性。
