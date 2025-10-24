# 🔧 阿里云预测服务日志管理与进程控制指南

## 📊 服务架构概览

```
用户请求 → Nginx(端口80) → Gunicorn(端口8000) → Flask API → 预测算法
```

## 📁 日志位置详解

### 1. **API服务日志**
```bash
# 主要日志目录
/opt/prediction-service/logs/

# 具体日志文件
/opt/prediction-service/logs/access.log    # API访问日志
/opt/prediction-service/logs/error.log     # API错误日志
```

### 2. **系统服务日志（systemd）**
```bash
# 实时查看服务日志
sudo journalctl -u prediction-api -f

# 查看最近100条日志
sudo journalctl -u prediction-api -n 100

# 查看指定时间范围的日志
sudo journalctl -u prediction-api --since "2024-01-01" --until "2024-01-02"
```

### 3. **Nginx日志**
```bash
# Nginx访问日志
/var/log/nginx/access.log

# Nginx错误日志  
/var/log/nginx/error.log

# 预测API专用Nginx日志
/var/log/nginx/prediction-api-access.log
/var/log/nginx/prediction-api-error.log
```

## 🎮 进程管理命令

### 使用service-control.sh脚本（推荐）
```bash
# 进入脚本目录
cd /opt/prediction-service/scripts

# 交互式菜单
sudo bash service-control.sh

# 或直接使用命令
sudo bash service-control.sh start      # 启动服务
sudo bash service-control.sh stop       # 停止服务  
sudo bash service-control.sh restart    # 重启服务
sudo bash service-control.sh status     # 查看状态
sudo bash service-control.sh logs       # 查看日志
```

### 使用systemctl命令
```bash
# 查看服务状态
sudo systemctl status prediction-api
sudo systemctl status nginx

# 启动服务
sudo systemctl start prediction-api
sudo systemctl start nginx

# 停止服务
sudo systemctl stop prediction-api
sudo systemctl stop nginx

# 重启服务
sudo systemctl restart prediction-api
sudo systemctl restart nginx

# 设置开机自启
sudo systemctl enable prediction-api
sudo systemctl enable nginx

# 取消开机自启
sudo systemctl disable prediction-api
```

## 📋 常用日志查看命令

### 1. **实时监控日志**
```bash
# 实时查看API服务日志
sudo journalctl -u prediction-api -f

# 实时查看API错误日志
sudo tail -f /opt/prediction-service/logs/error.log

# 实时查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 同时查看多个日志文件
sudo tail -f /opt/prediction-service/logs/error.log /var/log/nginx/error.log
```

### 2. **过滤和搜索日志**
```bash
# 搜索包含"ERROR"的日志
sudo journalctl -u prediction-api | grep -i error

# 搜索特定时间的日志
sudo journalctl -u prediction-api --since "1 hour ago"

# 搜索包含特定关键词的日志
sudo grep -i "prediction" /opt/prediction-service/logs/error.log

# 查看JSON解析相关的错误
sudo grep -i "json\|nan\|parse" /opt/prediction-service/logs/error.log
```

### 3. **日志统计和分析**
```bash
# 统计错误日志条数
sudo grep -c "ERROR" /opt/prediction-service/logs/error.log

# 查看最近的预测请求
sudo grep "batch_predict\|预测" /opt/prediction-service/logs/access.log | tail -10

# 分析API响应状态
sudo awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

## 🔍 故障诊断步骤

### 1. **快速健康检查**
```bash
# 使用service-control.sh快速检查
cd /opt/prediction-service/scripts
sudo bash service-control.sh status
```

### 2. **服务状态诊断**
```bash
# 检查服务是否运行
sudo systemctl is-active prediction-api
sudo systemctl is-active nginx

# 检查端口监听
sudo ss -tuln | grep -E ":80|:8000"

# 检查进程
ps aux | grep -E "gunicorn|nginx" | grep -v grep
```

### 3. **API接口测试**
```bash
# 健康检查
curl -s http://localhost/health | jq .

# 专业列表接口
curl -s http://localhost/api/majors | jq .

# 检查API响应时间
time curl -s http://localhost/health
```

## 🚨 常见问题和解决方案

### 问题1: 服务启动失败
```bash
# 查看详细错误信息
sudo systemctl status prediction-api -l

# 查看启动日志
sudo journalctl -u prediction-api -n 50

# 检查配置文件
sudo nginx -t
```

### 问题2: JSON解析错误（如你遇到的NaN问题）
```bash
# 查看相关错误日志
sudo grep -i "json\|nan\|parse" /opt/prediction-service/logs/error.log

# 查看Python相关错误
sudo journalctl -u prediction-api | grep -i "python\|traceback"
```

### 问题3: 内存或性能问题
```bash
# 查看系统资源使用情况
top -p $(pgrep -f "gunicorn.*prediction_api")

# 查看内存使用
ps aux --sort=-%mem | head -10

# 查看磁盘使用
df -h
du -sh /opt/prediction-service/logs/
```

## 📈 日志轮转配置

### 设置日志轮转（防止日志文件过大）
```bash
# 创建日志轮转配置
sudo tee /etc/logrotate.d/prediction-api > /dev/null << EOF
/opt/prediction-service/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 prediction prediction
    postrotate
        sudo systemctl reload prediction-api
    endscript
}
EOF
```

## 🔧 性能监控

### 1. **监控脚本**
```bash
# 使用已有的监控脚本
cd /opt/prediction-service/scripts
sudo bash monitor.sh
```

### 2. **自定义监控命令**
```bash
# 查看API响应时间
while true; do
    echo "$(date): $(time curl -s http://localhost/health >/dev/null)"
    sleep 60
done

# 监控进程资源使用
watch -n 5 'ps aux | grep -E "gunicorn|nginx" | grep -v grep'
```

## 📞 紧急操作

### 服务无响应时的紧急重启
```bash
# 强制停止并重启
sudo pkill -f "gunicorn.*prediction_api"
sudo systemctl restart prediction-api nginx

# 清理临时文件
sudo rm -rf /opt/prediction-service/temp_predictions/*
sudo rm -rf /opt/prediction-service/temp_pdf/*
```

### 日志文件过大时的清理
```bash
# 清理旧日志（谨慎操作！）
sudo truncate -s 0 /opt/prediction-service/logs/error.log
sudo truncate -s 0 /opt/prediction-service/logs/access.log

# 或者备份后清理
sudo cp /opt/prediction-service/logs/error.log /tmp/error.log.backup
sudo > /opt/prediction-service/logs/error.log
```

## 📱 快捷命令别名

在你的 `~/.bashrc` 中添加以下别名：
```bash
# 预测服务管理别名
alias pred-status='sudo systemctl status prediction-api'
alias pred-logs='sudo journalctl -u prediction-api -f'
alias pred-restart='sudo systemctl restart prediction-api nginx'
alias pred-control='cd /opt/prediction-service/scripts && sudo bash service-control.sh'
alias nginx-logs='sudo tail -f /var/log/nginx/error.log'
```

重新加载配置：
```bash
source ~/.bashrc
```

## 🎯 最佳实践

1. **定期检查**: 每天检查一次服务状态
2. **日志清理**: 设置日志轮转，避免磁盘满
3. **性能监控**: 监控API响应时间和资源使用
4. **备份重要日志**: 定期备份错误日志用于分析
5. **更新维护**: 定期更新依赖包和安全补丁

---

**🔥 现在你可以完全掌控阿里云预测服务了！**


