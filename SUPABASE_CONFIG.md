# 🔧 Supabase 数据库配置

## 📋 配置步骤

### 1. 创建环境变量文件
在项目根目录创建 `.env.local` 文件：

```bash
# 在项目根目录创建 .env.local 文件
touch .env.local
```

### 2. 配置环境变量
在 `.env.local` 文件中添加以下配置：

```env
# Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase 服务角色密钥（Service Role Key）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 可选：配置第二个 Supabase 项目（双库读写）
```env
# 第二个 Supabase 项目 URL 和 anon key（仅当需要同时连接两个项目时）
NEXT_PUBLIC_SUPABASE2_URL=https://your-second-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE2_ANON_KEY=your-second-project-anon-key
```

新增客户端文件：`lib/supabaseSecondary.ts`
- 导出 `supabaseSecondary` 用于连接第二个项目
- 使用环境变量 `NEXT_PUBLIC_SUPABASE2_URL` 和 `NEXT_PUBLIC_SUPABASE2_ANON_KEY`

示例使用：
```ts
import { supabase } from '@/lib/supabase'
import { supabaseSecondary } from '@/lib/supabaseSecondary'

// 从主库读取
const { data: primaryData } = await supabase
  .from('table_a')
  .select('*')

// 从次库读取
const { data: secondaryData } = await supabaseSecondary
  .from('table_b')
  .select('*')
```

### 3. 获取 Supabase 配置信息

#### 方法 1: Supabase 仪表板
1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 选择您的项目
3. 进入 **Settings** > **API**
4. 复制以下信息：
   - **URL**: 项目 URL
   - **Service Role Key**: 服务角色密钥（注意不是 anon key）

#### 方法 2: 使用 Supabase CLI
```bash
# 如果你在项目中使用了 Supabase CLI
supabase status
```

### 4. 验证配置
重启开发服务器后，查看控制台输出：
- ✅ `✓ Supabase 客户端初始化成功` - 配置正确
- ⚠️ `⚠️ Supabase 环境变量未配置` - 需要检查配置

## 🔒 安全注意事项

⚠️ **重要**: 
- `.env.local` 文件已被 `.gitignore` 忽略，不会提交到版本控制
- **永远不要**将 Service Role Key 提交到代码仓库
- Service Role Key 具有完整的数据库访问权限，请妥善保管

## 🚫 如果不配置数据库

如果您暂时不需要数据库功能，预测算法依然可以正常运行：
- ✅ 文件上传和预测算法正常工作
- ✅ 可以下载生成的预测文件
- ❌ 预测结果不会自动导入数据库
- ❌ 概率表不会更新

系统会显示：`跳过数据库导入：Supabase 未配置`
