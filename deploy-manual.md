# 🚀 CAS认证系统手动部署指南

## ✅ 构建完成状态

✅ **构建成功！** Next.js应用已成功构建，所有TypeScript错误已修复。

## 📦 当前构建信息

- **构建状态**: 成功
- **页面总数**: 24个路由
- **中间件大小**: 37.4 kB
- **主要页面**:
  - 登录页 (`/login`): 129 kB
  - 仪表板 (`/dashboard`): 7.73 kB  
  - 成绩页 (`/grades`): 4.53 kB
  - 图表页 (`/charts`): 44 kB

## 🔧 部署选项

### 选项1：自动化部署（推荐）

```bash
# 完整构建和部署
bash build-and-deploy.sh

# 只构建不部署（生成部署包）
bash build-and-deploy.sh --local-only

# 保留部署包
bash build-and-deploy.sh --keep-package
```

### 选项2：手动部署步骤

#### 第1步：准备部署包
```bash
# 创建部署目录
mkdir -p deploy-package

# 复制构建文件
cp -r .next deploy-package/
cp -r public deploy-package/
cp -r app deploy-package/
cp -r components deploy-package/
cp -r contexts deploy-package/
cp -r lib deploy-package/
cp package*.json deploy-package/
cp next.config.ts deploy-package/
cp middleware.ts deploy-package/
cp .env.local deploy-package/

# 创建生产启动脚本
cat > deploy-package/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'butp-app',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
```

#### 第2步：打包上传
```bash
# 压缩部署包
tar -czf butp-deployment-$(date +%Y%m%d_%H%M%S).tar.gz -C deploy-package .

# 上传到服务器
scp butp-deployment-*.tar.gz bupt@butp.tech:/tmp/
```

#### 第3步：服务器端部署
```bash
# SSH到服务器
ssh bupt@butp.tech

# 创建部署目录
sudo mkdir -p /var/www/butp
sudo chown bupt:bupt /var/www/butp

# 备份现有版本
if [ -d "/var/www/butp/current" ]; then
    sudo mv /var/www/butp/current /var/www/butp/backup_$(date +%Y%m%d_%H%M%S)
fi

# 解压新版本
cd /var/www/butp
tar -xzf /tmp/butp-deployment-*.tar.gz
mkdir -p logs

# 安装生产依赖
npm install --production --no-optional

# 停止现有服务
pm2 stop butp-app || echo "没有运行中的进程"
pm2 delete butp-app || echo "没有已注册的进程"

# 启动新服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 检查服务状态
pm2 status butp-app
```

## ⚠️ 重要配置检查

### 1. 环境变量配置

确保 `.env.local` 文件包含正确的配置：

```bash
# 检查配置文件
cat .env.local

# 必须配置的变量:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY  
# - SESSION_SECRET_KEY
```

### 2. Supabase数据库连接

```bash
# 测试数据库连接
node -e "
const { supabase } = require('./lib/supabase.ts');
supabase.from('academic_results').select('SNH').limit(1).then(r => 
  console.log('DB Test:', r.error ? 'Failed' : 'Success')
);
"
```

### 3. 代理服务器验证

```bash
# 确认代理服务器运行正常
curl http://10.3.58.3:8080/health

# 测试CAS回调转发
curl -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=test"
```

## 🧪 部署后验证

### 基础功能测试
```bash
# 健康检查
curl https://butp.tech/health

# 主页访问
curl -I https://butp.tech/

# CAS重定向测试
curl -I https://butp.tech/dashboard
```

### 完整认证流程测试

1. **浏览器访问**: `https://butp.tech/dashboard`
2. **预期重定向**: 到北邮CAS登录页面
3. **认证流程**: 输入学号密码 → CAS回调 → 代理转发 → 自动登录
4. **最终结果**: 成功进入dashboard页面

## 📊 服务管理命令

```bash
# 查看服务状态
pm2 status butp-app

# 查看服务日志
pm2 logs butp-app

# 重启服务
pm2 restart butp-app

# 监控服务
pm2 monit

# 停止服务
pm2 stop butp-app

# 删除服务
pm2 delete butp-app
```

## 🔧 故障排查

### 常见问题及解决方案

#### 1. 构建失败
```bash
# 清理并重新构建
rm -rf .next node_modules
npm install
npm run build
```

#### 2. 服务启动失败
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查PM2日志
pm2 logs butp-app --err

# 检查环境变量
cat .env.local
```

#### 3. CAS认证问题
```bash
# 检查代理服务器
ssh bupt@10.3.58.3 'pm2 status cas-proxy'

# 检查CAS配置
curl -I "https://butp.tech/dashboard"
```

#### 4. 数据库连接问题
```bash
# 测试Supabase连接
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/academic_results?select=SNH&limit=1"
```

## 🎯 测试清单

部署完成后，请完成以下测试：

### 基础功能
- [ ] 主页正常访问
- [ ] 健康检查通过
- [ ] 静态资源加载正常

### CAS认证
- [ ] 访问受保护页面自动重定向到CAS
- [ ] CAS登录后正确回调
- [ ] 代理服务器转发正常
- [ ] 自动登录完成

### 系统集成
- [ ] 数据库连接正常
- [ ] 会话管理正常
- [ ] 所有页面功能正常

## 📞 技术支持

如果遇到问题，请提供以下信息：

1. **错误描述**：具体什么不工作
2. **错误日志**：`pm2 logs butp-app`
3. **服务状态**：`pm2 status`
4. **网络测试**：代理服务器和主站的连通性
5. **环境配置**：确认环境变量是否正确

---

## 🎉 恭喜！

如果所有测试都通过，您的CAS认证系统已成功部署！

用户现在可以：
- 访问 `https://butp.tech/dashboard` 进行北邮CAS认证
- 使用学号自动登录系统
- 享受单点登录体验 