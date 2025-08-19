# 校内PDF服务部署指南

## 📋 部署概述

这是一个完整的校内PDF生成服务，用于为BuTP系统提供高质量的PDF导出功能。

### 网络架构
```
用户浏览器 ← VPN/校园网 → 10.3.58.3:8000 → 访问butp.tech → 生成PDF
```

## 🚀 快速部署（在10.3.58.3服务器上）

### 1. 环境准备
```bash
# 确保安装了Docker和Docker Compose
sudo yum install -y docker docker-compose
# 或者
sudo apt-get install -y docker.io docker-compose

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 上传代码
```bash
# 将整个campus-pdf-service文件夹上传到服务器
scp -r campus-pdf-service/ user@10.3.58.3:/opt/
```

### 3. 部署服务
```bash
# 登录服务器
ssh user@10.3.58.3

# 进入项目目录
cd /opt/campus-pdf-service

# 运行部署脚本
bash deploy.sh
```

### 4. 测试服务
```bash
# 运行测试脚本
bash test-service.sh
```

## 🔧 手动部署步骤

如果自动部署脚本有问题，可以手动执行：

### 1. 构建和启动
```bash
cd /opt/campus-pdf-service

# 设置环境变量
export PDF_SERVICE_KEY="campus-pdf-2024-$(date +%s)"

# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

### 2. 验证服务
```bash
# 健康检查
curl http://localhost:8000/health

# 测试PDF生成
curl -X POST http://localhost:8000/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-pdf-key: your-api-key-here" \
  -d '{"html":"<h1>Test PDF</h1>"}' \
  -o test.pdf
```

## 📊 服务管理

### 查看日志
```bash
docker-compose logs -f
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
docker-compose down
```

### 更新服务
```bash
git pull
docker-compose build
docker-compose up -d
```

## 🔒 安全配置

### 防火墙设置
```bash
# 只允许校园网访问
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.3.0.0/16" port protocol="tcp" port="8000" accept'
sudo firewall-cmd --reload
```

### API密钥管理
- API密钥存储在环境变量中
- 定期更换API密钥
- 在前端代码中配置相同的密钥

## 🚨 故障排除

### 常见问题

1. **Docker权限问题**
```bash
sudo usermod -aG docker $USER
# 重新登录
```

2. **端口占用**
```bash
sudo netstat -tlnp | grep :8000
sudo kill -9 <PID>
```

3. **内存不足**
```bash
# 检查内存使用
free -h
# 增加swap空间或升级服务器
```

4. **无法访问butp.tech**
```bash
# 测试网络连通性
curl -I https://butp.tech
```

## 📈 性能监控

### 资源使用监控
```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop
```

### 日志分析
```bash
# 查看错误日志
docker-compose logs | grep ERROR

# 查看访问日志
docker-compose logs | grep "PDF生成请求"
```

## 🔄 自动化运维

### 定时重启（可选）
```bash
# 添加到crontab
echo "0 3 * * * cd /opt/campus-pdf-service && docker-compose restart" | crontab -
```

### 日志轮转
```bash
# 配置Docker日志轮转
echo '{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}' | sudo tee /etc/docker/daemon.json

sudo systemctl restart docker
```

## 📞 联系方式

如有问题，请联系系统管理员。

---

**重要提醒**：
- 确保服务器能访问外网的butp.tech
- 定期备份配置文件和日志
- 监控服务运行状态
- 及时更新安全补丁
