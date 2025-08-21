# 华为云PDF服务部署指南

## 🎯 概述

将PDF生成服务部署到华为云服务器，解决网络连通性和HTTPS混合内容问题。

## 🔧 架构优势

```
浏览器 → HTTPS://你的华为云域名/generate-pdf → PDF服务
```

**优势**：
- ✅ 公网访问，无网络限制
- ✅ HTTPS支持，无混合内容问题
- ✅ 高性能，独立资源
- ✅ 易于扩展和维护

## 📋 部署要求

### 华为云服务器配置
- **推荐规格**：2核4GB（s6.large.2）
- **操作系统**：Ubuntu 20.04 LTS
- **带宽**：5Mbps（可按需调整）
- **存储**：40GB系统盘

### 域名和SSL
- 绑定域名（如：`pdf.butp.tech`）
- 申请SSL证书（华为云提供免费证书）

## 🚀 快速部署

### 1. 服务器初始化
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以生效Docker权限
newgrp docker
```

### 2. 部署PDF服务
```bash
# 创建项目目录
mkdir -p ~/huawei-pdf-service
cd ~/huawei-pdf-service

# 下载部署文件（见下面的文件说明）
# 或直接克隆项目：git clone 你的仓库地址

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
docker-compose logs -f
```

### 3. 配置域名和SSL
```bash
# 在华为云控制台：
# 1. 域名解析：pdf.butp.tech → 你的服务器IP
# 2. 申请SSL证书
# 3. 下载证书文件到 ssl/ 目录

# 重启Nginx以加载SSL证书
docker-compose restart nginx
```

### 4. 测试服务
```bash
# 健康检查
curl https://pdf.butp.tech/health

# PDF生成测试
curl -X POST https://pdf.butp.tech/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-pdf-key: your-api-key" \
  -d '{"html":"<h1>测试PDF</h1>"}' \
  --output test.pdf
```

## 🔐 安全配置

### API密钥
- 使用强密钥：`huawei-pdf-2024-$(date +%s)`
- 定期轮换密钥
- 限制访问来源

### 防火墙
```bash
# 只开放必要端口
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP（重定向到HTTPS）
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

## 📊 监控和维护

### 日志查看
```bash
# 应用日志
docker-compose logs pdf-service

# Nginx日志
docker-compose logs nginx

# 系统资源
docker stats
```

### 备份策略
```bash
# 定期备份配置
tar -czf pdf-service-backup-$(date +%Y%m%d).tar.gz \
  docker-compose.yml ssl/ nginx/

# 定期清理日志
docker-compose exec pdf-service pm2 flush
```

## 🔄 更新和扩展

### 服务更新
```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d
```

### 性能优化
- 根据使用量调整服务器规格
- 配置CDN加速（华为云CDN）
- 启用Gzip压缩
- 配置缓存策略

## 💰 成本估算

**华为云ECS**（按需计费）：
- 2核4GB服务器：~200元/月
- 5Mbps带宽：~30元/月
- 40GB云硬盘：~15元/月
- **总计**：~245元/月

**包年优惠**：可享受3-5折优惠

## 🆘 故障排除

### 常见问题
1. **服务无法启动**：检查端口占用，查看日志
2. **SSL证书问题**：确认证书路径和权限
3. **PDF生成失败**：检查内存使用，Chrome依赖
4. **网络连接问题**：检查安全组和防火墙设置

### 技术支持
- 华为云技术支持：提供7x24小时服务
- 社区文档：丰富的部署案例
