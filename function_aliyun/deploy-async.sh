#!/bin/bash
# 异步API服务器部署脚本

set -e

echo "🚀 开始部署异步预测API服务器..."

# 服务器配置
SERVER_HOST="39.96.196.67"
SERVER_USER="root"
SERVER_PATH="/opt/prediction-service/function"

echo "📡 目标服务器: $SERVER_USER@$SERVER_HOST:$SERVER_PATH"

# 检查SSH连接
echo "🔍 检查SSH连接..."
ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "echo '✅ SSH连接成功'"

# 停止旧服务
echo "🛑 停止现有服务..."
ssh "$SERVER_USER@$SERVER_HOST" "
    echo '停止现有Python API服务...'
    pkill -f 'robust_api_server' || true
    pkill -f 'async_api_server' || true
    pkill -f 'api_server' || true
    sleep 2
    echo '服务已停止'
"

# 备份现有文件
echo "💾 备份现有文件..."
ssh "$SERVER_USER@$SERVER_HOST" "
    cd $SERVER_PATH
    if [ -f robust_api_server.py ]; then
        cp robust_api_server.py robust_api_server.py.backup.\$(date +%Y%m%d_%H%M%S)
        echo '已备份 robust_api_server.py'
    fi
"

# 上传新的异步API服务器
echo "📤 上传异步API服务器..."
scp async_api_server.py "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

# 设置文件权限
echo "🔐 设置文件权限..."
ssh "$SERVER_USER@$SERVER_HOST" "
    cd $SERVER_PATH
    chmod +x async_api_server.py
    echo '权限设置完成'
"

# 验证Python环境和依赖
echo "🐍 验证Python环境..."
ssh "$SERVER_USER@$SERVER_HOST" "
    cd $SERVER_PATH
    echo '检查Python版本...'
    python3 --version
    
    echo '检查必要的Python包...'
    python3 -c 'import flask, pandas; print(\"✅ Flask和Pandas已安装\")'
    
    echo '检查必要文件...'
    for file in run_prediction_direct.py feature_columns.json catboost_model.cbm scaler.pkl; do
        if [ -f \"\$file\" ]; then
            echo \"✅ \$file 存在\"
        else
            echo \"❌ \$file 不存在\"
        fi
    done
"

# 创建必要目录
echo "📁 创建工作目录..."
ssh "$SERVER_USER@$SERVER_HOST" "
    cd $SERVER_PATH
    mkdir -p uploads results
    chmod 755 uploads results
    echo '工作目录创建完成'
"

# 启动异步API服务器
echo "🚀 启动异步API服务器..."
ssh "$SERVER_USER@$SERVER_HOST" "
    cd $SERVER_PATH
    
    # 启动异步API服务器 (端口8080)
    nohup python3 async_api_server.py --port 8080 > async_api_8080.log 2>&1 &
    
    # 等待服务启动
    sleep 5
    
    echo '检查服务状态...'
    if ps aux | grep -v grep | grep async_api_server; then
        echo '✅ 异步API服务器启动成功'
    else
        echo '❌ 异步API服务器启动失败'
        cat async_api_8080.log
        exit 1
    fi
"

# 测试API端点
echo "🧪 测试API端点..."
sleep 3

echo "测试健康检查..."
if curl -f "http://$SERVER_HOST:8080/health" > /dev/null 2>&1; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
fi

echo "测试专业列表API..."
if curl -f "http://$SERVER_HOST:8080/api/majors" > /dev/null 2>&1; then
    echo "✅ 专业列表API正常"
else
    echo "❌ 专业列表API失败"
fi

# 显示服务状态
echo "📊 服务状态总览:"
ssh "$SERVER_USER@$SERVER_HOST" "
    echo '正在运行的Python进程:'
    ps aux | grep python3 | grep -E '(async_api_server|robust_api_server)' || echo '无相关进程'
    
    echo ''
    echo '端口占用情况:'
    netstat -tlnp | grep ':8080' || echo '端口8080未被占用'
    
    echo ''
    echo '最新日志 (最后10行):'
    tail -10 $SERVER_PATH/async_api_8080.log 2>/dev/null || echo '无日志文件'
"

echo ""
echo "🎉 异步预测API服务器部署完成!"
echo "🌐 服务地址: http://$SERVER_HOST:8080"
echo "📋 API端点:"
echo "   POST /api/task/start       - 启动预测任务"
echo "   GET  /api/task/status/<id> - 查询任务状态"  
echo "   GET  /api/task/result/<id>/<file> - 下载结果"
echo "   GET  /api/majors          - 获取专业列表"
echo "   GET  /health              - 健康检查"
echo ""
echo "📱 使用方法："
echo "1. 在前端访问 /admin/prediction/async 页面"
echo "2. 上传Excel文件并选择年级"
echo "3. 系统将异步执行预测并显示进度"
echo "4. 完成后可一键导入数据库"

# 提供故障排除信息
echo ""
echo "🔧 故障排除:"
echo "查看日志: ssh $SERVER_USER@$SERVER_HOST 'tail -f $SERVER_PATH/async_api_8080.log'"
echo "重启服务: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && pkill -f async_api_server && python3 async_api_server.py --port 8080 > async_api_8080.log 2>&1 &'"
echo "检查进程: ssh $SERVER_USER@$SERVER_HOST 'ps aux | grep async_api_server'"
