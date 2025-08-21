# 华为云PDF服务部署指南

## 🚀 快速部署

### 1. 创建华为云服务器

**推荐配置：**
- **实例规格**：s6.large.2 (2核4GB) 或 s6.xlarge.2 (4核8GB)
- **操作系统**：Ubuntu 22.04 LTS
- **带宽**：5Mbps 或更高
- **存储**：40GB SSD
- **安全组**：开放 22, 80, 443, 8443 端口

### 2. 一键部署脚本

连接到服务器后，运行：

```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/your-repo/butp/main/cloud-pdf-service/deploy-huawei.sh

# 方案A: 使用域名部署 (推荐)
bash deploy-huawei.sh your-domain.com

# 方案B: 使用IP部署
bash deploy-huawei.sh
```

**部署过程：**
- ⏱️ 预计耗时：10-15分钟
- 📦 自动安装：Node.js, Chrome, 中文字体, Nginx
- 🔒 自动配置：SSL证书 (如果有域名)
- 🛡️ 自动设置：防火墙, 系统服务, 日志

### 3. 前端配置

部署完成后，更新前端环境变量：

```bash
# .env.local (开发环境)
NEXT_PUBLIC_CAMPUS_PDF_SERVICE_URL=https://your-domain.com/generate-pdf

# 或使用IP (如果没有域名)
NEXT_PUBLIC_CAMPUS_PDF_SERVICE_URL=http://123.456.789.012/generate-pdf
```

### 4. 验证部署

```bash
# 健康检查
curl https://your-domain.com/health

# 预期返回
{
  "status": "healthy",
  "service": "huawei-cloud-pdf-service",
  "platform": "huawei-cloud"
}
```

## 🎯 优势对比

| 方案 | 网络连通性 | 安全性 | 部署复杂度 | 运行成本 | 推荐度 |
|------|-----------|--------|-----------|----------|---------|
| 校内服务器 | ❌ 仅校内 | ⚠️ HTTP混合 | 🟢 简单 | 🟢 免费 | ⭐⭐ |
| API代理 | ❌ 503错误 | 🟢 HTTPS | 🟡 中等 | 🟢 免费 | ⭐⭐ |
| **华为云** | **🟢 公网** | **🟢 HTTPS** | **🟢 自动化** | **🟡 50-90元/月** | **⭐⭐⭐⭐⭐** |

## 📊 成本分析

**华为云成本 (北京区域)：**
- 服务器：35-60元/月 (2-4核)
- 带宽：20-40元/月 (5Mbps)
- 存储：免费 (40GB SSD)
- 域名：50元/年 (可选)
- SSL证书：免费 (Let's Encrypt)

**总计：55-100元/月**

## 🛠️ 管理命令

```bash
# 查看服务状态
sudo systemctl status pdf-service

# 查看实时日志
sudo journalctl -fu pdf-service

# 重启服务
sudo systemctl restart pdf-service

# 查看资源使用
htop
df -h
free -m
```

## 🔧 高级配置

### 性能优化
```bash
# 调整服务器参数
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 优化Nginx
sudo nano /etc/nginx/sites-available/pdf-service
# 添加：client_max_body_size 100M;
```

### 监控告警
```bash
# 安装监控工具
sudo apt install htop iotop nethogs

# 设置自动重启
sudo nano /etc/systemd/system/pdf-service.service
# 添加：Restart=always, RestartSec=10
```

## 📞 技术支持

- **文档**：[华为云ECS用户指南](https://support.huaweicloud.com/ecs/)
- **问题反馈**：创建GitHub Issue
- **性能监控**：华为云CloudEye
- **备份方案**：华为云CBR (建议开启)

## ✅ 部署检查清单

- [ ] 华为云服务器创建完成
- [ ] 安全组端口开放 (22, 80, 443, 8443)
- [ ] 域名解析配置 (如果使用域名)
- [ ] 运行部署脚本
- [ ] 服务健康检查通过
- [ ] 前端环境变量配置
- [ ] PDF生成功能测试
- [ ] 中文字体渲染测试
- [ ] 认证转发测试 (如果需要)
- [ ] 性能和稳定性测试

---

**🎉 完成部署后，您的PDF服务将具备：**
- ✅ 全球公网访问
- ✅ HTTPS安全传输
- ✅ 高性能渲染
- ✅ 中文字体支持
- ✅ 自动故障恢复
- ✅ 专业级稳定性
