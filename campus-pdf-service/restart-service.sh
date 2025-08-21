#!/bin/bash

echo "🔄 重启校内PDF服务..."

# 停止所有相关进程
pkill -f "node server.js" || true
sleep 2

# 清理旧日志
if [ -f "service.log" ]; then
    mv service.log service.log.backup
fi

# 设置环境变量
export PDF_SERVICE_KEY="campus-pdf-2024-1755617095"
export PORT=8000
export PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"

echo "🚀 启动PDF服务..."

# 启动服务
nohup node server.js > service.log 2>&1 &
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
for i in {1..5}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ 健康检查通过"
        break
    else
        echo "⏳ 等待服务就绪... ($i/5)"
        sleep 2
        if [ $i -eq 5 ]; then
            echo "❌ 健康检查失败"
            echo "查看日志:"
            tail -10 service.log
            exit 1
        fi
    fi
done

echo "🎉 PDF服务重启完成！"
echo "📍 服务地址: http://10.3.58.3:8000"
echo "📋 管理命令:"
echo "  查看日志: tail -f service.log"
echo "  查看状态: ps aux | grep $NEW_PID"
echo "  停止服务: kill $NEW_PID"
