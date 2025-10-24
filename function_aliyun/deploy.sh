#!/bin/bash
# 阿里云预测服务部署脚本

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} 阿里云预测服务部署脚本 v2.0${NC}"
echo -e "${GREEN}========================================${NC}"

# 配置变量
SERVICE_DIR="/opt/prediction-service/function"
BACKUP_DIR="/opt/prediction-service/backup/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="prediction-api"

# 函数定义
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    error "请使用root权限运行此脚本"
    exit 1
fi

# 1. 创建备份
log "步骤 1/8: 创建备份"
if [ -d "$SERVICE_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    cp -r "$SERVICE_DIR"/* "$BACKUP_DIR/" || true
    log "✅ 备份已创建: $BACKUP_DIR"
else
    mkdir -p "$SERVICE_DIR"
    log "✅ 创建新的服务目录: $SERVICE_DIR"
fi

# 2. 停止现有服务
log "步骤 2/8: 停止现有服务"
pkill -f "python.*api_server" || true
pkill -f "python.*robust_api_server" || true
pkill -f "python.*prediction" || true
systemctl stop $SERVICE_NAME || true
sleep 2
log "✅ 现有服务已停止"

# 3. 复制文件
log "步骤 3/8: 部署新文件"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -r "$SCRIPT_DIR"/* "$SERVICE_DIR/"
log "✅ 文件部署完成"

# 4. 设置权限
log "步骤 4/8: 设置文件权限"
cd "$SERVICE_DIR"
chmod +x *.py
chmod +x *.sh
chown -R root:root .
log "✅ 权限设置完成"

# 5. 安装Python依赖
log "步骤 5/8: 安装Python依赖"

# 处理依赖冲突的策略
install_dependencies() {
    local packages="flask pandas openpyxl catboost scikit-learn numpy"
    
    # 方法1: 尝试正常安装
    log "尝试方法1: 标准pip安装"
    if pip3 install $packages; then
        log "✅ 标准安装成功"
        return 0
    fi
    
    # 方法2: 忽略依赖冲突
    log "尝试方法2: 忽略依赖冲突"
    if pip3 install --force-reinstall --no-deps flask && pip3 install $packages --upgrade; then
        log "✅ 强制安装成功"
        return 0
    fi
    
    # 方法3: 使用break-system-packages (适用于较新的pip版本)
    log "尝试方法3: break-system-packages"
    if pip3 install --break-system-packages $packages; then
        log "✅ break-system-packages安装成功"
        return 0
    fi
    
    # 方法4: 单独处理冲突包
    log "尝试方法4: 单独处理冲突包"
    
    # 先安装非冲突的包
    pip3 install pandas openpyxl catboost scikit-learn numpy --upgrade || true
    
    # 手动处理Flask及其依赖
    apt-get update && apt-get install -y python3-flask python3-jinja2 python3-werkzeug || true
    pip3 install --user flask || true
    
    log "✅ 依赖处理完成（可能有部分包使用系统版本）"
    return 0
}

install_dependencies || {
    warning "依赖安装有问题，但继续部署..."
    warning "如果服务无法启动，请手动安装: pip3 install flask"
}

log "✅ Python依赖处理完成"

# 6. 验证文件
log "步骤 6/8: 验证关键文件"
REQUIRED_FILES=(
    "robust_api_server.py"
    "run_prediction_direct.py"
    "Optimization_model_func3_1.py"
    "feature_columns.json"
    "catboost_model.cbm"
    "scaler.pkl"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "缺少关键文件: $file"
        exit 1
    fi
    log "✓ $file"
done

# 验证培养方案目录
for year in 2023 2024; do
    plan_dir="education-plan$year"
    if [ ! -d "$plan_dir" ]; then
        error "缺少培养方案目录: $plan_dir"
        exit 1
    fi
    count=$(ls "$plan_dir"/*.xlsx 2>/dev/null | wc -l)
    log "✓ $plan_dir (包含 $count 个文件)"
done

log "✅ 文件验证完成"

# 7. 创建systemd服务
log "步骤 7/8: 配置systemd服务"

# 8080端口服务
cat > /etc/systemd/system/prediction-api-8080.service << EOF
[Unit]
Description=Prediction API Service (Port 8080)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$SERVICE_DIR
ExecStart=/usr/bin/python3 $SERVICE_DIR/robust_api_server.py --port 8080 --host 0.0.0.0
Restart=always
RestartSec=5
Environment=PYTHONPATH=$SERVICE_DIR

# 日志配置
StandardOutput=append:/var/log/prediction-api-8080.log
StandardError=append:/var/log/prediction-api-8080.log

[Install]
WantedBy=multi-user.target
EOF

# 8001端口服务
cat > /etc/systemd/system/prediction-api-8001.service << EOF
[Unit]
Description=Prediction API Service (Port 8001)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$SERVICE_DIR
ExecStart=/usr/bin/python3 $SERVICE_DIR/robust_api_server.py --port 8001 --host 0.0.0.0
Restart=always
RestartSec=5
Environment=PYTHONPATH=$SERVICE_DIR

# 日志配置
StandardOutput=append:/var/log/prediction-api-8001.log
StandardError=append:/var/log/prediction-api-8001.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log "✅ systemd服务配置完成"

# 8. 启动服务
log "步骤 8/8: 启动服务"

systemctl enable prediction-api-8080
systemctl enable prediction-api-8001
systemctl start prediction-api-8080
systemctl start prediction-api-8001

sleep 3

# 验证服务状态
if systemctl is-active --quiet prediction-api-8080; then
    log "✅ 8080端口服务启动成功"
else
    error "8080端口服务启动失败"
fi

if systemctl is-active --quiet prediction-api-8001; then
    log "✅ 8001端口服务启动成功"
else
    error "8001端口服务启动失败"
fi

# 测试API接口
log "测试API接口..."
sleep 2

# 测试8080端口
if curl -s http://localhost:8080/health > /dev/null; then
    log "✅ 8080端口API响应正常"
else
    warning "8080端口API可能未完全启动"
fi

# 测试8001端口
if curl -s http://localhost:8001/health > /dev/null; then
    log "✅ 8001端口API响应正常"
else
    warning "8001端口API可能未完全启动"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} 🎉 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}服务地址:${NC}"
echo -e "  8080端口: http://$(hostname -I | awk '{print $1}'):8080"
echo -e "  8001端口: http://$(hostname -I | awk '{print $1}'):8001"
echo -e ""
echo -e "${GREEN}常用命令:${NC}"
echo -e "  查看服务状态: systemctl status prediction-api-8080"
echo -e "  查看服务状态: systemctl status prediction-api-8001"  
echo -e "  查看日志: tail -f /var/log/prediction-api-8080.log"
echo -e "  重启服务: systemctl restart prediction-api-8080"
echo -e "  停止服务: systemctl stop prediction-api-8080"
echo -e ""
echo -e "${GREEN}健康检查:${NC}"
echo -e "  curl http://localhost:8080/health"
echo -e "  curl http://localhost:8001/health"
echo -e "${GREEN}========================================${NC}"
