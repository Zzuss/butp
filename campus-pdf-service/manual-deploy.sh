#!/bin/bash

# 手动部署脚本 - 解决npm卡住问题
set -e

echo "🚀 手动部署校内PDF服务..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 停止当前进程
echo -e "${YELLOW}🛑 停止当前npm进程...${NC}"
pkill -f "npm install" || true
sleep 2

# 清理npm缓存
echo -e "${YELLOW}🧹 清理npm缓存...${NC}"
npm cache clean --force

# 删除node_modules
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}🗑️ 删除旧的node_modules...${NC}"
    rm -rf node_modules
fi

# 删除package-lock.json
if [ -f "package-lock.json" ]; then
    echo -e "${YELLOW}🗑️ 删除package-lock.json...${NC}"
    rm -f package-lock.json
fi

# 设置环境变量
export PDF_SERVICE_KEY=${PDF_SERVICE_KEY:-"campus-pdf-2024-$(date +%s)"}
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

echo -e "${BLUE}📋 部署配置:${NC}"
echo -e "  服务器地址: 10.3.58.3:8000"
echo -e "  API密钥: ${PDF_SERVICE_KEY}"
echo -e "  跳过Chromium下载: true"

# 1. 安装Chrome浏览器
echo -e "${BLUE}🌐 检查Chrome浏览器...${NC}"
bash install-chrome.sh

# 2. 安装Node.js依赖
echo -e "${BLUE}📦 安装Node.js依赖...${NC}"
bash install-deps.sh

# 3. 验证安装
echo -e "${BLUE}🔍 验证安装...${NC}"
if [ ! -f "node_modules/puppeteer/package.json" ]; then
    echo -e "${RED}❌ Puppeteer安装失败${NC}"
    exit 1
fi

if [ ! -f "node_modules/express/package.json" ]; then
    echo -e "${RED}❌ Express安装失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 依赖安装验证通过${NC}"

# 4. 启动服务
echo -e "${GREEN}🚀 启动PDF服务...${NC}"

# 设置Puppeteer使用系统Chrome
if command -v google-chrome &> /dev/null; then
    export PUPPETEER_EXECUTABLE_PATH=$(which google-chrome)
elif command -v chromium-browser &> /dev/null; then
    export PUPPETEER_EXECUTABLE_PATH=$(which chromium-browser)
else
    echo -e "${RED}❌ 未找到可用的浏览器${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 使用浏览器: ${PUPPETEER_EXECUTABLE_PATH}${NC}"

# 启动服务
export PORT=8000
nohup node server.js > service.log 2>&1 &
SERVICE_PID=$!
echo $SERVICE_PID > service.pid

echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

# 检查服务状态
if kill -0 $SERVICE_PID 2>/dev/null; then
    echo -e "${GREEN}✅ 服务进程运行正常 (PID: $SERVICE_PID)${NC}"
else
    echo -e "${RED}❌ 服务进程启动失败${NC}"
    echo -e "${YELLOW}📋 查看日志:${NC}"
    tail -20 service.log
    exit 1
fi

# 健康检查
echo -e "${BLUE}🔍 健康检查...${NC}"
for i in {1..5}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 健康检查通过!${NC}"
        break
    else
        echo -e "${YELLOW}⏳ 等待服务响应... ($i/5)${NC}"
        sleep 5
    fi
    
    if [ $i -eq 5 ]; then
        echo -e "${RED}❌ 健康检查失败${NC}"
        echo -e "${YELLOW}📋 查看日志:${NC}"
        tail -20 service.log
        exit 1
    fi
done

# 成功部署
echo -e "${GREEN}🎉 部署成功!${NC}"
echo -e "${GREEN}📍 服务信息:${NC}"
echo -e "  健康检查: http://10.3.58.3:8000/health"
echo -e "  PDF生成: http://10.3.58.3:8000/generate-pdf"
echo -e "  API密钥: ${PDF_SERVICE_KEY}"
echo -e "  进程PID: $SERVICE_PID"
echo -e "  日志文件: service.log"

echo -e "${YELLOW}📋 管理命令:${NC}"
echo -e "  查看日志: tail -f service.log"
echo -e "  查看状态: ps aux | grep $SERVICE_PID"
echo -e "  停止服务: kill $SERVICE_PID"
echo -e "  重启服务: kill $SERVICE_PID && bash manual-deploy.sh"

# 保存配置
cat > .env << EOF
PDF_SERVICE_KEY=${PDF_SERVICE_KEY}
SERVICE_URL=http://10.3.58.3:8000
DEPLOY_TIME=$(date)
DEPLOY_TYPE=manual-nodejs
PID_FILE=service.pid
LOG_FILE=service.log
SERVICE_PID=${SERVICE_PID}
PUPPETEER_EXECUTABLE_PATH=${PUPPETEER_EXECUTABLE_PATH}
EOF

echo -e "${GREEN}🔧 配置已保存到 .env 文件${NC}"

# 运行测试
echo -e "${BLUE}🧪 运行基础测试...${NC}"
sleep 2

# 测试健康检查
echo "测试健康检查..."
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ 健康检查测试通过${NC}"
else
    echo -e "${YELLOW}⚠️ 健康检查测试失败${NC}"
fi

echo -e "${GREEN}🎊 校内PDF服务部署完成！${NC}"
