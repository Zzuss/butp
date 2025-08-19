#!/bin/bash

echo "🔧 修复网络连接问题..."

# 重启服务以应用新的配置
echo "1. 重启PDF服务..."
if [ -f "service.pid" ]; then
    PID=$(cat service.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "停止旧服务 (PID: $PID)..."
        kill $PID
        sleep 2
    fi
fi

# 清理旧的日志
if [ -f "service.log" ]; then
    mv service.log service.log.old
fi

echo "2. 启动新服务..."

# 设置环境变量
export PDF_SERVICE_KEY="campus-pdf-2024-1755617095"
export PORT=8000
export PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"

# 启动服务
nohup node server.js > service.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > service.pid

echo "✅ 服务已重启 (新PID: $NEW_PID)"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
if kill -0 $NEW_PID 2>/dev/null; then
    echo "✅ 服务运行正常"
else
    echo "❌ 服务启动失败"
    tail -10 service.log
    exit 1
fi

# 健康检查
echo "🔍 健康检查..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    tail -10 service.log
    exit 1
fi

echo "🎉 网络问题修复完成！"
echo ""
echo "现在可以测试:"
echo "bash test-html-pdf.sh    # 测试HTML内容PDF生成"
echo "bash test-network.sh     # 检查网络连接"
