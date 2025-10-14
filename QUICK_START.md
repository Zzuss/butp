# 🎯 快速部署指令

## ✨ 智能部署特性
- 🔍 **智能检查**：自动检测已有依赖，避免重复安装  
- ⚡ **快速部署**：只安装缺失组件，大幅提升部署速度
- 🔄 **增量更新**：支持重复执行，不会破坏现有配置
- 📋 **详细日志**：清楚显示每个步骤的执行状态

## 现在你需要做的：

### 📤 第一步：上传到服务器

```bash
# 方法1：压缩后上传（推荐）
tar -czf aliyun-deployment.tar.gz aliyun-deployment/
scp aliyun-deployment.tar.gz root@your-server-ip:/opt/

# 方法2：直接上传文件夹
scp -r aliyun-deployment root@your-server-ip:/opt/prediction-service
```

### 🔍 第二步：检查部署环境（可选但推荐）

```bash
# 连接到服务器
ssh root@your-server-ip

# 如果上传的是压缩包，先解压
cd /opt
tar -xzf aliyun-deployment.tar.gz
mv aliyun-deployment prediction-service

# 进入项目目录
cd /opt/prediction-service

# 检查环境状态
chmod +x scripts/check-dependencies.sh
./scripts/check-dependencies.sh
```

### 🚀 第三步：智能部署

```bash
# 🔥 运行智能原生部署（推荐）
chmod +x deploy-native.sh
./deploy-native.sh

# 脚本会智能检查并：
# ✅ 只安装缺失的系统包
# ✅ 重用已有的Python环境  
# ✅ 跳过已配置的服务
# ✅ 更新需要更新的配置
```

### ✅ 第三步：验证部署

```bash
# 测试API
./scripts/test-api.sh

# 手动验证
curl http://localhost/health
curl http://localhost/api/majors
```

### 🎨 第四步：配置前端

在你的Next.js项目中：

```javascript
// .env.local
NEXT_PUBLIC_PREDICTION_API_URL=http://your-server-ip
```

---

## 🎉 就这么简单！

**原生部署**比Docker更稳定，避免了网络问题，让你的预测算法快速运行在阿里云上！

部署成功后，你的API地址将是：
- 健康检查：`http://your-server-ip/health`
- 预测接口：`http://your-server-ip/api/predict`

## 🔧 如果遇到问题

查看详细文档：
- `NATIVE_DEPLOYMENT_GUIDE.md` - 原生部署详细指南
- `README.md` - 完整技术文档
- `DEPLOYMENT_CHECKLIST.md` - 部署检查清单

或运行故障排除：
```bash
./scripts/service-control.sh status
./scripts/test-api.sh
```

**记得把 `your-server-ip` 替换为你的实际服务器IP地址！**
