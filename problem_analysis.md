# 阿里云API问题分析

## 🔍 **可能的问题原因**

### 1. **代码没有真正更新**
- ❌ 上传到了错误的目录
- ❌ 文件权限问题，上传失败
- ❌ 覆盖了错误的文件

**解决方案:**
```bash
# 在阿里云服务器上检查
cd /path/to/function/
ls -la run_prediction_direct.py
grep "argparse" run_prediction_direct.py
```

### 2. **API服务没有完全重启**
- ❌ 旧的Python进程还在运行
- ❌ 代码被缓存，没有重新加载
- ❌ 多个API服务实例同时运行

**解决方案:**
```bash
# 强制杀死所有相关进程
sudo pkill -9 -f "python.*api"
sudo pkill -9 -f "python.*prediction"

# 确认没有进程残留
ps aux | grep python

# 重新启动
cd /path/to/function/
python api_server.py
```

### 3. **培养方案文件路径问题**
- ❌ education-plan2024目录不存在
- ❌ 文件名不匹配
- ❌ 文件编码问题

**解决方案:**
```bash
# 检查培养方案文件
ls -la education-plan2024/
ls -la education-plan2024/2024级智能科学与技术培养方案.xlsx

# 如果文件不存在，从本地复制
scp -r D:\newProject\butp\function_aliyun\education-plan2024 user@server:/path/to/function/
```

### 4. **算法内部缓存问题**
- ❌ 算法内部有硬编码的缓存
- ❌ 模型文件没有更新
- ❌ 中间文件没有清理

**解决方案:**
```bash
# 清理可能的缓存文件
cd /path/to/function/
rm -f *.pkl *.cache
rm -f Cohort*_Predictions_*.xlsx
rm -rf __pycache__/
```

### 5. **负载均衡或代理缓存**
- ❌ 前面有Nginx等代理服务器缓存了响应
- ❌ 负载均衡器指向了旧的服务实例

**解决方案:**
```bash
# 重启Nginx（如果有）
sudo systemctl restart nginx

# 直接访问API，绕过代理
curl -X GET http://127.0.0.1:8080/health
```

## 🛠️ **推荐的完整修复流程**

### 第1步: 完全停止服务
```bash
# 停止所有相关进程
sudo systemctl stop nginx  # 如果有
sudo pkill -9 -f "python"  # 谨慎使用，可能会影响其他服务
# 或者更精确的
sudo pkill -9 -f "api_server"
sudo pkill -9 -f "run_prediction"

# 确认进程已停止
ps aux | grep python
netstat -tulpn | grep 8080
```

### 第2步: 重新上传代码
```bash
# 在本地执行
scp -r D:\newProject\butp\function_aliyun/* user@8.152.102.160:/path/to/function/

# 或者压缩后上传
tar -czf function_aliyun.tar.gz -C D:\newProject\butp\ function_aliyun/
scp function_aliyun.tar.gz user@8.152.102.160:/tmp/
# 在服务器上解压
cd /path/to/function/
tar -xzf /tmp/function_aliyun.tar.gz --strip-components=1
```

### 第3步: 验证代码更新
```bash
# 在阿里云服务器上运行验证脚本
cd /path/to/function/
python verify_algorithm_fix.py
```

### 第4步: 重启服务
```bash
# 启动API服务
cd /path/to/function/
nohup python api_server.py > api.log 2>&1 &

# 检查服务状态
sleep 5
curl -X GET http://localhost:8080/health
```

### 第5步: 测试修复效果
```bash
# 测试2024年级预测
curl -X POST http://localhost:8080/api/predict \
  -F "year=2024" \
  -F "major=智能科学与技术" \
  -F "scores_file=@test_file.xlsx"
```
