#!/bin/bash

echo "🛑 停止当前Docker构建..."

# 停止所有相关容器
docker-compose down --remove-orphans

# 停止所有Docker构建进程
docker ps -q --filter "ancestor=campus-pdf-service" | xargs -r docker stop
docker ps -aq --filter "ancestor=campus-pdf-service" | xargs -r docker rm

# 清理构建缓存
docker builder prune -f

# 清理未使用的镜像
docker image prune -f

echo "✅ 清理完成！现在可以重新部署。"
echo ""
echo "推荐使用快速部署："
echo "bash quick-deploy.sh"
