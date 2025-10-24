# 🚀 阿里云服务器上传指南

## 📦 部署包说明

`aliyun-deployment` 文件夹包含了所有需要部署到阿里云服务器的文件，这是一个完整的、可直接使用的部署包。

## 📂 部署包内容概览

```
aliyun-deployment/
├── 🔧 核心服务文件
│   ├── prediction_api.py              # Flask API服务
│   ├── api_requirements.txt           # Python依赖
│   ├── Dockerfile                     # Docker配置
│   └── docker-compose.yml             # 容器编排
│
├── 📜 部署脚本
│   ├── deploy.sh                      # 一键部署脚本
│   └── scripts/                       # 运维工具
│       ├── check-environment.sh       # 环境检查
│       ├── install-dependencies.sh    # 依赖安装  
│       ├── backup.sh                  # 数据备份
│       └── monitor.sh                 # 服务监控
│
├── 🌐 服务配置
│   └── nginx/                         # Nginx反向代理
│       ├── nginx.conf
│       └── conf.d/prediction-api.conf
│
├── 🤖 预测算法
│   └── function/                      # 完整的预测算法目录
│       ├── Optimization_model_func3_1.py
│       ├── Model_Params/              # 模型文件
│       └── education-plan*/           # 教育计划数据
│
└── 📚 文档和示例
    ├── README.md                      # 详细部署文档
    ├── DEPLOYMENT_CHECKLIST.md       # 部署检查清单
    └── frontend-integration-example.js # 前端集成示例
```

## 🔄 上传方式选择

### 方式一：SCP命令上传（推荐）

**步骤 1：压缩文件夹（可选，加快上传速度）**
```bash
# 在项目根目录执行
tar -czf aliyun-deployment.tar.gz aliyun-deployment/
```

**步骤 2：上传到服务器**
```bash
# 上传压缩包（推荐）
scp aliyun-deployment.tar.gz root@your-server-ip:/opt/

# 或直接上传文件夹
scp -r aliyun-deployment root@your-server-ip:/opt/prediction-service
```

**步骤 3：在服务器上解压**
```bash
ssh root@your-server-ip
cd /opt
tar -xzf aliyun-deployment.tar.gz
mv aliyun-deployment prediction-service
```

### 方式二：FTP工具上传

**推荐工具：**
- **FileZilla**（免费，跨平台）
- **WinSCP**（Windows专用）
- **Cyberduck**（Mac/Windows）

**上传步骤：**
1. 打开FTP工具，连接到你的阿里云服务器
2. 远程目录设置为：`/opt/`
3. 将整个 `aliyun-deployment` 文件夹拖拽上传
4. 上传完成后，在服务器上重命名为 `prediction-service`

### 方式三：Git仓库上传

**步骤 1：创建Git仓库**
```bash
cd aliyun-deployment
git init
git add .
git commit -m "Initial deployment package"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

**步骤 2：在服务器上克隆**
```bash
ssh root@your-server-ip
cd /opt
git clone https://github.com/your-username/your-repo.git prediction-service
```

## ⚡ 快速部署命令

上传完成后，在服务器上执行：

```bash
# 连接到服务器
ssh root@your-server-ip

# 进入项目目录
cd /opt/prediction-service

# 设置脚本权限
chmod +x deploy.sh scripts/*.sh

# 检查环境（推荐）
./scripts/check-environment.sh

# 安装依赖（如果需要）
./scripts/install-dependencies.sh

# 一键部署
./deploy.sh

# 验证部署
curl http://localhost/health
```

## ✅ 验证清单

部署成功后，你应该能够：

- [ ] 访问健康检查：`http://your-server-ip/health`
- [ ] 获取专业列表：`http://your-server-ip/api/majors`
- [ ] 查看容器状态：`docker-compose ps`（所有容器应为 "Up" 状态）
- [ ] 上传Excel文件进行预测测试

## 🔧 常见问题解决

### 上传失败
- 检查服务器SSH连接
- 确认服务器磁盘空间充足
- 检查文件权限

### 部署失败  
- 运行 `./scripts/check-environment.sh` 检查环境
- 查看日志：`docker-compose logs`
- 检查端口占用：`sudo ss -tuln | grep :80`

### 预测API错误
- 确认模型文件完整：`ls -la function/Model_Params/Task3_CatBoost_Model/`
- 查看API日志：`docker-compose logs prediction-api`
- 测试文件上传权限

## 📞 技术支持

如果遇到问题：

1. **查看详细文档**：`README.md`
2. **运行环境检查**：`./scripts/check-environment.sh`
3. **查看服务监控**：`./scripts/monitor.sh`
4. **检查日志文件**：`docker-compose logs -f`

## 🎯 下一步

部署完成后：

1. **配置域名**（可选）：将域名解析到服务器IP
2. **配置SSL证书**（推荐）：启用HTTPS
3. **修改前端配置**：更新API地址
4. **测试完整流程**：上传Excel文件验证预测功能

---

**重要提醒：**
- 请将 `your-server-ip` 替换为实际的阿里云服务器IP地址
- 确保阿里云安全组已开放必要端口（22、80、443）
- 建议在测试环境先验证，确认无误后再用于生产

🎉 **预测算法即将在阿里云上稳定运行！**
