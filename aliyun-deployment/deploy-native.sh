#!/bin/bash
# 阿里云服务器原生部署脚本（无Docker）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "开始原生部署预测算法API服务..."

# 检查系统
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
    log_info "检测到非root用户，将使用sudo执行特权命令"
fi

# 检查并安装系统依赖
log_info "检查系统依赖..."
MISSING_PACKAGES=()

# 检查必要的包
REQUIRED_PACKAGES=("python3" "python3-pip" "python3-venv" "nginx" "curl" "wget" "git" "htop")
for pkg in "${REQUIRED_PACKAGES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $pkg "; then
        MISSING_PACKAGES+=("$pkg")
    else
        log_success "$pkg 已安装"
    fi
done

# 只安装缺失的包
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    log_info "安装缺失的系统依赖: ${MISSING_PACKAGES[*]}"
    $SUDO apt update
    $SUDO apt install -y "${MISSING_PACKAGES[@]}"
else
    log_success "所有系统依赖已安装"
fi

# 创建项目用户（如果不存在）
if ! id "prediction" &>/dev/null; then
    log_info "创建项目用户..."
    $SUDO adduser --system --group --disabled-login --home /opt/prediction-service prediction
else
    log_success "用户 prediction 已存在"
fi

# 确保目录权限正确
$SUDO chown -R prediction:prediction /opt/prediction-service
$SUDO chmod 755 /opt/prediction-service

# 检查并创建Python虚拟环境
cd /opt/prediction-service
if [ ! -d "venv" ] || [ ! -f "venv/bin/python" ]; then
    log_info "创建Python虚拟环境..."
    sudo -u prediction python3 -m venv venv
else
    log_success "Python虚拟环境已存在"
fi

# 检查并安装Python依赖
log_info "检查Python依赖包..."
NEED_INSTALL_DEPS=false

# 检查关键依赖是否已安装
KEY_PACKAGES=("flask" "gunicorn" "catboost" "scikit-learn" "pandas" "numpy")
for pkg in "${KEY_PACKAGES[@]}"; do
    if ! sudo -u prediction bash -c "source venv/bin/activate && python -c 'import $pkg' 2>/dev/null"; then
        log_warning "$pkg 未安装或版本不匹配"
        NEED_INSTALL_DEPS=true
        break
    else
        log_success "$pkg 已安装"
    fi
done

# 只在需要时安装依赖
if [ "$NEED_INSTALL_DEPS" = true ]; then
    log_info "安装/更新Python依赖包..."
    sudo -u prediction bash -c "
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r api_requirements.txt
    "
else
    log_success "所有Python依赖已满足"
fi

# 检查模型文件
log_info "检查模型文件..."
if [ ! -f "function/Model_Params/Task3_CatBoost_Model/catboost_model.cbm" ]; then
    log_error "模型文件不存在，请确保function目录完整"
    exit 1
fi
log_success "模型文件检查通过"

# 创建日志目录
log_info "创建日志和运行目录..."
sudo -u prediction mkdir -p logs temp_pdf temp_predictions
$SUDO mkdir -p /var/log/prediction-api
$SUDO ln -sf /opt/prediction-service/logs /var/log/prediction-api/app

# 检查并创建systemd服务文件
if [ ! -f "/etc/systemd/system/prediction-api.service" ]; then
    log_info "创建系统服务..."
    $SUDO tee /etc/systemd/system/prediction-api.service > /dev/null << EOF
[Unit]
Description=Prediction API Service
After=network.target

[Service]
Type=simple
User=prediction
Group=prediction
WorkingDirectory=/opt/prediction-service
Environment=PATH=/opt/prediction-service/venv/bin
Environment=FLASK_ENV=production
Environment=PYTHONPATH=/opt/prediction-service
ExecStart=/opt/prediction-service/venv/bin/gunicorn --bind 127.0.0.1:8000 --workers 2 --threads 2 --worker-class gthread --timeout 300 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 --access-logfile /opt/prediction-service/logs/access.log --error-logfile /opt/prediction-service/logs/error.log prediction_api:app
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
else
    log_success "系统服务配置文件已存在"
fi

# 检查并配置Nginx
if [ ! -f "/etc/nginx/sites-available/prediction-api" ]; then
    log_info "配置Nginx..."
    $SUDO cp nginx-native.conf /etc/nginx/sites-available/prediction-api
else
    log_success "Nginx配置文件已存在"
    # 更新配置文件以防有变化
    log_info "更新Nginx配置..."
    $SUDO cp nginx-native.conf /etc/nginx/sites-available/prediction-api
fi

# 检查并创建软链接
if [ ! -L "/etc/nginx/sites-enabled/prediction-api" ]; then
    log_info "创建Nginx站点链接..."
    $SUDO ln -sf /etc/nginx/sites-available/prediction-api /etc/nginx/sites-enabled/
else
    log_success "Nginx站点链接已存在"
fi

# 删除默认配置（如果存在）
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    log_info "移除默认Nginx配置..."
    $SUDO rm -f /etc/nginx/sites-enabled/default
else
    log_success "默认Nginx配置已移除"
fi

# 测试Nginx配置
if $SUDO nginx -t; then
    log_success "Nginx配置测试通过"
else
    log_error "Nginx配置有误，请检查"
    exit 1
fi

# 启用并启动服务
log_info "启用并启动服务..."
$SUDO systemctl daemon-reload

# 启用服务（如果尚未启用）
if ! $SUDO systemctl is-enabled prediction-api &>/dev/null; then
    log_info "启用prediction-api服务..."
    $SUDO systemctl enable prediction-api
else
    log_success "prediction-api服务已启用"
fi

# 重启或启动服务
if $SUDO systemctl is-active prediction-api &>/dev/null; then
    log_info "重启prediction-api服务..."
    $SUDO systemctl restart prediction-api
else
    log_info "启动prediction-api服务..."
    $SUDO systemctl start prediction-api
fi

if $SUDO systemctl is-active nginx &>/dev/null; then
    log_info "重启nginx服务..."
    $SUDO systemctl restart nginx
else
    log_info "启动nginx服务..."
    $SUDO systemctl start nginx
fi

# 等待服务启动
log_info "等待服务启动..."
sleep 10

# 检查服务状态
log_info "检查服务状态..."
if $SUDO systemctl is-active prediction-api &>/dev/null; then
    log_success "Prediction API服务运行正常"
else
    log_error "Prediction API服务启动失败"
    log_info "查看服务日志："
    $SUDO systemctl status prediction-api --no-pager -l
    exit 1
fi

if $SUDO systemctl is-active nginx &>/dev/null; then
    log_success "Nginx服务运行正常"
else
    log_error "Nginx服务启动失败"
    log_info "查看Nginx日志："
    $SUDO systemctl status nginx --no-pager -l
    exit 1
fi

# 健康检查
log_info "执行健康检查..."
for i in {1..30}; do
    if curl -f http://localhost/health &>/dev/null; then
        log_success "服务健康检查通过！"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "服务健康检查失败，请查看日志"
        log_info "API服务日志："
        $SUDO systemctl status prediction-api --no-pager -l
        log_info "Nginx日志："
        $SUDO tail -20 /var/log/nginx/error.log
        exit 1
    fi
    log_info "等待服务启动... ($i/30)"
    sleep 2
done

# 检查并配置防火墙
log_info "检查防火墙配置..."
if command -v ufw &>/dev/null; then
    # 检查UFW状态
    UFW_STATUS=$($SUDO ufw status | head -1)
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        log_success "UFW防火墙已启用"
        
        # 检查是否已有必要的规则
        UFW_RULES=$($SUDO ufw status numbered)
        NEED_CONFIG=false
        
        if ! echo "$UFW_RULES" | grep -q "22/tcp"; then
            log_info "添加SSH规则..."
            $SUDO ufw allow ssh
            NEED_CONFIG=true
        fi
        
        if ! echo "$UFW_RULES" | grep -q "80/tcp"; then
            log_info "添加HTTP规则..."
            $SUDO ufw allow 80/tcp
            NEED_CONFIG=true
        fi
        
        if ! echo "$UFW_RULES" | grep -q "443/tcp"; then
            log_info "添加HTTPS规则..."
            $SUDO ufw allow 443/tcp
            NEED_CONFIG=true
        fi
        
        if [ "$NEED_CONFIG" = false ]; then
            log_success "防火墙规则已正确配置"
        fi
    else
        log_info "启用UFW防火墙并配置规则..."
        $SUDO ufw --force enable
        $SUDO ufw allow ssh
        $SUDO ufw allow 80/tcp
        $SUDO ufw allow 443/tcp
        log_success "UFW防火墙配置完成"
    fi
else
    log_warning "未检测到UFW防火墙，请手动配置安全组规则"
fi

# 显示服务状态和访问信息
log_success "部署完成！"
echo
echo "服务状态:"
echo "  Prediction API: $($SUDO systemctl is-active prediction-api)"
echo "  Nginx: $($SUDO systemctl is-active nginx)"
echo
echo "访问地址:"
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')
echo "  健康检查: http://$SERVER_IP/health"
echo "  支持的专业: http://$SERVER_IP/api/majors"
echo "  预测接口: http://$SERVER_IP/api/predict"
echo
echo "管理命令:"
echo "  查看API服务状态: sudo systemctl status prediction-api"
echo "  查看API服务日志: sudo journalctl -u prediction-api -f"
echo "  重启API服务: sudo systemctl restart prediction-api"
echo "  重启Nginx: sudo systemctl restart nginx"
echo "  查看Nginx日志: sudo tail -f /var/log/nginx/error.log"
echo
echo "日志文件位置:"
echo "  API日志: /opt/prediction-service/logs/"
echo "  Nginx日志: /var/log/nginx/"
echo

log_success "原生部署脚本执行完成！"
