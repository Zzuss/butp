# 阿里云服务器预测算法部署方案

## 部署架构

```
Internet → 阿里云ECS → Nginx → Python Flask/FastAPI → 预测算法
```

## 服务器配置建议

### 推荐配置
- **实例类型**：计算型c6.xlarge 或更高
- **CPU**：4核 或以上
- **内存**：8GB 或以上
- **存储**：40GB SSD 或以上
- **操作系统**：Ubuntu 20.04 LTS 或 CentOS 7.9

### 安全组设置
- 开放端口：22（SSH）、80（HTTP）、443（HTTPS）
- 可选：开放自定义API端口（如8000）

## 部署步骤

### 1. 服务器基础环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础依赖
sudo apt install -y python3 python3-pip python3-venv nginx git curl

# 安装Docker（可选，用于容器化部署）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Python环境配置

```bash
# 创建项目目录
sudo mkdir -p /opt/prediction-service
sudo chown $USER:$USER /opt/prediction-service
cd /opt/prediction-service

# 创建虚拟环境
python3 -m venv prediction_env
source prediction_env/bin/activate

# 上传并安装依赖
pip install -r requirements.txt
```

### 3. 项目文件部署

需要上传的文件：
- `function/` 整个文件夹（包含算法和模型）
- `requirements.txt` 依赖文件
- API包装器文件（下面会创建）

### 4. API服务配置

我们将创建一个Flask API来包装你的预测算法，使其可以通过HTTP调用。

### 5. Nginx反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP

    client_max_body_size 50M;  # 允许上传大文件

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /static/ {
        alias /opt/prediction-service/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6. 系统服务配置

创建systemd服务文件以确保API服务开机自启：

```ini
[Unit]
Description=Prediction API Service
After=network.target

[Service]
Type=simple
User=ubuntu  # 替换为你的用户名
WorkingDirectory=/opt/prediction-service
Environment=PATH=/opt/prediction-service/prediction_env/bin
ExecStart=/opt/prediction-service/prediction_env/bin/python app.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

## 优化建议

### 性能优化
1. **使用Gunicorn**：提高并发处理能力
2. **模型缓存**：将模型加载到内存中避免重复加载
3. **异步处理**：使用Celery处理耗时任务
4. **文件缓存**：缓存处理结果避免重复计算

### 安全配置
1. **SSL证书**：使用Let's Encrypt免费SSL
2. **防火墙**：配置ufw防火墙规则
3. **API认证**：添加API密钥验证
4. **文件权限**：正确设置文件访问权限

### 监控与日志
1. **应用监控**：使用PM2或Supervisor
2. **日志管理**：配置logrotate
3. **性能监控**：安装htop、iotop等工具

## 与前端的集成

在你的Next.js前端中，将原来调用本地函数的部分改为调用API：

```javascript
// 原来的本地调用
// const result = await localPredictionFunction(data)

// 改为API调用
const response = await fetch('https://your-api-domain.com/api/predict', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-api-key'
    },
    body: JSON.stringify(data)
});

const result = await response.json();
```

## 部署检查清单

- [ ] 服务器配置完成
- [ ] Python环境和依赖安装
- [ ] 预测算法文件上传
- [ ] API服务创建并测试
- [ ] Nginx配置并重启
- [ ] 系统服务注册并启动
- [ ] 安全组和防火墙配置
- [ ] SSL证书配置（可选）
- [ ] 前端API调用修改
- [ ] 端到端测试完成

## 故障排除

### 常见问题
1. **模型加载失败**：检查文件路径和权限
2. **内存不足**：升级服务器配置或优化模型
3. **API超时**：增加Nginx和应用的超时配置
4. **依赖安装失败**：使用conda或清华镜像源

### 日志位置
- API服务日志：`/opt/prediction-service/logs/`
- Nginx日志：`/var/log/nginx/`
- 系统服务日志：`journalctl -u prediction-api`

## 成本估算

基于推荐配置，阿里云ECS月成本约：
- 计算型c6.xlarge：约300-500元/月
- 包年价格会更优惠
- 流量费用另计

## 备份策略

1. **数据备份**：定期备份模型文件和配置
2. **快照备份**：创建ECS磁盘快照
3. **代码备份**：使用Git版本控制

---

此方案确保你的预测算法能够稳定运行在阿里云服务器上，同时保持与现有Next.js前端的兼容性。
