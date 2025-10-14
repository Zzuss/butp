# 异步预测系统使用指南

## 🎯 **系统概述**

异步预测系统解决了Vercel函数5分钟超时的问题，通过将计算密集型任务迁移到阿里云服务器异步执行，实现了真正的解耦架构。

### 📈 **架构优势**

| 原同步架构 | 新异步架构 |
|------------|------------|
| Vercel等待20分钟 → **超时失败** | Vercel启动任务30秒 → **立即返回** |
| 单点故障，崩溃丢失进度 | 任务独立运行，可恢复 |
| 无法并发处理多个文件 | 支持多任务并发执行 |
| 用户必须保持页面打开 | 后台执行，用户可离开 |

### 🏗️ **系统架构**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端页面      │    │  Vercel函数     │    │   阿里云服务器   │
│                 │    │                 │    │                 │
│ 1. 上传文件     │───▶│ 2. 导入数据库   │───▶│ 3. 异步预测     │
│ 4. 轮询状态     │◀───│ 5. 查询状态     │◀───│ 6. 返回进度     │
│ 7. 自动导入     │───▶│ 8. 下载结果     │◀───│ 9. 提供文件     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🚀 **部署步骤**

### **1. 部署阿里云异步API服务器**

```bash
# 进入function_aliyun目录
cd function_aliyun

# 给部署脚本执行权限
chmod +x deploy-async.sh

# 执行部署
./deploy-async.sh
```

部署脚本会自动：
- ✅ 停止现有服务
- ✅ 上传异步API服务器
- ✅ 创建工作目录 (`uploads`, `results`)
- ✅ 启动服务在端口8080
- ✅ 验证API端点正常工作

### **2. 验证阿里云服务**

```bash
# 运行API测试脚本
python3 test-async-api.py
```

测试内容：
- 健康检查API
- 专业列表API  
- 完整异步预测流程
- 结果文件下载

### **3. 部署Vercel端**

新的API路由已创建，直接部署到Vercel：
- `/api/admin/prediction/async-start` - 启动异步任务
- `/api/admin/prediction/async-status` - 查询任务状态
- `/api/admin/prediction/async-process` - 处理完成的任务

---

## 📱 **使用方法**

### **访问异步预测页面**

```
https://your-domain.com/admin/prediction/async
```

### **使用流程**

1. **📁 上传文件**
   - 选择Excel成绩文件
   - 选择对应年级(2022/2023/2024)
   - 点击"启动预测任务"

2. **⏳ 监控进度**
   - 系统自动轮询任务状态(每3秒)
   - 实时显示进度条和状态信息
   - 支持手动刷新状态

3. **📊 处理结果**
   - 任务完成后显示"导入数据库"按钮
   - 点击按钮自动下载结果并导入数据库
   - 查看导入成功的专业和记录数

---

## 🔧 **API接口文档**

### **阿里云端API**

#### **启动预测任务**
```http
POST http://8.152.102.160:8080/api/task/start
Content-Type: multipart/form-data

file: Excel文件
year: 年级(2022/2023/2024)
```

**响应:**
```json
{
  "success": true,
  "data": {
    "task_id": "abc123-def456-ghi789",
    "message": "预测任务已启动"
  }
}
```

#### **查询任务状态**
```http
GET http://8.152.102.160:8080/api/task/status/{task_id}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "abc123-def456-ghi789",
    "status": "running",
    "progress": 65,
    "message": "正在预测智能科学与技术专业...",
    "result_files": [],
    "error": null
  }
}
```

**状态说明:**
- `pending` - 等待开始
- `running` - 正在执行  
- `completed` - 执行完成
- `failed` - 执行失败

#### **下载结果文件**
```http
GET http://8.152.102.160:8080/api/task/result/{task_id}/{filename}
```

### **Vercel端API**

#### **启动异步预测**
```http
POST /api/admin/prediction/async-start
Content-Type: multipart/form-data

file: Excel文件
year: 年级
```

#### **查询任务状态**
```http
GET /api/admin/prediction/async-status?taskId={task_id}
```

#### **处理完成任务**
```http
POST /api/admin/prediction/async-process
Content-Type: application/json

{
  "taskId": "abc123-def456-ghi789",
  "year": "2024"
}
```

---

## 🎛️ **管理和监控**

### **服务器管理**

```bash
# SSH连接到服务器
ssh root@8.152.102.160

# 查看服务状态
ps aux | grep async_api_server

# 查看实时日志
tail -f /opt/prediction-service/function/async_api_8080.log

# 重启服务
cd /opt/prediction-service/function
pkill -f async_api_server
python3 async_api_server.py --port 8080 > async_api_8080.log 2>&1 &
```

### **工作目录结构**

```
/opt/prediction-service/function/
├── async_api_server.py          # 异步API服务器
├── run_prediction_direct.py     # 预测算法脚本
├── uploads/                     # 上传文件目录
├── results/                     # 结果文件目录
├── *.json, *.pkl, *.cbm        # 模型文件
└── async_api_8080.log          # 服务日志
```

### **任务文件命名规则**

```
uploads/{timestamp}_{original_filename}
results/{task_id}_{prediction_filename}
```

---

## 🚨 **故障排除**

### **常见问题**

#### **1. 服务启动失败**
```bash
# 检查Python依赖
python3 -c "import flask, pandas; print('依赖正常')"

# 检查必要文件
ls -la *.json *.pkl *.cbm run_prediction_direct.py

# 重新安装依赖
pip3 install flask pandas openpyxl
```

#### **2. 任务卡在pending状态**
```bash
# 检查服务进程
ps aux | grep async_api_server

# 检查日志错误
tail -50 async_api_8080.log

# 重启服务
pkill -f async_api_server
python3 async_api_server.py --port 8080 > async_api_8080.log 2>&1 &
```

#### **3. 网络连接问题**
```bash
# 测试端口连通性
telnet 8.152.102.160 8080

# 测试API可达性
curl http://8.152.102.160:8080/health

# 检查防火墙规则
ufw status
```

### **日志级别和调试**

```bash
# 启用调试模式
python3 async_api_server.py --port 8080 --debug

# 查看详细错误
tail -f async_api_8080.log | grep -E "(ERROR|CRITICAL)"

# 监控磁盘空间
df -h
du -sh uploads/ results/
```

---

## 📊 **性能优化建议**

### **并发控制**

当前系统支持多任务并发，但建议：
- **同时运行任务数**: ≤ 3个
- **单任务最大执行时间**: 30分钟
- **结果文件保留时间**: 24小时

### **资源监控**

```bash
# 监控CPU和内存
htop

# 监控磁盘I/O
iotop

# 清理旧文件
find uploads/ -name "*.xlsx" -mtime +1 -delete
find results/ -name "*.xlsx" -mtime +1 -delete
```

---

## 🔮 **未来扩展**

### **计划中的功能**

1. **任务优先级**: 支持高优先级任务插队
2. **批量预测**: 一次上传多个文件并发处理  
3. **结果缓存**: 相同文件避免重复计算
4. **任务调度**: 定时任务和批处理支持
5. **监控面板**: Web界面查看系统状态

### **扩展建议**

如果需要处理更大规模的数据：
- 考虑使用Redis作为任务队列
- 部署多个阿里云实例做负载均衡
- 使用对象存储(OSS)管理文件
- 集成消息推送通知任务完成

---

## ✅ **总结**

异步预测系统成功解决了：
- ✅ **Vercel超时问题**: 函数执行时间从20分钟降到30秒
- ✅ **用户体验**: 可离开页面，后台自动执行
- ✅ **系统稳定性**: 任务独立运行，故障隔离
- ✅ **扩展性**: 支持并发和大规模数据处理

现在您可以放心处理大型数据集，系统会在后台稳定运行并及时通知结果！
