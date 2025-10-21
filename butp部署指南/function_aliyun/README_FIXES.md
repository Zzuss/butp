# 阿里云预测服务修复方案 v2.0

## 🚨 问题描述

**核心问题**: 2024年级预测结果包含 `'Design & Build实训（智能）'` 字段，导致数据库导入失败。

**问题根源**: 算法硬编码使用2023年培养方案，没有根据年级参数动态选择培养方案。

## 🔧 已修复的问题

### 1. **算法年级参数支持** ✅
- **文件**: `run_prediction_direct.py`
- **修改**: 添加 `--year` 参数支持，动态选择培养方案
- **效果**: 2024年级使用2024年培养方案，不再包含问题课程

### 2. **健壮的API服务器** ✅
- **文件**: `robust_api_server.py` (新建)
- **功能**: 
  - 支持多端口部署 (8080, 8001)
  - 完善的错误处理和日志记录
  - 环境验证和状态检查
  - 详细的调试信息

### 3. **模型文件路径修复** ✅
- **问题**: 模型文件路径不正确
- **解决**: 确保所有模型文件在算法根目录
- **文件**: `feature_columns.json`, `catboost_model.cbm`, `scaler.pkl`, `model_params.json`

### 4. **自动化部署脚本** ✅
- **Linux**: `deploy.sh` - 完整的systemd服务部署
- **Windows**: `deploy.bat` - Windows环境部署脚本
- **功能**: 备份、部署、服务配置、验证

### 5. **完整的测试验证** ✅
- **文件**: `test_fix.py`
- **功能**: 本地算法测试、API接口测试、预测结果验证

## 📁 文件结构

```
function_aliyun/
├── 核心算法文件
│   ├── run_prediction_direct.py      # 支持年级参数的主算法 ✅
│   ├── Optimization_model_func3_1.py # 预测核心算法
│   └── robust_api_server.py          # 健壮的API服务器 ✅
│
├── 模型文件 (已复制到根目录)
│   ├── feature_columns.json          ✅
│   ├── catboost_model.cbm           ✅
│   ├── scaler.pkl                   ✅
│   └── model_params.json            ✅
│
├── 培养方案数据
│   ├── education-plan2023/          # 2023年级培养方案
│   ├── education-plan2024/          # 2024年级培养方案 ✅
│   └── Model_Params/                # 原始模型文件目录
│
├── 部署脚本
│   ├── deploy.sh                    # Linux部署脚本 ✅
│   ├── deploy.bat                   # Windows部署脚本 ✅
│   └── test_fix.py                  # 验证测试脚本 ✅
│
└── 文档
    └── README_FIXES.md              # 本文件 ✅
```

## 🚀 部署方法

### 方法1: Linux自动部署 (推荐)

```bash
# 1. 上传文件到服务器
scp -r function_aliyun/* root@8.152.102.160:/tmp/prediction_deploy/

# 2. 登录服务器执行部署
ssh root@8.152.102.160
cd /tmp/prediction_deploy
chmod +x deploy.sh
sudo ./deploy.sh
```

### 方法2: Windows一键部署

```batch
:: 1. 修改deploy.bat中的服务器地址
:: 将 your_server_ip 改为 8.152.102.160

:: 2. 运行部署脚本
deploy.bat
```

### 方法3: 手动部署

```bash
# 1. 备份现有服务
sudo systemctl stop prediction-api-8080 || true
sudo systemctl stop prediction-api-8001 || true
cp -r /opt/prediction-service/function /opt/prediction-service/backup_$(date +%Y%m%d_%H%M%S)

# 2. 部署新文件
rm -rf /opt/prediction-service/function/*
scp -r function_aliyun/* root@8.152.102.160:/opt/prediction-service/function/

# 3. 安装依赖
ssh root@8.152.102.160 "cd /opt/prediction-service/function && pip3 install flask pandas openpyxl catboost scikit-learn numpy"

# 4. 启动服务
ssh root@8.152.102.160 "cd /opt/prediction-service/function && nohup python3 robust_api_server.py --port 8080 > /var/log/prediction-8080.log 2>&1 &"
ssh root@8.152.102.160 "cd /opt/prediction-service/function && nohup python3 robust_api_server.py --port 8001 > /var/log/prediction-8001.log 2>&1 &"
```

## 🧪 验证修复效果

### 本地验证

```bash
cd function_aliyun
python test_fix.py
```

### 服务器验证

```bash
# 健康检查
curl http://8.152.102.160:8080/health
curl http://8.152.102.160:8001/health

# 详细状态
curl http://8.152.102.160:8080/status

# 测试2024年预测 (应该不包含 'Design & Build实训（智能）')
curl -X POST http://8.152.102.160:8080/api/predict \
  -F "year=2024" \
  -F "major=智能科学与技术" \
  -F "scores_file=@test_scores.xlsx"
```

## 📊 修复效果对比

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| **年级支持** | ❌ 硬编码2023年 | ✅ 动态支持所有年级 |
| **培养方案** | ❌ 始终使用2023年数据 | ✅ 根据年级选择正确数据 |
| **问题字段** | ❌ 包含'Design & Build实训（智能）' | ✅ 2024年级不包含此字段 |
| **数据库导入** | ❌ 字段不匹配，导入失败 | ✅ 字段匹配，导入成功 |
| **API服务** | ❌ 单一服务，错误处理简单 | ✅ 多端口，健壮的错误处理 |
| **部署方式** | ❌ 手动部署，容易出错 | ✅ 自动化脚本，一键部署 |

## 🔍 关键修改详情

### 1. 年级参数传递链路

```
本地API (/api/admin/prediction/run) 
    ↓ 传递year参数
阿里云API (http://8.152.102.160:8080/api/predict)
    ↓ 传递--year参数  
算法脚本 (run_prediction_direct.py)
    ↓ 动态选择培养方案
education-plan{year}目录
```

### 2. 培养方案选择逻辑

```python
def get_course_file_path(major_name, year):
    # 1. 优先使用处理后文件
    course_process_file = f"Course_Process_{year}_{code}.xlsx"
    if exists(course_process_file):
        return course_process_file
    
    # 2. 使用原始培养方案文件 ✅ 关键修复
    education_plan_file = f"education-plan{year}/{year}级{major_name}培养方案.xlsx"
    if exists(education_plan_file):
        return education_plan_file
    
    raise FileNotFoundError(f"找不到{year}级培养方案")
```

## 🚨 注意事项

### 1. 服务端口说明
- **8080端口**: 主服务端口
- **8001端口**: 备用服务端口  
- 两个端口运行相同的服务，提供冗余

### 2. 常见问题排查

**Q: API依然返回问题字段怎么办？**
```bash
# 1. 检查服务是否完全重启
sudo systemctl status prediction-api-8080
sudo ps aux | grep python

# 2. 查看服务日志
tail -f /var/log/prediction-api-8080.log

# 3. 手动测试算法
cd /opt/prediction-service/function
python3 run_prediction_direct.py --year 2024 --scores_file test.xlsx --major 智能科学与技术
```

**Q: 部署失败怎么办？**
```bash
# 1. 检查文件完整性
cd /opt/prediction-service/function
ls -la *.py education-plan2024/

# 2. 检查Python依赖
pip3 list | grep -E "(flask|pandas|catboost)"

# 3. 手动验证
python3 test_fix.py
```

## 📞 支持

如果遇到问题，请提供以下信息：
1. 错误日志 (`/var/log/prediction-api-*.log`)
2. 服务状态 (`systemctl status prediction-api-*`)
3. 测试脚本输出 (`python3 test_fix.py`)
4. API响应 (`curl http://8.152.102.160:8080/status`)

---

**最后更新**: 2024年10月14日  
**版本**: v2.0  
**状态**: ✅ 已修复，待部署验证
