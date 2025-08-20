#!/bin/bash

echo "🔧 修复多页PDF服务..."

# 停止所有相关进程
echo "🛑 停止当前服务..."
pkill -f "node server" || true
sleep 2

# 检查依赖是否完整
echo "🔍 检查依赖状态..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules 不存在，重新安装依赖..."
    npm install
fi

# 检查关键依赖
if ! node -e "require('express')" 2>/dev/null; then
    echo "❌ Express未安装，安装基础依赖..."
    npm install express puppeteer
fi

# 使用新的多页支持服务
echo "🚀 启动多页支持的PDF服务..."
if [ -f "server-simple-multipage.js" ]; then
    echo "使用 server-simple-multipage.js..."
    nohup node server-simple-multipage.js > service.log 2>&1 &
    NEW_PID=$!
    SERVICE_FILE="server-simple-multipage.js"
elif [ -f "server.js" ]; then
    echo "使用完整版 server.js..."
    nohup node server.js > service.log 2>&1 &
    NEW_PID=$!
    SERVICE_FILE="server.js"
else
    echo "❌ 没有找到可用的服务文件"
    exit 1
fi

echo "✅ 服务已启动 (PID: $NEW_PID, 文件: $SERVICE_FILE)"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 健康检查
echo "🔍 健康检查..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health 2>/dev/null)

if [ $? -eq 0 ] && echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ 服务运行正常"
    echo ""
    echo "📋 服务信息:"
    echo "  地址: http://10.3.58.3:8000"
    echo "  PID: $NEW_PID"
    echo "  文件: $SERVICE_FILE"
    echo "  日志: tail -f service.log"
    echo ""
    echo "🎯 多页支持状态:"
    if echo "$HEALTH_RESPONSE" | grep -q "multipage-support"; then
        echo "  ✅ 多页支持已启用"
        echo "  ✅ HTML内容支持已启用"
        echo "  ✅ 智能分页功能已启用"
    else
        echo "  ⚠️  使用基础版本（可能不支持完整多页功能）"
    fi
    echo ""
    echo "🧪 测试命令:"
    echo "  bash test-long-content.sh"
    echo ""
    echo "🎉 服务修复完成！"
else
    echo "❌ 服务启动失败"
    echo "📝 查看错误日志:"
    echo "tail -10 service.log"
    echo ""
    echo "🔧 可能的解决方案:"
    echo "1. 检查端口是否被占用: netstat -tlnp | grep 8000"
    echo "2. 检查Chrome浏览器: which google-chrome"
    echo "3. 重新安装依赖: rm -rf node_modules && npm install"
    exit 1
fi
