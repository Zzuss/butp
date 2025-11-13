#!/bin/bash

# ECS更新部署脚本

echo "🔧 更新ECS工作进程..."

# 1. 停止服务
echo "⏹️ 停止当前服务..."
pm2 stop butp-worker

# 2. 备份当前文件
echo "💾 备份当前文件..."
cp index.js index.js.backup-$(date +%Y%m%d_%H%M%S)

# 3. 替换为新文件
echo "🔄 更新文件..."
cp index-fixed.js index.js

# 4. 重启服务
echo "🚀 重启服务..."
pm2 restart butp-worker

# 5. 查看状态
echo "📊 服务状态:"
pm2 status

echo ""
echo "📋 最近日志:"
pm2 logs butp-worker --lines 10

echo ""
echo "✅ 更新完成！"
echo "💡 实时查看日志: pm2 logs butp-worker --lines 0"
