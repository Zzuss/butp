# BuTP 投票系统（本地版本）

## 功能概述

BuTP 投票系统是一个功能投票排行榜，允许用户对"最希望BuTP未来添加的功能"进行投票。系统支持以下功能：

- 5个预设功能选项（A-E）
- 每个用户只能投一票
- 可以撤销投票并重新选择
- 实时显示票数和百分比
- 按票数从高到低排序
- 前三名特殊标识

## 功能选项

1. **A - 移动端应用开发**
2. **B - 人工智能与机器学习功能**
3. **C - 社交学习与讨论功能**
4. **D - 职业规划与就业指导**
5. **E - 多语言国际化支持**

## 技术实现

### 前端组件
- `components/voting-poll.tsx` - 投票组件
- `lib/voting-data.ts` - 投票数据API

### 数据存储
系统使用本地存储：

- **本地存储**（当前版本）
  - 使用浏览器 localStorage
  - 数据保存在用户本地浏览器中
  - 清除浏览器数据会丢失投票记录
  - 适合单用户测试和演示

### 数据库表结构

#### voting_options 表
```sql
CREATE TABLE voting_options (
  id SERIAL PRIMARY KEY,
  option_key VARCHAR(10) NOT NULL UNIQUE,
  option_text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### user_votes 表
```sql
CREATE TABLE user_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  option_id INTEGER NOT NULL REFERENCES voting_options(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, option_id)
);
```

## 安装和配置

### 1. 启动应用
```bash
npm run dev
```

### 2. 访问投票页面
访问 `http://localhost:3000/about` 页面，滚动到底部查看投票排行榜。

### 3. 数据库版本（可选）
如果需要多用户支持，可以运行 `database-init.sql` 脚本创建数据库表，然后修改 `lib/voting-data.ts` 文件恢复数据库连接。

## 使用方法

1. 访问 `/about` 页面
2. 滚动到页面底部查看投票排行榜
3. 登录后可以参与投票
4. 点击"投票"按钮为喜欢的功能投票
5. 可以点击"撤销投票"重新选择

## 特性

### 响应式设计
- 支持桌面和移动设备
- 自适应布局和字体大小

### 实时更新
- 投票后立即更新显示
- 实时计算百分比和排名

### 用户友好
- 清晰的投票规则说明
- 直观的进度条显示
- 前三名特殊标识（金、银、铜）

### 容错机制
- 数据库连接失败时自动切换到本地存储
- 优雅的错误处理和用户提示

## 自定义选项

可以通过修改 `lib/voting-data.ts` 中的 `initialVotingOptions` 数组来更改投票选项：

```typescript
export const initialVotingOptions = [
  { option_key: 'A', option_text: '你的选项A' },
  { option_key: 'B', option_text: '你的选项B' },
  // ... 更多选项
]
```

## 注意事项

1. 数据保存在本地浏览器中，清除浏览器数据会丢失投票记录
2. 不同浏览器之间的数据不会同步
3. 投票系统需要用户登录才能参与投票
4. 每个用户在同一时间只能为一个选项投票
5. 适合单用户测试和演示，如需多用户支持请使用数据库版本

## 故障排除

### 常见问题

1. **投票按钮不响应**
   - 检查用户是否已登录
   - 确认浏览器支持localStorage

2. **数据丢失**
   - 检查是否清除了浏览器数据
   - 确认浏览器没有禁用localStorage

3. **显示异常**
   - 刷新页面重新加载数据
   - 检查浏览器控制台错误信息

### 调试模式
在浏览器控制台中可以看到详细的调试信息，包括：
- 本地存储操作日志
- 投票操作日志
- 错误信息 