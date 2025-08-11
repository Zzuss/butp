# Umami 分析集成指南

## 🎯 集成状态

✅ **已完成集成** - Umami 分析追踪已集成到 BuTP 项目中

## 📊 配置信息

- **Umami 服务地址**: https://umami-teal-omega.vercel.app
- **网站 ID**: `ec362d7d-1d62-46c2-8338-6e7c0df7c084`
- **追踪脚本**: `https://umami-teal-omega.vercel.app/script.js`

## 🔧 本地开发配置

### 启用分析功能

在你的 `.env.local` 文件中添加：

```bash
# 在开发环境启用 Umami 分析
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### 生产环境配置

生产环境会自动启用分析功能（`NODE_ENV=production`）。

## 📁 相关文件

### 组件文件
- `components/analytics/UmamiAnalytics.tsx` - Umami 分析组件
- `app/layout.tsx` - 根布局，包含 Umami 脚本

### 测试文件
- `test-umami-connection.js` - 测试 Umami 服务连接

## 🧪 测试连接

```bash
# 单次测试
node test-umami-connection.js

# 持续监控
node test-umami-connection.js --monitor
```

## 🚀 使用方法

1. **自动追踪**: 页面浏览会自动追踪
2. **自定义事件**: 可以通过 `window.umami.track()` 追踪自定义事件

### 自定义事件示例

```javascript
// 追踪点击事件
window.umami?.track('Button Click', { button: 'login' });

// 追踪用户操作
window.umami?.track('User Action', { action: 'search', query: 'example' });
```

## 📈 查看数据

- **管理员登录**: https://umami-teal-omega.vercel.app/login
  - 用户名: `admin`
  - 密码: `umami`

## 🔒 隐私设置

- ✅ 不使用 Cookie
- ✅ 不跨域追踪
- ✅ 完全匿名
- ✅ GDPR 兼容

## ⚙️ 高级配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | 开发环境是否启用分析 | `false` |
| `NODE_ENV` | 生产环境自动启用 | - |

### 排除 IP

在 Umami 管理界面中可以配置排除特定 IP 地址。

## 🆘 故障排除

### 1. 分析不工作
- 检查环境变量设置
- 确认 `UmamiAnalytics` 组件正确加载
- 查看浏览器控制台是否有错误

### 2. 数据不显示
- 等待几分钟让数据同步
- 检查时间范围设置
- 确认网站域名配置正确

### 3. 脚本加载失败
- 检查 Umami 服务状态
- 确认网络连接正常
- 检查防火墙设置 