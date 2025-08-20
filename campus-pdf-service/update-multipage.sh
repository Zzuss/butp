#!/bin/bash

echo "🔄 更新校内PDF服务支持多页..."

# 停止当前服务
echo "🛑 停止当前服务..."
pkill -f "node server.js" || true
pkill -f "node server-simple.js" || true

# 等待进程完全停止
sleep 2

# 重新启动服务
echo "🚀 启动更新后的服务..."

# 使用简化版服务（更稳定）
if [ -f "server-simple.js" ]; then
    echo "使用简化版服务..."
    nohup node server-simple.js > service.log 2>&1 &
    NEW_PID=$!
else
    echo "使用完整版服务..."
    nohup node server.js > service.log 2>&1 &
    NEW_PID=$!
fi

echo "✅ 服务已启动 (PID: $NEW_PID)"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 健康检查
echo "🔍 健康检查..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ 服务运行正常"
    echo ""
    echo "📋 服务信息:"
    echo "  地址: http://10.3.58.3:8000"
    echo "  PID: $NEW_PID"
    echo "  日志: tail -f service.log"
    echo ""
    echo "🎉 多页PDF支持已启用！"
    echo "现在可以生成任意长度的多页PDF文档。"
else
    echo "❌ 服务启动失败"
    echo "查看日志: tail -f service.log"
    exit 1
fi
