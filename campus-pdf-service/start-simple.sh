#!/bin/bash

echo "🚀 启动简化版PDF服务..."

# 停止所有相关进程
pkill -f "node server" || true
sleep 2

# 清理旧日志
if [ -f "service.log" ]; then
    mv service.log service.log.backup
fi

# 设置环境变量
export PDF_SERVICE_KEY="campus-pdf-2024-1755617095"
export PORT=8000
export PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"

echo "🔧 检查依赖..."

# 检查Node.js版本
echo "Node.js版本: $(node --version)"

# 检查关键模块是否存在
if node -e "require('express')" 2>/dev/null; then
    echo "✅ Express已安装"
else
    echo "❌ Express未安装"
    exit 1
fi

if node -e "require('puppeteer')" 2>/dev/null; then
    echo "✅ Puppeteer已安装"
else
    echo "❌ Puppeteer未安装"
    exit 1
fi

echo "🚀 启动简化版PDF服务..."

# 启动简化版服务
nohup node server-simple.js > service.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > service.pid

echo "✅ 服务已启动 (PID: $NEW_PID)"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 检查进程状态
if ps -p $NEW_PID > /dev/null; then
    echo "✅ 进程运行正常"
else
    echo "❌ 进程启动失败"
    echo "查看日志:"
    tail -10 service.log
    exit 1
fi

# 健康检查
echo "🔍 健康检查..."
for i in {1..10}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ 健康检查通过"
        break
    else
        echo "⏳ 等待服务就绪... ($i/10)"
        sleep 1
        if [ $i -eq 10 ]; then
            echo "❌ 健康检查失败"
            echo "查看日志:"
            tail -20 service.log
            exit 1
        fi
    fi
done

echo "🎉 简化版PDF服务启动完成！"
echo "📍 服务地址: http://10.3.58.3:8000"
echo "🔑 API密钥: campus-pdf-2024-1755617095"
echo "📋 测试命令: bash test-html-pdf.sh"
echo ""
echo "📋 管理命令:"
echo "  查看日志: tail -f service.log"
echo "  查看状态: ps aux | grep $NEW_PID"
echo "  停止服务: kill $NEW_PID"
