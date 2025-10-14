@echo off
chcp 65001 >nul
:: 阿里云预测服务部署脚本 (Windows版本)

setlocal enabledelayedexpansion

echo ========================================
echo  阿里云预测服务部署脚本 v2.0 (Windows)
echo ========================================

:: 配置变量
set SOURCE_DIR=%~dp0
set REMOTE_HOST=your_server_ip
set REMOTE_USER=root
set REMOTE_PATH=/opt/prediction-service/function

echo [INFO] 源目录: %SOURCE_DIR%
echo [INFO] 目标服务器: %REMOTE_HOST%
echo [INFO] 目标路径: %REMOTE_PATH%
echo.

:: 检查必需文件
echo 步骤 1/4: 检查必需文件
set REQUIRED_FILES=robust_api_server.py run_prediction_direct.py Optimization_model_func3_1.py feature_columns.json catboost_model.cbm scaler.pkl
for %%f in (%REQUIRED_FILES%) do (
    if not exist "%%f" (
        echo [ERROR] 缺少关键文件: %%f
        pause
        exit /b 1
    )
    echo [OK] %%f
)

:: 检查培养方案目录
for %%y in (2023 2024) do (
    if not exist "education-plan%%y" (
        echo [ERROR] 缺少培养方案目录: education-plan%%y
        pause
        exit /b 1
    )
    echo [OK] education-plan%%y
)

echo [SUCCESS] 文件检查完成
echo.

:: 创建部署包
echo 步骤 2/4: 创建部署包
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set DEPLOY_PACKAGE=prediction_service_%TIMESTAMP%.tar.gz

if exist %DEPLOY_PACKAGE% del %DEPLOY_PACKAGE%

:: 使用tar创建压缩包 (Windows 10+ 自带)
tar -czf %DEPLOY_PACKAGE% ^
    --exclude="*.log" ^
    --exclude="__pycache__" ^
    --exclude="temp" ^
    --exclude="logs" ^
    --exclude="*.pyc" ^
    .

if errorlevel 1 (
    echo [ERROR] 创建部署包失败
    pause
    exit /b 1
)

echo [SUCCESS] 部署包创建完成: %DEPLOY_PACKAGE%
echo.

:: 上传到服务器
echo 步骤 3/4: 上传到服务器
echo [INFO] 正在上传 %DEPLOY_PACKAGE% 到 %REMOTE_HOST%...
echo [INFO] 请确保已配置SSH密钥认证

scp %DEPLOY_PACKAGE% %REMOTE_USER%@%REMOTE_HOST%:/tmp/

if errorlevel 1 (
    echo [ERROR] 文件上传失败
    echo [HELP] 请检查:
    echo   1. SSH连接是否正常
    echo   2. 服务器地址是否正确
    echo   3. 是否配置了SSH密钥
    pause
    exit /b 1
)

echo [SUCCESS] 文件上传完成
echo.

:: 远程部署
echo 步骤 4/4: 远程部署
echo [INFO] 在服务器上执行部署...

ssh %REMOTE_USER%@%REMOTE_HOST% "
    cd /tmp && 
    echo '正在解压部署包...' &&
    mkdir -p %REMOTE_PATH%_backup &&
    tar -czf %REMOTE_PATH%_backup/backup_%TIMESTAMP%.tar.gz -C %REMOTE_PATH% . 2>/dev/null || true &&
    rm -rf %REMOTE_PATH%/* &&
    tar -xzf %DEPLOY_PACKAGE% -C %REMOTE_PATH% &&
    cd %REMOTE_PATH% &&
    echo '设置文件权限...' &&
    chmod +x *.py *.sh &&
    echo '安装Python依赖...' &&
    pip3 install flask pandas openpyxl catboost scikit-learn numpy &&
    echo '停止现有服务...' &&
    pkill -f 'python.*api_server' || true &&
    systemctl stop prediction-api-8080 || true &&
    systemctl stop prediction-api-8001 || true &&
    sleep 2 &&
    echo '启动新服务...' &&
    nohup python3 robust_api_server.py --port 8080 > /var/log/prediction-api-8080.log 2>&1 & &&
    nohup python3 robust_api_server.py --port 8001 > /var/log/prediction-api-8001.log 2>&1 & &&
    sleep 3 &&
    echo '验证服务状态...' &&
    curl -s http://localhost:8080/health && echo '' &&
    curl -s http://localhost:8001/health && echo '' &&
    echo '部署完成！'
"

if errorlevel 1 (
    echo [ERROR] 远程部署失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo  🎉 部署完成！
echo ========================================
echo 服务地址:
echo   8080端口: http://%REMOTE_HOST%:8080
echo   8001端口: http://%REMOTE_HOST%:8001
echo.
echo 健康检查:
echo   curl http://%REMOTE_HOST%:8080/health
echo   curl http://%REMOTE_HOST%:8001/health
echo.
echo 查看日志:
echo   ssh %REMOTE_USER%@%REMOTE_HOST% "tail -f /var/log/prediction-api-8080.log"
echo ========================================

:: 清理本地临时文件
del %DEPLOY_PACKAGE%

pause
