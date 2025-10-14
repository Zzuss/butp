# 🚀 阿里云原生部署指南（无Docker）

由于Docker镜像拉取可能遇到网络问题，我们提供了一个更简单的原生部署方案，直接在服务器上安装Python环境。

## ✨ 原生部署优势

- ✅ **无需Docker**：避免镜像拉取问题
- ✅ **部署更快**：直接安装系统包
- ✅ **资源占用小**：没有容器开销
- ✅ **调试方便**：直接查看进程和日志
- ✅ **维护简单**：使用系统服务管理

## 🎯 快速部署

在你的阿里云服务器上执行：

```bash
# 1. 进入项目目录
cd /opt/prediction-service

# 2. 运行原生部署脚本
chmod +x deploy-native.sh
./deploy-native.sh
```

就这么简单！脚本会自动：
- 安装Python3和依赖包
- 创建虚拟环境
- 安装预测算法依赖
- 配置Nginx反向代理
- 创建系统服务
- 启动所有服务

## 📋 部署包内容

确保 `aliyun-deployment` 文件夹包含：

```
aliyun-deployment/
├── deploy-native.sh           # 🔥 原生部署脚本
├── nginx-native.conf          # Nginx配置文件
├── prediction_api.py          # API服务
├── api_requirements.txt       # Python依赖
├── function/                  # 预测算法
└── scripts/
    ├── service-control.sh     # 服务控制脚本
    └── test-api.sh           # API测试脚本
```

## 🔧 管理服务

### 服务控制
```bash
# 使用交互菜单
./scripts/service-control.sh

# 或直接使用命令
./scripts/service-control.sh start    # 启动服务
./scripts/service-control.sh stop     # 停止服务
./scripts/service-control.sh restart  # 重启服务
./scripts/service-control.sh status   # 查看状态
./scripts/service-control.sh logs     # 查看日志
```

### 系统命令
```bash
# 查看服务状态
sudo systemctl status prediction-api
sudo systemctl status nginx

# 查看日志
sudo journalctl -u prediction-api -f
sudo tail -f /var/log/nginx/prediction-api-error.log

# 重启服务
sudo systemctl restart prediction-api
sudo systemctl restart nginx
```

## 🧪 测试API

运行全面的API测试：

```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

测试内容包括：
- 网络连接和健康检查
- API接口功能
- 服务进程状态
- 端口监听状态
- 错误处理
- CORS配置

## 📁 文件位置

| 内容 | 位置 |
|------|------|
| 项目目录 | `/opt/prediction-service/` |
| Python虚拟环境 | `/opt/prediction-service/venv/` |
| API日志 | `/opt/prediction-service/logs/` |
| Nginx配置 | `/etc/nginx/sites-available/prediction-api` |
| Nginx日志 | `/var/log/nginx/prediction-api-*.log` |
| 系统服务 | `/etc/systemd/system/prediction-api.service` |

## 🎨 前端集成

在你的Next.js项目中：

### 环境变量配置
```javascript
// .env.local
NEXT_PUBLIC_PREDICTION_API_URL=http://your-server-ip
```

### 使用示例
```javascript
// 复制 frontend-integration-example.js 到你的项目
import { usePredictionAPI } from './prediction-api-client';

const { predictStudents, loading, error } = usePredictionAPI();

const handlePredict = async (file, major) => {
  const result = await predictStudents(file, major);
  console.log('预测结果:', result);
};
```

## 🔍 故障排除

### 常见问题

**1. 服务启动失败**
```bash
# 检查日志
sudo journalctl -u prediction-api -n 50

# 检查Python环境
/opt/prediction-service/venv/bin/python -c "import flask; print('Flask OK')"

# 检查端口占用
sudo ss -tuln | grep :8000
```

**2. Nginx配置错误**
```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx
```

**3. 权限问题**
```bash
# 修复目录权限
sudo chown -R prediction:prediction /opt/prediction-service
sudo chmod -R 755 /opt/prediction-service
```

**4. 模型加载失败**
```bash
# 检查模型文件
ls -la /opt/prediction-service/function/Model_Params/Task3_CatBoost_Model/

# 测试模型加载
cd /opt/prediction-service
source venv/bin/activate
python -c "from catboost import CatBoostClassifier; print('CatBoost OK')"
```

## 🔐 安全配置

### 防火墙设置
```bash
# UFW防火墙
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### 用户权限
- API服务运行在 `prediction` 用户下
- 使用最小权限原则
- 日志目录有适当的权限限制

## 📊 性能优化

### Python配置
```bash
# 调整Gunicorn worker数量
sudo systemctl edit prediction-api

# 添加以下内容到 [Service] 部分：
[Service]
ExecStart=
ExecStart=/opt/prediction-service/venv/bin/gunicorn --bind 127.0.0.1:8000 --workers 4 --threads 2 prediction_api:app
```

### Nginx优化
```bash
# 编辑 /etc/nginx/sites-available/prediction-api
# 调整缓冲区大小和超时时间
```

## 🔄 更新部署

```bash
# 停止服务
sudo systemctl stop prediction-api

# 更新代码
cd /opt/prediction-service
# 上传新文件...

# 更新依赖（如果需要）
source venv/bin/activate
pip install -r api_requirements.txt

# 重启服务
sudo systemctl start prediction-api
```

## 🎉 部署完成验证

部署成功后，你应该能够：

1. ✅ 访问健康检查：`http://your-server-ip/health`
2. ✅ 获取专业列表：`http://your-server-ip/api/majors`
3. ✅ 上传Excel文件进行预测
4. ✅ 在前端调用API获得预测结果

---

## 🆚 Docker vs 原生部署对比

| 特性 | Docker部署 | 原生部署 |
|------|------------|----------|
| 部署复杂度 | 中等 | 简单 |
| 网络问题 | 可能有 | 基本没有 |
| 资源占用 | 稍高 | 较低 |
| 隔离性 | 更好 | 一般 |
| 调试难度 | 稍难 | 简单 |
| 维护成本 | 中等 | 较低 |

**推荐使用原生部署** 🎯

原生部署更适合你的场景，避免了Docker的复杂性和网络问题，让预测算法快速稳定地运行在阿里云上！
