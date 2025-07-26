# 🚀 CAS认证系统上传和部署命令

## 📦 当前部署包信息
- **文件名**: `butp-deployment-20250725_105538.zip`
- **大小**: 65.84 MB
- **状态**: ✅ 已准备就绪

## 🔄 方法1：SCP上传（推荐）

```bash
# 上传部署包到服务器
scp butp-deployment-20250725_105538.zip bupt@butp.tech:/tmp/

# SSH到服务器进行部署
ssh bupt@butp.tech
```

然后在服务器上执行：

```bash
# 创建部署目录
sudo mkdir -p /var/www/butp
sudo chown bupt:bupt /var/www/butp

# 备份现有版本（如果存在）
if [ -d "/var/www/butp/current" ]; then
    sudo mv /var/www/butp/current /var/www/butp/backup_$(date +%Y%m%d_%H%M%S)
fi

# 解压新版本
cd /var/www/butp
unzip /tmp/butp-deployment-20250725_105538.zip
mkdir -p logs

# 安装生产依赖
npm install --production --no-optional

# 停止现有服务
pm2 stop butp-app || echo "没有运行中的进程"
pm2 delete butp-app || echo "没有已注册的进程"

# 启动新服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup

# 检查服务状态
pm2 status butp-app

# 健康检查
sleep 5
curl -f http://localhost:3000/health || echo "健康检查失败，请查看日志"
```

## 🔄 方法2：SFTP上传

```bash
# 使用SFTP上传
sftp bupt@butp.tech
put butp-deployment-20250725_105538.zip /tmp/
quit

# 然后SSH到服务器执行上述部署命令
ssh bupt@butp.tech
```

## 🔄 方法3：使用部署脚本（自动化）

如果已配置SSH密钥，可以使用自动化脚本：

```bash
# Windows用户请在Git Bash或WSL中运行
bash build-and-deploy.sh --local-only
```

## ⚠️ 重要检查事项

### 1. 环境变量配置

确保服务器上的 `.env.local` 文件包含正确的配置：

```bash
# 在服务器上检查并编辑环境变量
nano /var/www/butp/.env.local

# 必须正确配置：
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://butp.tech
CAS_MODE=real
SESSION_SECRET_KEY=your-secure-secret-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

### 2. 防火墙配置

```bash
# 确保端口3000可访问
sudo ufw allow 3000/tcp

# 或配置nginx反向代理（推荐）
sudo nano /etc/nginx/sites-available/butp.tech
```

### 3. SSL证书验证

```bash
# 检查SSL证书状态
curl -vI https://butp.tech/

# 确认HTTPS重定向
curl -I http://butp.tech/
```

## 🧪 部署后验证

### 自动化验证脚本

在服务器上运行：

```bash
# 创建验证脚本
cat > /tmp/verify-deployment.sh << 'EOF'
#!/bin/bash
echo "=== CAS认证系统部署验证 ==="
echo ""

# 1. 服务状态检查
echo "1. 检查PM2服务状态..."
pm2 status butp-app

# 2. 本地健康检查
echo "2. 本地健康检查..."
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo "✅ 本地健康检查通过"
    curl -s http://localhost:3000/health
else
    echo "❌ 本地健康检查失败"
fi

# 3. 外部访问检查
echo "3. 外部访问检查..."
if curl -f -s https://butp.tech/health > /dev/null; then
    echo "✅ 外部访问正常"
else
    echo "❌ 外部访问失败"
fi

# 4. CAS重定向检查
echo "4. CAS重定向检查..."
REDIRECT_URL=$(curl -s -I "https://butp.tech/dashboard" | grep -i location | cut -d' ' -f2 | tr -d '\r')
if [[ "$REDIRECT_URL" == *"auth.bupt.edu.cn"* ]]; then
    echo "✅ CAS重定向正常"
    echo "   重定向到: $REDIRECT_URL"
else
    echo "❌ CAS重定向异常: $REDIRECT_URL"
fi

# 5. 代理服务器检查
echo "5. 代理服务器检查..."
if curl -f -s http://10.3.58.3:8080/health > /dev/null; then
    echo "✅ 代理服务器正常"
else
    echo "❌ 代理服务器异常"
fi

echo ""
echo "=== 验证完成 ==="
EOF

chmod +x /tmp/verify-deployment.sh
/tmp/verify-deployment.sh
```

### 手动验证步骤

1. **服务状态检查**
   ```bash
   pm2 status butp-app
   pm2 logs butp-app --lines 20
   ```

2. **网站访问测试**
   ```bash
   curl https://butp.tech/health
   curl -I https://butp.tech/
   ```

3. **CAS认证测试**
   - 浏览器访问：`https://butp.tech/dashboard`
   - 应该重定向到北邮CAS登录页面
   - 登录后应该能正常进入系统

## 📊 管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs butp-app

# 重启服务
pm2 restart butp-app

# 监控服务
pm2 monit

# 查看错误日志
pm2 logs butp-app --err

# 查看输出日志
pm2 logs butp-app --out
```

## 🔧 故障排查

### 常见问题

1. **服务无法启动**
   ```bash
   pm2 logs butp-app --err
   npm ls next
   node -v
   ```

2. **端口被占用**
   ```bash
   sudo netstat -tlnp | grep :3000
   sudo lsof -i :3000
   ```

3. **权限问题**
   ```bash
   sudo chown -R bupt:bupt /var/www/butp
   chmod +x /var/www/butp/start-production.sh
   ```

4. **环境变量问题**
   ```bash
   cat /var/www/butp/.env.local
   env | grep NEXT_PUBLIC
   ```

## 🎯 成功标志

部署成功的标志：
- ✅ PM2显示 `butp-app` 状态为 `online`
- ✅ `curl https://butp.tech/health` 返回成功
- ✅ 访问 `https://butp.tech/dashboard` 重定向到CAS
- ✅ CAS登录后能正常进入系统

---

## 🚨 紧急联系

如果遇到严重问题，请提供：
1. PM2日志：`pm2 logs butp-app`
2. 系统状态：`pm2 status`
3. 网络测试：代理服务器连通性测试结果
4. 错误截图：浏览器控制台错误信息 