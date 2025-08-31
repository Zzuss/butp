#!/bin/bash
set -e

# 简单的部署脚本：构建并运行 Docker 容器，暴露 8000 端口
IMAGE_NAME=campus-pdf-service:latest
CONTAINER_NAME=campus-pdf-service

echo "构建镜像..."
docker build -t $IMAGE_NAME .

echo "停止并移除旧容器（如果存在）..."
docker rm -f $CONTAINER_NAME 2>/dev/null || true

echo "运行新容器..."
docker run -d --name $CONTAINER_NAME -p 8000:8000 --restart unless-stopped $IMAGE_NAME

echo "配置防火墙（开放 8000 端口）..."
# 仅在使用 ufw 的系统上运行
if command -v ufw >/dev/null 2>&1; then
  ufw allow 8000/tcp
fi

echo "部署完成。请根据需要配置 nginx 并启用 HTTPS。"

#!/bin/bash

# 校内PDF服务部署脚本
set -e

echo "🚀 开始部署校内PDF服务..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose未安装，请先安装Docker Compose${NC}"
    exit 1
fi

# 设置环境变量
export PDF_SERVICE_KEY=${PDF_SERVICE_KEY:-"campus-pdf-2024-$(date +%s)"}

echo -e "${BLUE}📋 部署配置:${NC}"
echo -e "  服务器地址: 10.3.58.3:8000"
echo -e "  API密钥: ${PDF_SERVICE_KEY}"
echo -e "  Docker镜像: campus-pdf-service"

# 创建必要的目录
mkdir -p logs ssl

# 停止现有服务
echo -e "${YELLOW}🛑 停止现有服务...${NC}"
docker-compose down --remove-orphans || true

# 构建镜像
echo -e "${BLUE}🔨 构建Docker镜像...${NC}"
docker-compose build --no-cache

# 启动服务
echo -e "${GREEN}🚀 启动服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

# 健康检查
echo -e "${BLUE}🔍 检查服务状态...${NC}"
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 服务启动成功!${NC}"
    echo -e "${GREEN}📍 健康检查: http://10.3.58.3:8000/health${NC}"
    echo -e "${GREEN}📍 PDF生成: http://10.3.58.3:8000/generate-pdf${NC}"
    echo -e "${GREEN}🔑 API密钥: ${PDF_SERVICE_KEY}${NC}"
else
    echo -e "${RED}❌ 服务启动失败${NC}"
    echo -e "${YELLOW}📋 查看日志:${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# 显示运行状态
echo -e "${BLUE}📊 服务状态:${NC}"
docker-compose ps

# 保存配置信息
cat > .env << EOF
PDF_SERVICE_KEY=${PDF_SERVICE_KEY}
SERVICE_URL=http://10.3.58.3:8000
DEPLOY_TIME=$(date)
EOF

echo -e "${GREEN}🎉 部署完成!${NC}"
echo -e "${YELLOW}📝 重要信息已保存到 .env 文件${NC}"
echo -e "${YELLOW}🔧 管理命令:${NC}"
echo -e "  启动服务: docker-compose up -d"
echo -e "  停止服务: docker-compose down"
echo -e "  查看日志: docker-compose logs -f"
echo -e "  重启服务: docker-compose restart"
