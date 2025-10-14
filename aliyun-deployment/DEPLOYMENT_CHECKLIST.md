# 阿里云部署清单

## 📦 部署包内容

此文件夹包含了所有需要上传到阿里云服务器的文件：

```
aliyun-deployment/
├── prediction_api.py              # ✅ Flask API服务主文件
├── api_requirements.txt           # ✅ Python依赖包列表
├── Dockerfile                     # ✅ Docker镜像配置
├── docker-compose.yml             # ✅ 容器编排配置
├── deploy.sh                      # ✅ 一键部署脚本
├── README.md                      # ✅ 详细部署文档
├── frontend-integration-example.js # ✅ 前端集成示例代码
├── nginx/                         # ✅ Nginx反向代理配置
│   ├── nginx.conf
│   └── conf.d/prediction-api.conf
├── scripts/                       # ✅ 运维管理脚本
│   ├── check-environment.sh       # 环境检查
│   ├── install-dependencies.sh    # 依赖安装
│   ├── backup.sh                  # 数据备份
│   └── monitor.sh                 # 服务监控
└── function/                      # ✅ 预测算法核心
    ├── Optimization_model_func3_1.py
    ├── run_prediction_direct.py
    ├── Model_Params/              # 模型文件
    └── education-plan*/           # 教育计划数据
```

## 🚀 快速部署步骤

### 1. 准备阿里云服务器
- 购买ECS实例：4核8GB，Ubuntu 20.04
- 配置安全组：开放22、80、443端口
- 获取公网IP地址

### 2. 上传部署包
**方法A：使用SCP命令（推荐）**
```bash
# 将整个文件夹上传到服务器
scp -r aliyun-deployment/ root@your-server-ip:/opt/prediction-service/
```

**方法B：使用FTP工具**
- 使用FileZilla、WinSCP等工具
- 连接服务器并上传整个aliyun-deployment文件夹到 `/opt/prediction-service/`

**方法C：压缩后上传**
```bash
# 在Windows上压缩
tar -czf aliyun-deployment.tar.gz aliyun-deployment/

# 上传压缩包
scp aliyun-deployment.tar.gz root@your-server-ip:/opt/

# 在服务器上解压
ssh root@your-server-ip
cd /opt
tar -xzf aliyun-deployment.tar.gz
mv aliyun-deployment prediction-service
```

### 3. 在服务器上执行部署
```bash
# 连接到服务器
ssh root@your-server-ip

# 进入项目目录
cd /opt/prediction-service

# 设置执行权限
chmod +x deploy.sh scripts/*.sh

# 检查环境（可选）
./scripts/check-environment.sh

# 安装依赖（如果需要）
./scripts/install-dependencies.sh

# 一键部署
./deploy.sh

# 验证部署
curl http://localhost/health
```

### 4. 修改前端配置
在你的Next.js项目中：

1. **配置API地址**
   ```javascript
   // .env.local
   NEXT_PUBLIC_PREDICTION_API_URL=http://your-server-ip
   ```

2. **集成API客户端**
   - 复制 `frontend-integration-example.js` 到你的前端项目
   - 替换原有的预测算法调用

## ✅ 验证清单

部署完成后，确认以下项目：

- [ ] 服务器可以正常访问：`http://your-server-ip/health`
- [ ] API接口正常：`http://your-server-ip/api/majors`
- [ ] 容器运行正常：`docker-compose ps`
- [ ] 前端可以调用API并获得预测结果
- [ ] 日志正常记录：`docker-compose logs -f`

## 🔧 故障排除

如果遇到问题，按以下顺序检查：

1. **检查Docker服务**
   ```bash
   sudo systemctl status docker
   ```

2. **查看容器日志**
   ```bash
   docker-compose logs prediction-api
   docker-compose logs nginx
   ```

3. **检查端口占用**
   ```bash
   sudo ss -tuln | grep :80
   ```

4. **验证模型文件**
   ```bash
   ls -la function/Model_Params/Task3_CatBoost_Model/
   ```

## 📞 技术支持

- 详细文档：查看 `README.md`
- 监控工具：`./scripts/monitor.sh`
- 备份工具：`./scripts/backup.sh`
- 环境检查：`./scripts/check-environment.sh`

---

**重要提醒：**
- 替换所有 `your-server-ip` 为实际的服务器IP地址
- 确保阿里云安全组已正确配置
- 建议先在测试环境验证后再部署到生产环境
