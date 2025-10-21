@echo off
REM Windows异步API服务器部署脚本

echo 🚀 开始部署异步预测API服务器...

REM 服务器配置
set SERVER_HOST=8.152.102.160
set SERVER_USER=root
set SERVER_PATH=/opt/prediction-service/function

echo 📡 目标服务器: %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%

REM 检查SSH连接
echo 🔍 检查SSH连接...
ssh -o ConnectTimeout=10 "%SERVER_USER%@%SERVER_HOST%" "echo '✅ SSH连接成功'"
if errorlevel 1 (
    echo ❌ SSH连接失败，请检查网络和密钥
    pause
    exit /b 1
)

REM 停止旧服务
echo 🛑 停止现有服务...
ssh "%SERVER_USER%@%SERVER_HOST%" "pkill -f 'robust_api_server' || true; pkill -f 'async_api_server' || true; pkill -f 'api_server' || true; sleep 2; echo '服务已停止'"

REM 备份现有文件
echo 💾 备份现有文件...
ssh "%SERVER_USER%@%SERVER_HOST%" "cd %SERVER_PATH% && if [ -f robust_api_server.py ]; then cp robust_api_server.py robust_api_server.py.backup.$(date +%%Y%%m%%d_%%H%%M%%S); echo '已备份 robust_api_server.py'; fi"

REM 上传异步API服务器
echo 📤 上传异步API服务器...
scp async_api_server.py "%SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/"
if errorlevel 1 (
    echo ❌ 文件上传失败
    pause
    exit /b 1
)

REM 设置权限并创建目录
echo 🔐 设置权限和创建目录...
ssh "%SERVER_USER%@%SERVER_HOST%" "cd %SERVER_PATH% && chmod +x async_api_server.py && mkdir -p uploads results && chmod 755 uploads results && echo '设置完成'"

REM 验证环境
echo 🐍 验证Python环境...
ssh "%SERVER_USER%@%SERVER_HOST%" "cd %SERVER_PATH% && python3 --version && python3 -c 'import flask, pandas; print(\"✅ 依赖包正常\")' && echo '环境验证完成'"

REM 启动异步API服务器
echo 🚀 启动异步API服务器...
ssh "%SERVER_USER%@%SERVER_HOST%" "cd %SERVER_PATH% && nohup python3 async_api_server.py --port 8080 > async_api_8080.log 2>&1 & sleep 5"

REM 检查服务状态
echo 📊 检查服务状态...
ssh "%SERVER_USER%@%SERVER_HOST%" "ps aux | grep -v grep | grep async_api_server && echo '✅ 服务启动成功' || echo '❌ 服务启动失败'"

REM 测试API
echo 🧪 测试API端点...
timeout /t 3 >nul
curl -f "http://%SERVER_HOST%:8080/health" >nul 2>&1 && echo ✅ 健康检查通过 || echo ❌ 健康检查失败
curl -f "http://%SERVER_HOST%:8080/api/majors" >nul 2>&1 && echo ✅ 专业列表API正常 || echo ❌ 专业列表API失败

echo.
echo 🎉 异步预测API服务器部署完成!
echo 🌐 服务地址: http://%SERVER_HOST%:8080
echo 📋 API端点:
echo    POST /api/task/start       - 启动预测任务
echo    GET  /api/task/status/^<id^> - 查询任务状态
echo    GET  /api/task/result/^<id^>/^<file^> - 下载结果
echo    GET  /api/majors          - 获取专业列表
echo    GET  /health              - 健康检查
echo.
echo 📱 使用方法：
echo 1. 在前端访问 /admin/prediction/async 页面
echo 2. 上传Excel文件并选择年级
echo 3. 系统将异步执行预测并显示进度
echo 4. 完成后可一键导入数据库
echo.
echo 🔧 故障排除:
echo 查看日志: ssh %SERVER_USER%@%SERVER_HOST% 'tail -f %SERVER_PATH%/async_api_8080.log'
echo 重启服务: ssh %SERVER_USER%@%SERVER_HOST% 'cd %SERVER_PATH% && pkill -f async_api_server && python3 async_api_server.py --port 8080 > async_api_8080.log 2>&1 &'

echo.
echo 部署完成，按任意键退出...
pause >nul
