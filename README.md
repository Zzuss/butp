This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 主题设置

本项目已配置为始终使用浅色模式，即使在系统设置为深色模式的情况下也是如此。这是通过在HTML根元素上添加`light`类名并在CSS中设置相应的变量值来实现的。

## 数据导入说明

本项目使用Supabase作为数据库，支持从Excel文件导入学生成绩数据。最近一次导入的数据统计如下：

### 数据统计概览
- **总记录数**: 202,650 条
- **学生数量**: 约 3,320 名
- **课程数量**: 约 754 门
- **学期范围**: 2020-2021-1 至 2023-2024-2
- **成绩分布**:
  - 数值成绩: 最低 0 分，最高 100 分，平均 82.66 分
  - 等级成绩: 优、良、中、及格

### 课程类型分布
- 公共课: 90,923 条记录
- 专业课: 43,709 条记录
- 实践教学课: 32,886 条记录
- 思想政治理论课: 27,637 条记录
- 院级双创课: 3,927 条记录
- 校级双创课: 3,431 条记录
- 其他: 21 条记录

### 导入步骤

1. 准备Excel文件，确保包含以下列：
   - SNH: 学生学号
   - Semester_Offered: 学期
   - Current_Major: 当前专业
   - Course_ID: 课程ID
   - Course_Name: 课程名称
   - Grade: 成绩
   - Course_Type: 课程类型
   - Course_Attribute: 课程属性
   - Hours: 学时
   - Credit: 学分
   - Offering_Unit: 开课单位
   - Exam_Type: 考试类型
   - Assessment_Method: 评估方法

2. 将Excel文件命名为`butp_academic_results.xlsx`并放在项目根目录。

3. 安装所需依赖：
   ```bash
   npm install xlsx dotenv
   ```

4. 运行导入脚本：
   ```bash
   node update_academic_results.js
   ```

5. 验证数据完整性：
   ```bash
   node verify_data_integrity.js
   ```

6. 生成数据统计摘要：
   ```bash
   node data_summary.js
   ```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
