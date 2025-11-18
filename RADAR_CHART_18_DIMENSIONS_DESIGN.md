# 雷达图从5个维度扩展到18个维度 - 设计方案

## 一、当前架构分析

### 1.1 当前实现（5个维度）

**数据层：**
- 数据表：`student_abilities_rada`
- 字段：5个能力维度字段
  1. `数理逻辑与科学基础`
  2. `专业核心技术`
  3. `人文与社会素养`
  4. `工程实践与创新应用`
  5. `职业发展与团队协作`

**查询层：**
- 文件：`lib/ability-data.ts`
- 函数：`getStudentAbilityData()`
- 返回：`number[]` (5个数值)

**展示层：**
- 文件：`app/analysis/page.tsx`
- 标签定义：`abilityLabels` (中英文各5个)
- 状态：`abilityData` (初始值 `[0, 0, 0, 0, 0]`)

**组件层：**
- 文件：`components/ui/radar-chart.tsx`
- 特点：使用 `data.length` 动态计算角度，支持任意数量数据点

### 1.2 雷达图组件兼容性

✅ **已支持动态维度**：
- 角度计算：`(i * 2 * Math.PI) / data.length`
- 自动适应任意数量的数据点
- 标签位置自动计算

⚠️ **需要注意的问题**：
- 18个标签在圆形雷达图上可能重叠
- 标签文字可能过长，需要调整字体大小或使用缩写
- 画布大小可能需要调整以容纳更多标签

## 二、18个维度设计方案

### 2.1 维度定义建议

基于现有的9个课程类别和5个能力维度，建议的18个维度可以是：

**方案A：基于课程类别的细分（推荐）**
1. 公共课程
2. 实践课程
3. 数学科学
4. 政治课程
5. 基础学科
6. 创新课程
7. 英语课程
8. 基础专业
9. 专业课程
10. 数理逻辑与科学基础
11. 专业核心技术
12. 人文与社会素养
13. 工程实践与创新应用
14. 职业发展与团队协作
15. [维度15] - 待定义
16. [维度16] - 待定义
17. [维度17] - 待定义
18. [维度18] - 待定义

**方案B：完全自定义18个维度**
需要业务方提供具体的18个维度定义

### 2.2 数据库设计

**表结构修改：**
```sql
-- 在 student_abilities_rada 表中添加13个新字段
ALTER TABLE student_abilities_rada 
ADD COLUMN "维度6" NUMERIC DEFAULT 0,
ADD COLUMN "维度7" NUMERIC DEFAULT 0,
-- ... 继续添加至维度18
ADD COLUMN "维度18" NUMERIC DEFAULT 0;
```

**或者创建新表：**
```sql
CREATE TABLE student_abilities_18d (
  SNH TEXT PRIMARY KEY,
  "维度1" NUMERIC DEFAULT 0,
  "维度2" NUMERIC DEFAULT 0,
  -- ... 18个维度字段
  "维度18" NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 三、技术实现方案

### 3.1 数据查询层修改 (`lib/ability-data.ts`)

```typescript
// 定义18个维度的字段名（需要根据实际数据库字段调整）
const DIMENSION_FIELDS = [
  '数理逻辑与科学基础',
  '专业核心技术',
  '人文与社会素养',
  '工程实践与创新应用',
  '职业发展与团队协作',
  '维度6',  // 替换为实际字段名
  '维度7',
  // ... 继续至维度18
  '维度18'
];

export async function getStudentAbilityData(
  studentId: string, 
  year?: string | number
): Promise<number[]> {
  try {
    let studentHash = studentId;
    if (studentId.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentId)) {
      studentHash = await sha256(studentId);
    }

    const tableName = 'student_abilities_rada' // 或新表名

    // 动态构建查询字段
    const selectFields = DIMENSION_FIELDS.join(', ');

    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq('SNH', studentHash)
      .limit(1)

    if (error) {
      console.error('❌ 查询学生能力数据时发生错误:', error)
      throw new Error(`数据库查询失败: ${error.message || '未知错误'}`)
    }

    if (!data || data.length === 0) {
      throw new Error(`学生能力数据缺失: ${tableName} 表中找不到该学生的能力评估数据`)
    }

    const studentRecord = data[0];
    
    // 返回18个维度的数值数组
    return DIMENSION_FIELDS.map(field => studentRecord[field] || 0)
  } catch (error) {
    console.error('❌ getStudentAbilityData 函数执行失败:', error)
    throw error
  }
}
```

### 3.2 前端展示层修改 (`app/analysis/page.tsx`)

```typescript
// 18个维度的标签定义（中英文）
const abilityLabels = {
  zh: [
    '数理逻辑与科学基础',
    '专业核心技术',
    '人文与社会素养',
    '工程实践与创新应用',
    '职业发展与团队协作',
    '维度6',  // 替换为实际标签
    '维度7',
    // ... 继续至维度18
    '维度18'
  ],
  en: [
    'Math & Science Foundation',
    'Professional Core Technology',
    'Humanities & Social Literacy',
    'Engineering Practice & Innovation',
    'Career Development & Teamwork',
    'Dimension 6',  // 替换为实际英文标签
    'Dimension 7',
    // ... 继续至维度18
    'Dimension 18'
  ]
}

// 修改初始状态
const [abilityData, setAbilityData] = useState<number[]>(
  new Array(18).fill(0)  // 18个0
);

// 修改模态框内容（如果有18个对应的课程推荐）
const modalContents = [
  // 需要为每个维度提供对应的课程推荐
  { title: "为提高数理逻辑与科学基础能力，建议注重以下课程:", content: [...] },
  // ... 18个模态框内容
]
```

### 3.3 雷达图组件优化 (`components/ui/radar-chart.tsx`)

**需要优化的点：**

1. **画布大小调整**
```typescript
// 增加画布大小以容纳更多标签
const size = 600  // 从450增加到600
const radius = size / 2 - 100  // 从80增加到100，为标签留出更多空间
```

2. **标签字体大小调整**
```typescript
// 18个标签时使用更小的字体
const fontSize = data.length > 10 ? 10 : 12
ctx.font = `bold ${fontSize}px Arial`
```

3. **标签位置优化**
```typescript
// 增加标签偏移距离
const labelRadius = radius + (data.length > 10 ? 60 : 50)
```

4. **标签文字处理**
```typescript
// 如果标签过长，可以考虑截断或换行
const displayLabel = labels[i].length > 8 
  ? labels[i].substring(0, 8) + '...' 
  : labels[i]
```

5. **标签重叠检测（可选）**
```typescript
// 检测相邻标签是否重叠，如果重叠则调整位置
// 这是一个复杂的算法，可以后续优化
```

## 四、实施步骤

### 步骤1：确认18个维度的定义
- [ ] 与业务方确认18个维度的具体名称
- [ ] 确认数据库字段命名规范
- [ ] 确认中英文标签

### 步骤2：数据库准备
- [ ] 在 `student_abilities_rada` 表中添加13个新字段
- [ ] 或者创建新的 `student_abilities_18d` 表
- [ ] 准备数据迁移脚本（如果有历史数据）

### 步骤3：后端修改
- [ ] 修改 `lib/ability-data.ts` 查询18个字段
- [ ] 测试数据查询功能
- [ ] 处理数据缺失情况

### 步骤4：前端修改
- [ ] 修改 `app/analysis/page.tsx` 中的标签定义
- [ ] 修改初始状态为18个维度
- [ ] 更新模态框内容（如果有）
- [ ] 测试数据加载和显示

### 步骤5：雷达图组件优化
- [ ] 调整画布大小
- [ ] 优化标签显示（字体、位置）
- [ ] 测试18个标签的显示效果
- [ ] 处理标签重叠问题（如果需要）

### 步骤6：测试和优化
- [ ] 功能测试：数据加载、显示、交互
- [ ] UI测试：标签可读性、布局美观性
- [ ] 性能测试：大量数据加载性能
- [ ] 兼容性测试：不同屏幕尺寸

## 五、潜在问题和解决方案

### 问题1：标签重叠
**解决方案：**
- 使用更小的字体
- 增加画布大小
- 实现标签智能布局算法
- 考虑使用标签引线（从标签指向对应顶点）

### 问题2：标签文字过长
**解决方案：**
- 使用缩写
- 文字截断
- 多行显示（需要更复杂的布局算法）
- 悬停显示完整标签

### 问题3：雷达图过于密集
**解决方案：**
- 增加画布大小
- 调整数据点大小
- 优化颜色和透明度
- 考虑分组显示（如：基础能力、专业能力等）

### 问题4：数据缺失
**解决方案：**
- 默认值处理（返回0或平均值）
- 错误提示
- 数据验证

## 六、推荐实施顺序

1. **第一阶段：数据层**
   - 确认18个维度定义
   - 数据库表结构修改
   - 数据查询函数修改

2. **第二阶段：展示层**
   - 前端标签定义
   - 状态管理修改
   - 基本显示测试

3. **第三阶段：组件优化**
   - 雷达图组件调整
   - 标签布局优化
   - UI美化

4. **第四阶段：测试和优化**
   - 全面测试
   - 性能优化
   - 用户体验优化

## 七、代码示例

### 完整的修改示例（待确认维度后填充）

```typescript
// lib/ability-data.ts
const DIMENSION_18_FIELDS = [
  '维度1', '维度2', '维度3', '维度4', '维度5',
  '维度6', '维度7', '维度8', '维度9', '维度10',
  '维度11', '维度12', '维度13', '维度14', '维度15',
  '维度16', '维度17', '维度18'
];

// app/analysis/page.tsx
const abilityLabels18 = {
  zh: ['维度1', '维度2', ...], // 18个中文标签
  en: ['Dimension 1', 'Dimension 2', ...] // 18个英文标签
};
```

## 八、注意事项

1. **向后兼容**：如果系统中有其他地方依赖5个维度，需要考虑兼容性
2. **数据迁移**：如果有历史数据，需要准备迁移脚本
3. **性能考虑**：18个维度可能增加数据查询和渲染负担
4. **用户体验**：18个标签可能让界面显得拥挤，需要仔细设计

