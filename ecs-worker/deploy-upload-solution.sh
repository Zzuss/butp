#!/bin/bash

# ECS文件上传方案部署脚本

echo "🚀 部署ECS文件上传解决方案..."

# 1. 停止现有服务
echo "⏹️ 停止现有服务..."
pm2 stop all

# 2. 备份现有文件
echo "💾 备份现有文件..."
cp package.json package.json.backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp ecosystem.config.js ecosystem.config.js.backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# 3. 更新配置文件
echo "🔄 更新配置文件..."
cp package-upload.json package.json
cp ecosystem-upload.config.js ecosystem.config.js

# 4. 安装新依赖
echo "📦 安装依赖..."
npm install

# 5. 创建必要目录
echo "📁 创建目录..."
mkdir -p logs temp

# 6. 配置防火墙（如果需要）
echo "🔥 配置防火墙..."
# 开放3001端口用于文件上传
sudo ufw allow 3001/tcp 2>/dev/null || echo "防火墙配置跳过"

# 7. 启动服务
echo "🚀 启动服务..."
pm2 start ecosystem.config.js

# 8. 设置开机自启
pm2 startup 2>/dev/null || echo "开机自启设置跳过"
pm2 save

# 9. 检查服务状态
echo "📊 服务状态:"
pm2 status

echo ""
echo "🌐 服务地址:"
echo "   文件上传: http://$(curl -s ifconfig.me):3001"
echo "   健康检查: http://$(curl -s ifconfig.me):3001/health"

echo ""
echo "📋 查看日志:"
echo "   工作进程: pm2 logs butp-worker"
echo "   上传服务: pm2 logs butp-upload-server"

echo ""
echo "✅ 部署完成！"
echo "💡 现在文件会直接上传到ECS，无需网络下载"
