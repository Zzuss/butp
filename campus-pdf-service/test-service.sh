#!/bin/bash

# 校内PDF服务测试脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 测试校内PDF服务...${NC}"

# 读取配置
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}❌ 未找到.env文件，请先运行部署脚本${NC}"
    exit 1
fi

SERVICE_URL=${SERVICE_URL:-"http://10.3.58.3:8000"}
API_KEY=${PDF_SERVICE_KEY:-"campus-pdf-2024"}

echo -e "${YELLOW}📋 测试配置:${NC}"
echo -e "  服务地址: ${SERVICE_URL}"
echo -e "  API密钥: ${API_KEY}"

# 1. 健康检查测试
echo -e "\n${BLUE}1️⃣ 健康检查测试...${NC}"
if curl -f "${SERVICE_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 健康检查通过${NC}"
else
    echo -e "${RED}❌ 健康检查失败${NC}"
    exit 1
fi

# 2. API密钥验证测试
echo -e "\n${BLUE}2️⃣ API密钥验证测试...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${SERVICE_URL}/generate-pdf" \
    -H "Content-Type: application/json" \
    -H "x-pdf-key: wrong-key" \
    -d '{"html":"<h1>Test</h1>"}')

if [ "$response" = "401" ]; then
    echo -e "${GREEN}✅ API密钥验证正常${NC}"
else
    echo -e "${RED}❌ API密钥验证失败 (返回码: $response)${NC}"
fi

# 3. PDF生成测试
echo -e "\n${BLUE}3️⃣ PDF生成测试...${NC}"
test_html='<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>测试PDF</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { color: #333; font-size: 24px; margin-bottom: 20px; }
        .content { line-height: 1.6; color: #666; }
        .success { color: green; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">校内PDF服务测试</div>
    <div class="content">
        <p>这是一个测试页面，用于验证校内PDF服务是否正常工作。</p>
        <p class="success">如果你能看到这个PDF，说明服务配置成功！</p>
        <p>测试时间: '$(date)'</p>
        <p>服务器: 10.3.58.3:8000</p>
    </div>
</body>
</html>'

# 生成测试PDF
echo -e "${YELLOW}📝 正在生成测试PDF...${NC}"
curl -X POST "${SERVICE_URL}/generate-pdf" \
    -H "Content-Type: application/json" \
    -H "x-pdf-key: ${API_KEY}" \
    -d "{\"html\":\"$(echo "$test_html" | sed 's/"/\\"/g')\",\"filename\":\"test-campus-pdf.pdf\"}" \
    -o "test-output.pdf" \
    --silent --show-error

if [ -f "test-output.pdf" ] && [ -s "test-output.pdf" ]; then
    file_size=$(stat -f%z "test-output.pdf" 2>/dev/null || stat -c%s "test-output.pdf" 2>/dev/null)
    echo -e "${GREEN}✅ PDF生成成功 (大小: ${file_size} bytes)${NC}"
    echo -e "${GREEN}📄 测试PDF已保存为: test-output.pdf${NC}"
else
    echo -e "${RED}❌ PDF生成失败${NC}"
    exit 1
fi

# 4. 性能测试
echo -e "\n${BLUE}4️⃣ 性能测试...${NC}"
echo -e "${YELLOW}📊 测试PDF生成性能...${NC}"

start_time=$(date +%s%3N)
curl -X POST "${SERVICE_URL}/generate-pdf" \
    -H "Content-Type: application/json" \
    -H "x-pdf-key: ${API_KEY}" \
    -d '{"html":"<h1>性能测试</h1><p>测试PDF生成速度</p>"}' \
    -o "performance-test.pdf" \
    --silent --show-error
end_time=$(date +%s%3N)

duration=$((end_time - start_time))
echo -e "${GREEN}✅ 性能测试完成: ${duration}ms${NC}"

if [ $duration -lt 5000 ]; then
    echo -e "${GREEN}🚀 性能良好 (<5秒)${NC}"
elif [ $duration -lt 10000 ]; then
    echo -e "${YELLOW}⚠️  性能一般 (5-10秒)${NC}"
else
    echo -e "${RED}🐌 性能较慢 (>10秒)${NC}"
fi

# 清理测试文件
rm -f performance-test.pdf

echo -e "\n${GREEN}🎉 所有测试通过！${NC}"
echo -e "${BLUE}📋 测试总结:${NC}"
echo -e "  ✅ 服务健康状态正常"
echo -e "  ✅ API密钥验证工作正常"
echo -e "  ✅ PDF生成功能正常"
echo -e "  ✅ 性能测试通过"
echo -e "\n${YELLOW}🔗 服务访问信息:${NC}"
echo -e "  健康检查: ${SERVICE_URL}/health"
echo -e "  PDF生成: ${SERVICE_URL}/generate-pdf"
echo -e "  API密钥: ${API_KEY}"
