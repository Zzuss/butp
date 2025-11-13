# ECS后台处理服务

这是一个运行在阿里云ECS上的Node.js后台处理服务，专门处理成绩导入任务。

## 🏗️ 架构说明

```
Vercel前端 → Supabase数据库 ← ECS后台服务
    ↓              ↓              ↓
  文件上传      任务状态存储    队列处理
  任务创建      文件元数据      Excel解析
  进度显示      结果存储        数据导入
```

## 🚀 部署步骤

### 1. 准备ECS服务器
- 系统：CentOS 7+ 或 Ubuntu 18+
- 配置：2核4G以上推荐
- 网络：确保能访问Supabase

### 2. 上传代码
```bash
# 将整个ecs-worker目录上传到ECS
scp -r ecs-worker/ root@your-ecs-ip:/opt/
```

### 3. 执行部署脚本
```bash
cd /opt/ecs-worker
chmod +x deploy.sh
./deploy.sh
```

### 4. 配置环境变量
```bash
# 编辑环境配置
nano .env

# 填入你的配置
SUPABASE_URL=https://supabase.butp.tech
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 5. 启动服务
```bash
# 启动
npm run pm2:start

# 查看状态
pm2 status

# 查看日志
pm2 logs butp-worker
```

## 📋 功能特性

### ✅ 核心功能
- **队列监听**：每30秒检查一次待处理任务
- **并发处理**：支持同时处理多个任务
- **批量导入**：1000条记录一批，避免内存溢出
- **错误恢复**：自动重试和错误处理
- **原子交换**：确保数据一致性

### ✅ 运维特性
- **PM2管理**：进程守护和自动重启
- **日志记录**：详细的操作日志
- **监控告警**：资源使用监控
- **优雅关闭**：支持平滑重启

### ✅ 性能优化
- **内存管理**：及时清理临时文件
- **连接池**：复用数据库连接
- **批处理**：减少数据库操作次数

## 🔧 运维命令

```bash
# 查看服务状态
pm2 status

# 重启服务
pm2 restart butp-worker

# 停止服务
pm2 stop butp-worker

# 查看日志
pm2 logs butp-worker

# 监控资源
pm2 monit

# 清理日志
pm2 flush
```

## 📊 监控指标

### 关键指标
- CPU使用率 < 80%
- 内存使用率 < 80%
- 磁盘空间 > 20%
- 任务处理延迟 < 5分钟

### 告警设置
```bash
# 设置内存告警
pm2 set pm2:max-memory-restart 1G

# 设置CPU告警
pm2 set pm2:max-cpu-restart 80
```

## 🐛 故障排查

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查日志
   tail -f logs/error.log
   
   # 检查环境变量
   cat .env
   ```

2. **数据库连接失败**
   ```bash
   # 测试连接
   node -e "console.log(process.env.SUPABASE_URL)"
   
   # 检查网络
   ping supabase.butp.tech
   ```

3. **文件处理失败**
   ```bash
   # 检查临时目录权限
   ls -la temp/
   
   # 检查磁盘空间
   df -h
   ```

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新安装依赖
npm install

# 重启服务
pm2 restart butp-worker
```

## 📈 性能调优

### 1. 调整并发数
```javascript
// 在index.js中修改
const MAX_CONCURRENT_TASKS = 4 // 根据服务器配置调整
```

### 2. 调整批处理大小
```javascript
const BATCH_SIZE = 2000 // 内存充足时可以增大
```

### 3. 调整检查频率
```javascript
// 高负载时可以调整为更频繁
cron.schedule('*/15 * * * * *', ...)
```
