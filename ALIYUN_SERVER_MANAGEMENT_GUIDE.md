# 🖥️ 阿里云预测服务进程管理指南

## 📊 服务架构
```
Nginx (端口8080) → Gunicorn (端口8001) → Flask API → 预测算法
```

## 🔍 查看服务状态

### 1. 检查所有相关服务
```bash
# 检查预测API服务状态
sudo systemctl status prediction-api

# 检查Nginx状态
sudo systemctl status nginx

# 查看所有运行的Python进程
ps aux | grep python

# 查看端口占用情况
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :8001
```

### 2. 服务详细信息
```bash
# 查看服务配置
sudo systemctl show prediction-api

# 查看服务启动时间和运行状态
sudo systemctl status prediction-api --no-pager -l
```

## 📋 查看日志

### 1. 系统服务日志 (推荐)
```bash
# 查看预测API服务日志 (实时)
sudo journalctl -u prediction-api -f

# 查看最近的日志 (最近100行)
sudo journalctl -u prediction-api -n 100

# 查看今天的日志
sudo journalctl -u prediction-api --since today

# 查看特定时间段的日志
sudo journalctl -u prediction-api --since "2024-01-01 10:00:00" --until "2024-01-01 12:00:00"

# 查看Nginx日志
sudo journalctl -u nginx -f
```

### 2. 应用程序日志
```bash
# 查看Gunicorn访问日志 (如果有配置)
sudo tail -f /var/log/gunicorn/prediction-api-access.log

# 查看Gunicorn错误日志
sudo tail -f /var/log/gunicorn/prediction-api-error.log

# 查看Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 3. Flask应用日志
```bash
# 如果应用有自定义日志文件
sudo tail -f /var/log/prediction-api/app.log

# 查看Python错误和输出
sudo journalctl -u prediction-api | grep -E "(ERROR|Exception|Traceback)"
```

## 🛠️ 进程管理

### 1. 服务控制命令
```bash
# 启动服务
sudo systemctl start prediction-api
sudo systemctl start nginx

# 停止服务
sudo systemctl stop prediction-api
sudo systemctl stop nginx

# 重启服务
sudo systemctl restart prediction-api
sudo systemctl restart nginx

# 重新加载配置 (不中断服务)
sudo systemctl reload prediction-api
sudo systemctl reload nginx

# 查看服务是否开机自启
sudo systemctl is-enabled prediction-api
sudo systemctl is-enabled nginx

# 设置开机自启
sudo systemctl enable prediction-api
sudo systemctl enable nginx
```

### 2. 进程监控
```bash
# 查看CPU和内存使用情况
top -p $(pgrep -f "gunicorn.*prediction")

# 查看详细进程信息
ps aux | grep -E "(gunicorn|prediction)"

# 查看进程树
pstree -p | grep -A5 -B5 gunicorn

# 监控系统资源
htop
```

### 3. 手动进程管理 (紧急情况)
```bash
# 强制杀死卡住的进程
sudo pkill -f "gunicorn.*prediction"
sudo pkill -f "python.*prediction_api.py"

# 重新启动
sudo systemctl start prediction-api
```

## 🔧 配置文件位置

### 1. 服务配置文件
```bash
# systemd服务文件
/etc/systemd/system/prediction-api.service

# 查看服务文件内容
sudo cat /etc/systemd/system/prediction-api.service

# 编辑服务文件
sudo nano /etc/systemd/system/prediction-api.service
```

### 2. Nginx配置
```bash
# 主配置文件
/etc/nginx/nginx.conf

# 站点配置文件
/etc/nginx/sites-available/prediction-api
/etc/nginx/sites-enabled/prediction-api

# 查看配置
sudo nginx -t  # 测试配置文件语法
sudo nginx -T  # 显示完整配置
```

### 3. 应用配置
```bash
# 预测API主文件 (通常在项目目录)
~/prediction-api/prediction_api.py

# Gunicorn配置文件 (如果有)
~/prediction-api/gunicorn.conf.py
```

## 📊 性能监控

### 1. 实时监控脚本
```bash
#!/bin/bash
# 保存为 monitor-prediction-api.sh

echo "=== 预测API服务监控 ==="
echo "时间: $(date)"
echo ""

echo "1. 服务状态:"
sudo systemctl is-active prediction-api nginx
echo ""

echo "2. 端口监听:"
sudo netstat -tlnp | grep -E ":8080|:8001"
echo ""

echo "3. 进程信息:"
ps aux | grep -E "(gunicorn|prediction)" | grep -v grep
echo ""

echo "4. 内存使用:"
free -h
echo ""

echo "5. 磁盘使用:"
df -h
echo ""

echo "6. 最近的错误日志:"
sudo journalctl -u prediction-api --since "5 minutes ago" | grep -E "(ERROR|Exception)" | tail -5
```

### 2. 使用监控脚本
```bash
# 给脚本执行权限
chmod +x monitor-prediction-api.sh

# 运行监控
./monitor-prediction-api.sh

# 定期监控 (每30秒)
watch -n 30 ./monitor-prediction-api.sh
```

## 🚨 故障排除

### 1. 服务无法启动
```bash
# 查看详细错误信息
sudo journalctl -u prediction-api -n 50

# 检查配置文件语法
sudo nginx -t

# 检查端口是否被占用
sudo lsof -i :8080
sudo lsof -i :8001

# 检查文件权限
ls -la /path/to/prediction-api/
```

### 2. 性能问题
```bash
# 查看资源使用情况
htop

# 查看磁盘IO
iotop

# 查看网络连接
ss -tulpn
```

### 3. 内存泄漏检查
```bash
# 监控内存使用变化
while true; do
  ps aux | grep gunicorn | awk '{print $6}' | paste -sd+ | bc
  sleep 60
done
```

## 📱 日志管理最佳实践

### 1. 日志轮转配置
```bash
# 创建日志轮转配置
sudo nano /etc/logrotate.d/prediction-api

# 内容示例:
/var/log/prediction-api/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        sudo systemctl reload prediction-api
    endscript
}
```

### 2. 日志级别调整
```bash
# 在Flask应用中设置日志级别
export LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR

# 重启服务应用新的日志级别
sudo systemctl restart prediction-api
```

## 🔔 监控告警

### 1. 简单的检查脚本
```bash
#!/bin/bash
# 保存为 check-api-health.sh

API_URL="http://localhost:8080/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $RESPONSE != "200" ]; then
    echo "警告: 预测API服务异常 (HTTP $RESPONSE)"
    # 可以在这里添加邮件或短信通知
    sudo systemctl restart prediction-api
else
    echo "预测API服务正常"
fi
```

### 2. 定时检查
```bash
# 添加到crontab (每5分钟检查一次)
crontab -e

# 添加以下行:
*/5 * * * * /path/to/check-api-health.sh >> /var/log/api-health-check.log 2>&1
```

---

## 🎯 快速操作命令

### 查看实时日志
```bash
sudo journalctl -u prediction-api -f
```

### 重启服务
```bash
sudo systemctl restart prediction-api nginx
```

### 检查服务状态
```bash
sudo systemctl status prediction-api nginx
```

### 查看最近的错误
```bash
sudo journalctl -u prediction-api --since "10 minutes ago" | grep -E "(ERROR|Exception|Traceback)"
```

这样你就可以全面监控和管理阿里云上的预测服务了！
