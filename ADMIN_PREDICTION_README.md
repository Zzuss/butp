# 学生去向预测系统 - 管理员使用指南

## 功能概述

本系统提供了一个完整的学生去向预测管理后台，允许管理员上传成绩表文件，自动运行机器学习预测算法，并下载预测结果。

## 主要功能

### 1. 成绩文件上传与预测
- **路径**: `/admin/prediction`
- **功能**: 上传Excel格式的成绩表文件，系统自动识别年级并运行预测算法
- **支持年级**: 2021级、2022级、2023级、2024级
- **输出**: 各专业的预测结果Excel文件

### 2. 学号哈希值映射管理
- **路径**: `/admin/SNH`
- **功能**: 管理学号与哈希值的映射关系

### 3. 管理后台首页
- **路径**: `/admin`
- **功能**: 统一的管理后台入口，提供各功能模块的快捷访问

## 使用步骤

### 准备工作

1. **安装Python依赖包**
   ```bash
   python install_dependencies.py
   ```
   或手动安装：
   ```bash
   pip install pandas numpy catboost scikit-learn openpyxl
   ```

2. **确保培养方案文件存在**
   - 检查 `function/education-plan[年级]/` 目录下是否有对应年级的培养方案Excel文件
   - 例如：`function/education-plan2022/2022级智能科学与技术培养方案.xlsx`

### 运行预测

1. **访问管理后台**
   - 打开浏览器访问 `/admin`
   - 点击"学生去向预测"模块

2. **上传成绩文件**
   - 选择Excel格式的成绩表文件（.xlsx, .xls）
   - 系统会自动识别文件名中的年级信息
   - 也可手动选择年级

3. **开始预测**
   - 点击"开始预测"按钮
   - 系统会显示实时处理进度
   - 处理时间取决于学生数量和专业数量

4. **下载结果**
   - 预测完成后，系统会显示生成的预测文件
   - 点击下载按钮获取结果文件
   - 文件包含各专业的详细预测结果

## 文件格式要求

### 成绩文件格式
- **文件类型**: Excel (.xlsx, .xls)
- **文件名格式**: 建议包含年级信息，如 `Cohort2022_NoPre20SN_masked Aug25.xlsx`
- **必需列**:
  - `SNH` 或类似的学号列
  - `Course_Name` 课程名称列
  - `Grade` 或类似的成绩列
  - `Current_Major` 专业列（可选）

### 输出文件格式
- **主要输出**: `Cohort[年级]_Predictions_[专业代码].xlsx`
- **汇总文件**: `Cohort[年级]_Predictions_All.xlsx`
- **内容包含**:
  - 学生基本信息
  - 当前成绩各类别分数
  - 预测去向（1=保研, 2=出国, 3=就业等）
  - 预测置信度
  - 建议最低分数要求

## 系统架构

### 前端组件
- `app/admin/page.tsx` - 管理后台首页
- `app/admin/prediction/page.tsx` - 预测管理页面

### API接口
- `app/api/admin/prediction/run/route.ts` - 上传文件并运行预测
- `app/api/admin/prediction/download/route.ts` - 下载预测结果
- `app/api/admin/prediction/cleanup/route.ts` - 清理临时文件

### Python算法
- `function/run_prediction_direct.py` - 主运行脚本
- `function/Optimization_model_func3_1.py` - 核心预测算法
- `function/Model_Params/` - 预训练模型文件
- `function/education-plan[年级]/` - 各年级培养方案

## 故障排除

### 常见问题

1. **Python包导入错误**
   - 运行 `python install_dependencies.py` 安装依赖
   - 检查Python版本是否兼容（推荐3.8+）

2. **文件上传失败**
   - 检查文件格式是否正确（Excel）
   - 确认文件大小不超过限制
   - 检查临时目录权限

3. **预测算法执行失败**
   - 检查培养方案文件是否存在
   - 验证成绩文件格式是否符合要求
   - 查看错误日志获取详细信息

4. **下载文件失败**
   - 检查预测是否成功完成
   - 确认文件是否存在于临时目录
   - 尝试重新运行预测

### 日志查看
- Python预测过程的详细日志会显示在前端界面
- 服务器错误日志可在控制台查看
- 临时文件存储在 `temp_predictions/` 目录

## 维护建议

1. **定期清理临时文件**
   - 使用清理API: `POST /api/admin/prediction/cleanup`
   - 或手动删除 `temp_predictions/` 下的过期目录

2. **监控存储空间**
   - 预测结果文件可能较大，注意磁盘空间
   - 建议定期备份重要的预测结果

3. **更新培养方案**
   - 新学年需要更新对应年级的培养方案文件
   - 放置在 `function/education-plan[年级]/` 目录下

4. **模型更新**
   - 预训练模型文件位于 `function/Model_Params/`
   - 如需更新模型，替换相应的模型文件

## 技术支持

如遇到技术问题，请检查：
1. Python环境和依赖包版本
2. 文件权限和路径配置
3. 网络连接状态
4. 服务器资源使用情况

更多技术细节请参考源代码和相关文档。
