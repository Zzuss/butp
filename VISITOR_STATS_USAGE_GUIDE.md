# BuTP 网站访问统计使用指南

## 🎯 功能说明

BuTP 项目在关于页面（`/about`）集成了真实的网站访问统计功能，基于 Umami Analytics 提供准确的访问数据。

## 📊 显示的数据

### 四个时间维度的统计
- **日访问量** (过去24小时)
- **周访问量** (过去7天)  
- **月访问量** (过去30天)
- **半年访问量** (过去180天)

### 每个时间段包含
- 📈 **页面浏览量** (Pageviews)
- 👥 **访客数** (Visitors)
- 🔄 **访问次数** (Visits)
- ⏰ **跳出率** (Bounce Rate)
- 🕐 **平均访问时长** (Average Visit Duration)

## 🔄 数据来源

### 真实数据模式
- ✅ **数据源**: Umami Analytics
- ✅ **服务地址**: https://umami-teal-omega.vercel.app
- ✅ **网站ID**: ec362d7d-1d62-46c2-8338-6e7c0df7c084
- ✅ **更新频率**: 每5分钟缓存更新
- ✅ **隐私保护**: 不使用Cookie，完全匿名

### 智能降级模式
当 Umami 服务不可用时，系统会：
- 🔄 自动切换到智能模拟数据
- 📊 基于真实网站访问模式生成
- ⚠️ 明确标注数据来源

## 🖥️ 使用方法

### 1. 访问统计页面
```
https://butp.tech/about
```

### 2. 查看统计数据
- 滚动到页面下方的"📊 BuTP 网站真实访问统计"部分
- 查看四个时间段的详细数据
- 注意数据源标识（实时数据 vs 演示数据）

### 3. 手动刷新数据
- 点击"手动刷新"按钮获取最新数据
- 点击"强制刷新"重置缓存
- 点击"尝试真实数据"重新连接 Umami

## 🎨 界面说明

### 数据卡片颜色
- 🟦 **日访问量**: 蓝色渐变
- 🟢 **周访问量**: 绿色渐变
- 🟣 **月访问量**: 紫色渐变
- 🟠 **半年访问量**: 橙色渐变

### 状态指示器
- 🟢 **已连接**: 成功获取真实数据
- 🟡 **检查中**: 正在连接 Umami 服务
- 🔴 **连接失败**: 使用智能模拟数据

### 数据源标识
- ✅ **实时数据**: 来自 Umami Analytics
- 📊 **演示数据**: 智能模拟数据
- 🔄 **混合数据**: 部分真实 + 部分模拟

## ⚙️ 本地开发配置

### 启用分析功能
创建 `.env.local` 文件：
```bash
# 启用 Umami 分析追踪
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Umami 配置
NEXT_PUBLIC_UMAMI_WEBSITE_ID=ec362d7d-1d62-46c2-8338-6e7c0df7c084
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://umami-teal-omega.vercel.app/script.js
```

### 本地测试
```bash
# 测试 Umami 连接
node test-umami-connection.js

# 启动开发服务器
npm run dev
```

## 🔗 相关链接

- **Umami 仪表板**: https://umami-teal-omega.vercel.app/login
  - 用户名: `admin`
  - 密码: `umami`
- **BuTP 关于页面**: https://butp.tech/about
- **技术文档**: `UMAMI_INTEGRATION_GUIDE.md`

## 🛠️ 技术实现

### 数据流
1. **前端组件** (`VisitorStats.tsx`) 
2. **API 路由** (`/api/umami-stats`)
3. **Umami 服务** (`umami-teal-omega.vercel.app`)
4. **数据库** (Supabase PostgreSQL)

### 缓存机制
- **浏览器缓存**: 5分钟
- **CDN缓存**: stale-while-revalidate
- **API缓存**: 5分钟服务端缓存

## 🆘 故障排除

### 显示"演示数据"
1. 检查网络连接
2. 验证 Umami 服务状态
3. 点击"手动刷新"重试
4. 检查浏览器控制台错误

### 数据不准确
1. 等待5分钟让缓存更新
2. 手动刷新页面
3. 检查时间范围设置
4. 联系管理员检查 Umami 配置

### 页面加载慢
1. 数据获取超时设置为8秒
2. 会自动降级到智能模拟数据
3. 不影响页面其他内容显示

## 📈 数据价值

### 对用户的价值
- 了解网站受欢迎程度
- 验证功能使用情况
- 建立使用信心

### 对开发团队的价值
- 真实用户行为数据
- 性能监控指标
- 产品改进依据

---

*最后更新：2025年1月*  
*如有问题请联系开发团队* 