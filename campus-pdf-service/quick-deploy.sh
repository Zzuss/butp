#!/bin/bash

# 快速部署脚本 - 处理Docker构建问题
set -e

echo "🚀 快速部署校内PDF服务..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 停止当前构建（如果还在运行）
echo -e "${YELLOW}🛑 停止当前构建...${NC}"
docker-compose down --remove-orphans || true
docker system prune -f

# 设置环境变量
export PDF_SERVICE_KEY=${PDF_SERVICE_KEY:-"campus-pdf-2024-$(date +%s)"}

echo -e "${BLUE}📋 部署配置:${NC}"
echo -e "  服务器地址: 10.3.58.3:8000"
echo -e "  API密钥: ${PDF_SERVICE_KEY}"

# 选择构建方式
echo -e "${YELLOW}选择部署方式:${NC}"
echo "1) 使用简化Dockerfile (推荐)"
echo "2) 使用完整Dockerfile"
echo "3) 直接运行Node.js (不使用Docker)"
read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo -e "${BLUE}🔨 使用简化Dockerfile构建...${NC}"
        cp Dockerfile.simple Dockerfile
        docker-compose build --no-cache
        ;;
    2)
        echo -e "${BLUE}🔨 使用完整Dockerfile构建...${NC}"
        # 使用原始Dockerfile
        docker-compose build --no-cache
        ;;
    3)
        echo -e "${BLUE}🏃 直接运行Node.js服务...${NC}"
        # 检查Node.js和npm
        if ! command -v node &> /dev/null; then
            echo -e "${RED}❌ Node.js未安装${NC}"
            exit 1
        fi
        
        # 安装依赖
        npm install
        
        # 检查Chrome/Chromium
        if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
            echo -e "${YELLOW}⚠️ 检测到Chrome未安装，正在安装...${NC}"
            
            # 安装Chrome
            wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
            echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
            sudo apt-get update
            sudo apt-get install -y google-chrome-stable
        fi
        
        # 直接启动服务
        echo -e "${GREEN}🚀 启动服务...${NC}"
        export PORT=8000
        export PDF_SERVICE_KEY="${PDF_SERVICE_KEY}"
        nohup node server.js > service.log 2>&1 &
        
        # 保存进程ID
        echo $! > service.pid
        
        sleep 5
        
        # 检查服务
        if curl -f http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 服务启动成功!${NC}"
            echo -e "${GREEN}📍 健康检查: http://10.3.58.3:8000/health${NC}"
            echo -e "${GREEN}📍 PDF生成: http://10.3.58.3:8000/generate-pdf${NC}"
            echo -e "${GREEN}🔑 API密钥: ${PDF_SERVICE_KEY}${NC}"
            echo -e "${YELLOW}📋 管理命令:${NC}"
            echo -e "  查看日志: tail -f service.log"
            echo -e "  停止服务: kill \$(cat service.pid)"
        else
            echo -e "${RED}❌ 服务启动失败${NC}"
            echo -e "${YELLOW}📋 查看日志:${NC}"
            tail -20 service.log
            exit 1
        fi
        
        # 保存配置
        cat > .env << EOF
PDF_SERVICE_KEY=${PDF_SERVICE_KEY}
SERVICE_URL=http://10.3.58.3:8000
DEPLOY_TIME=$(date)
DEPLOY_TYPE=nodejs
PID_FILE=service.pid
LOG_FILE=service.log
EOF
        
        echo -e "${GREEN}🎉 Node.js直接部署完成!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac

# Docker部署继续
echo -e "${GREEN}🚀 启动Docker服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 15

# 健康检查
echo -e "${BLUE}🔍 检查服务状态...${NC}"
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker服务启动成功!${NC}"
    echo -e "${GREEN}📍 健康检查: http://10.3.58.3:8000/health${NC}"
    echo -e "${GREEN}📍 PDF生成: http://10.3.58.3:8000/generate-pdf${NC}"
    echo -e "${GREEN}🔑 API密钥: ${PDF_SERVICE_KEY}${NC}"
else
    echo -e "${RED}❌ Docker服务启动失败${NC}"
    echo -e "${YELLOW}📋 查看日志:${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# 显示运行状态
echo -e "${BLUE}📊 Docker服务状态:${NC}"
docker-compose ps

# 保存配置信息
cat > .env << EOF
PDF_SERVICE_KEY=${PDF_SERVICE_KEY}
SERVICE_URL=http://10.3.58.3:8000
DEPLOY_TIME=$(date)
DEPLOY_TYPE=docker
EOF

echo -e "${GREEN}🎉 Docker部署完成!${NC}"
