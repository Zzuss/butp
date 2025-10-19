# 阿里云服务器检查命令

## 1. 检查代码是否正确更新

```bash
# 进入function目录
cd /path/to/your/function/  # 替换为你的实际路径

# 检查run_prediction_direct.py是否包含年级参数
grep -A 10 "argparse" run_prediction_direct.py
grep "year" run_prediction_direct.py

# 检查是否有education-plan2024目录
ls -la education-plan2024/

# 检查2024年培养方案文件
ls -la education-plan2024/2024级智能科学与技术培养方案.xlsx
```

## 2. 检查API服务状态

```bash
# 查看运行中的Python进程
ps aux | grep python
ps aux | grep api_server

# 检查端口8080是否被占用
netstat -tulpn | grep 8080
lsof -i :8080
```

## 3. 完全停止和重启服务

```bash
# 方法1: 如果是systemd服务
sudo systemctl stop prediction-api    # 替换为你的实际服务名
sudo systemctl status prediction-api  # 确认服务已停止
sudo systemctl start prediction-api
sudo systemctl status prediction-api  # 确认服务已启动

# 方法2: 如果是手动启动的进程
sudo pkill -f "python.*api_server.py"  # 强制杀死所有相关进程
sudo pkill -f "python.*run_prediction"
ps aux | grep python  # 确认进程已结束

# 重新启动
cd /path/to/your/function/
nohup python api_server.py > api.log 2>&1 &
```

## 4. 测试API接口

```bash
# 健康检查
curl -X GET http://localhost:8080/health

# 测试预测接口（如果有小测试文件）
curl -X POST http://localhost:8080/api/predict \
  -F "year=2024" \
  -F "major=智能科学与技术" \
  -F "scores_file=@/path/to/small_test.xlsx"
```

## 5. 查看服务日志

```bash
# 查看当前日志
tail -f api.log
tail -f /var/log/prediction-api.log  # 根据实际日志路径调整

# 查看systemd日志（如果是systemd服务）
journalctl -u prediction-api -f
```
