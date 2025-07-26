# 🚀 Ubuntu部署快速开始

## ⚡ 3分钟部署CAS代理服务器

### 前提条件

- ✅ Ubuntu/Debian系统
- ✅ 用户名为 `bupt`
- ✅ 无需root权限
- ✅ 有网络连接

### 一键部署

```bash
# 1. 确认用户身份
whoami  # 应该显示: bupt

# 2. 运行部署脚本
bash deploy-cas-proxy.sh
```

### 部署完成验证

```bash
# 3. 检查服务状态
./cas-proxy-ctl.sh status

# 4. 健康检查
./cas-proxy-ctl.sh health
```

## 🎯 部署后的配置

部署成功后，以下服务将自动配置：

- **服务地址**: `http://10.3.58.3:8080`
- **回调地址**: `http://10.3.58.3:8080/api/auth/cas/callback`
- **目标转发**: `https://butp.tech/api/auth/cas/verify`
- **进程管理**: PM2自动管理
- **日志记录**: 自动记录到 `~/cas-proxy/logs/`

## 🔧 常用管理命令

```bash
# 查看状态
./cas-proxy-ctl.sh status

# 重启服务
./cas-proxy-ctl.sh restart

# 查看日志
./cas-proxy-ctl.sh logs

# 健康检查
./cas-proxy-ctl.sh health
```

## 🎉 完成

现在您的CAS代理服务器已经运行在 `10.3.58.3:8080`，可以接收北邮CAS的回调并转发到您的 `butp.tech` 应用了！

### 下一步

在您的 `butp.tech` 应用中设置生产环境配置：

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://butp.tech
SESSION_SECRET_KEY=your-production-secret-key
```

## 📞 需要帮助？

查看完整文档：`DEPLOY_README_UBUNTU.md` 