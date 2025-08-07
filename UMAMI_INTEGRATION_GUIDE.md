# Umami 访问统计集成指南

本指南说明如何在BuTP系统中集成和使用Umami访问统计功能，在关于页面展示日访问量、周访问量、月访问量和半年访问量。

## 📊 功能概述

集成了[Umami Analytics](https://umami-ruby-chi.vercel.app/dashboard)，可以在关于页面展示以下统计数据：

- **日访问量** (过去24小时)
- **周访问量** (过去7天)  
- **月访问量** (过去30天)
- **半年访问量** (过去180天)

每个时间段显示：
- 页面浏览量 (Pageviews)
- 访客数 (Visitors)
- 访问次数 (Visits)
- 平均访问时长
- 跳出率

## 🔧 配置步骤

### 1. 环境变量配置

在您的 `.env.local` 文件中添加以下配置：

```bash
# Umami API 访问配置
UMAMI_BASE_URL=https://umami-ruby-chi.vercel.app
UMAMI_USERNAME=your-umami-username
UMAMI_PASSWORD=your-umami-password
UMAMI_WEBSITE_ID=ddf456a9-f046-48b0-b27b-95a6dc0182b9
```

**重要说明：**
- `UMAMI_USERNAME` 和 `UMAMI_PASSWORD` 是您的Umami账户登录凭据
- `UMAMI_WEBSITE_ID` 是butp.tech网站在Umami中的ID
- 这些是服务器端环境变量，不会暴露给客户端

### 2. 获取Umami登录凭据

1. 访问 [Umami仪表板](https://umami-ruby-chi.vercel.app/dashboard)
2. 使用您的管理员账户登录
3. 确认可以看到butp.tech的统计数据
4. 将登录用户名和密码配置到环境变量中

### 3. 验证配置

访问 `/test-umami` 页面运行配置测试：

- **API路由连接测试**: 验证API端点是否正常
- **环境变量检查**: 确认所有必需变量已配置
- **Umami认证测试**: 测试用户名密码是否正确
- **数据完整性检查**: 验证返回的数据格式

## 📋 API 端点

### `/api/umami-stats`

**方法**: `GET`  
**描述**: 获取网站访问统计数据  
**缓存**: 5分钟  

**响应格式**:
```json
{
  "success": true,
  "data": {
    "daily": {
      "pageviews": 123,
      "visitors": 89,
      "visits": 95,
      "bounceRate": 45,
      "avgVisitDuration": 120
    },
    "weekly": { ... },
    "monthly": { ... },
    "halfYear": { ... }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🎨 使用的组件

### `VisitorStats` 组件

位置: `components/analytics/VisitorStats.tsx`

**功能**:
- 自动从API获取统计数据
- 响应式卡片布局展示
- 加载状态和错误处理
- 数字格式化 (1000 → 1K)
- 时长格式化 (120秒 → 2分钟)

**使用方式**:
```tsx
import VisitorStats from "@/components/analytics/VisitorStats"

export default function AboutPage() {
  return (
    <div>
      {/* 其他内容 */}
      <VisitorStats />
    </div>
  )
}
```

### `umami-api.ts` 工具函数

位置: `lib/umami-api.ts`

**主要函数**:
- `getVisitorStats()`: 获取访问统计数据
- `formatNumber()`: 格式化数字显示
- `formatDuration()`: 格式化时长显示
- `getPeriodDisplayName()`: 获取时间段中文名称

## 🔒 安全考虑

1. **服务器端认证**: Umami认证凭据仅在服务器端使用，不会暴露给客户端
2. **API缓存**: 设置5分钟缓存，减少对Umami服务器的请求频率
3. **错误处理**: 优雅处理认证失败、网络错误等情况
4. **数据验证**: 验证返回数据的完整性和格式

## 🎯 页面集成

访问统计已集成到以下页面：

- **关于页面** (`/about`): 主要展示位置，显示完整的访问统计卡片
- **测试页面** (`/test-umami`): 用于测试配置和调试

## 📱 响应式设计

统计卡片采用响应式网格布局：
- **移动端**: 1列显示
- **平板端**: 2列显示  
- **桌面端**: 4列显示

每个卡片都有独特的渐变色彩：
- 日访问量: 绿色渐变
- 周访问量: 蓝色渐变
- 月访问量: 紫色渐变
- 半年访问量: 橙色渐变

## 🎮 智能数据模式

系统现在提供智能的数据回退机制：

### 数据源切换
- **实时数据模式**: 直接从Umami API获取真实统计数据
- **示例数据模式**: 当API无法访问时自动切换到演示数据
- **手动切换**: 用户可以随时在两种模式间切换

### 自动回退机制
1. 系统首先尝试获取真实数据
2. 如果网络连接失败或API不可用，自动切换到示例数据
3. 用户可以随时重试获取真实数据
4. 清晰的状态指示器显示当前数据源

## 🐛 故障排除

### 网络连接问题

**症状**: 显示"当前显示示例数据 - 无法连接到Umami API"

**可能原因**:
- 网络连接问题
- 防火墙或企业网络限制
- 代理服务器设置
- Umami服务器暂时不可用

**解决方案**:
1. 检查网络连接是否正常
2. 尝试直接访问 [Umami仪表板](https://umami-ruby-chi.vercel.app/dashboard)
3. 检查防火墙或代理设置
4. 运行配置检查: `node check-umami-config.js`
5. 运行连接测试: `node test-umami-connection.js`

### 配置问题

**1. "Umami configuration missing" 错误**
- 检查 `.env.local` 文件中的环境变量是否正确配置
- 确认变量名拼写正确，没有多余空格
- 运行: `node check-umami-config.js`

**2. "Failed to authenticate with Umami" 错误**
- 验证用户名和密码是否正确
- 检查是否有访问Umami仪表板的权限
- 尝试直接登录仪表板验证凭据

**3. 数据显示为0或不正确**
- 确认网站ID是否正确
- 检查是否有该网站的访问权限
- 验证时间范围设置是否正确

### 调试步骤

1. 访问 `/test-umami` 运行完整测试
2. 检查浏览器控制台错误信息
3. 验证环境变量配置
4. 测试直接访问Umami仪表板
5. 查看服务器日志（如果可访问）

## 📈 性能优化

1. **API缓存**: 5分钟缓存减少重复请求
2. **并发请求**: 同时获取所有时间段数据
3. **错误边界**: 统计功能异常不影响页面其他部分
4. **懒加载**: 仅在访问关于页面时加载统计数据

## 🔄 更新和维护

### 定期检查

- 验证Umami服务器连接状态
- 检查API响应时间
- 监控错误率和成功率
- 更新缓存策略

### 扩展功能

可以考虑添加：
- 更多时间段选项（年度统计等）
- 页面级别的详细统计
- 地理位置分析
- 设备和浏览器统计
- 实时访客数量

## 📊 数据来源

所有统计数据来源于：
- **Umami Analytics**: [https://umami-ruby-chi.vercel.app/dashboard](https://umami-ruby-chi.vercel.app/dashboard)
- **网站**: butp.tech
- **更新频率**: 实时收集，每5分钟更新显示

---

如有任何问题或需要技术支持，请联系开发团队或查看Umami官方文档。 