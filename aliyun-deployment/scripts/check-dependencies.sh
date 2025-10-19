#!/bin/bash
# 部署前依赖检查脚本

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

echo "部署环境检查"
echo "============="

# 检查系统包
log_info "检查系统依赖包..."
REQUIRED_PACKAGES=("python3" "python3-pip" "python3-venv" "nginx" "curl" "wget" "git" "htop")
MISSING_PACKAGES=()

for pkg in "${REQUIRED_PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii  $pkg "; then
        log_success "✓ $pkg"
    else
        log_warning "✗ $pkg (需要安装)"
        MISSING_PACKAGES+=("$pkg")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo "  需要安装: ${MISSING_PACKAGES[*]}"
else
    echo "  所有系统包已安装"
fi

# 检查用户
log_info "检查用户账户..."
if id "prediction" &>/dev/null; then
    log_success "✓ prediction 用户存在"
else
    log_warning "✗ prediction 用户 (将自动创建)"
fi

# 检查Python虚拟环境
log_info "检查Python虚拟环境..."
if [ -d "/opt/prediction-service/venv" ] && [ -f "/opt/prediction-service/venv/bin/python" ]; then
    log_success "✓ Python虚拟环境存在"
    
    # 检查Python包
    log_info "检查Python依赖包..."
    KEY_PACKAGES=("flask" "gunicorn" "catboost" "scikit-learn" "pandas" "numpy")
    MISSING_PY_PACKAGES=()
    
    for pkg in "${KEY_PACKAGES[@]}"; do
        if sudo -u prediction bash -c "source /opt/prediction-service/venv/bin/activate && python -c 'import $pkg' 2>/dev/null"; then
            log_success "✓ $pkg"
        else
            log_warning "✗ $pkg (需要安装)"
            MISSING_PY_PACKAGES+=("$pkg")
        fi
    done
    
    if [ ${#MISSING_PY_PACKAGES[@]} -gt 0 ]; then
        echo "  需要安装Python包: ${MISSING_PY_PACKAGES[*]}"
    else
        echo "  所有Python依赖已安装"
    fi
else
    log_warning "✗ Python虚拟环境 (将自动创建)"
fi

# 检查模型文件
log_info "检查模型文件..."
if [ -f "/opt/prediction-service/function/Model_Params/Task3_CatBoost_Model/catboost_model.cbm" ]; then
    log_success "✓ CatBoost模型文件存在"
else
    log_error "✗ 模型文件缺失，请确保function目录完整"
fi

# 检查系统服务
log_info "检查系统服务..."
if [ -f "/etc/systemd/system/prediction-api.service" ]; then
    log_success "✓ 系统服务配置存在"
    
    if systemctl is-enabled prediction-api &>/dev/null; then
        log_success "✓ 服务已启用"
    else
        log_warning "✗ 服务未启用 (将自动启用)"
    fi
    
    if systemctl is-active prediction-api &>/dev/null; then
        log_success "✓ 服务正在运行"
    else
        log_warning "✗ 服务未运行 (将自动启动)"
    fi
else
    log_warning "✗ 系统服务配置 (将自动创建)"
fi

# 检查Nginx配置
log_info "检查Nginx配置..."
if [ -f "/etc/nginx/sites-available/prediction-api" ]; then
    log_success "✓ Nginx配置文件存在"
else
    log_warning "✗ Nginx配置文件 (将自动创建)"
fi

if [ -L "/etc/nginx/sites-enabled/prediction-api" ]; then
    log_success "✓ Nginx站点已启用"
else
    log_warning "✗ Nginx站点未启用 (将自动启用)"
fi

if systemctl is-active nginx &>/dev/null; then
    log_success "✓ Nginx正在运行"
else
    log_warning "✗ Nginx未运行 (将自动启动)"
fi

# 检查防火墙
log_info "检查防火墙配置..."
if command -v ufw &>/dev/null; then
    UFW_STATUS=$(sudo ufw status | head -1)
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        log_success "✓ UFW防火墙已启用"
        
        UFW_RULES=$(sudo ufw status numbered)
        if echo "$UFW_RULES" | grep -q "80/tcp" && echo "$UFW_RULES" | grep -q "22/tcp"; then
            log_success "✓ 防火墙规则已配置"
        else
            log_warning "✗ 防火墙规则不完整 (将自动配置)"
        fi
    else
        log_warning "✗ UFW防火墙未启用 (将自动启用)"
    fi
else
    log_warning "! 未检测到UFW防火墙"
fi

# 检查端口占用
log_info "检查端口占用..."
if ss -tuln | grep -q ":80 "; then
    log_warning "! 端口80已被占用"
    ss -tuln | grep ":80 " | head -1 | sed 's/^/  /'
else
    log_success "✓ 端口80可用"
fi

if ss -tuln | grep -q ":8000 "; then
    log_warning "! 端口8000已被占用"
    ss -tuln | grep ":8000 " | head -1 | sed 's/^/  /'
else
    log_success "✓ 端口8000可用"
fi

echo
echo "检查总结："
echo "=========="

# 计算总体状态
TOTAL_CHECKS=0
READY_CHECKS=0

# 系统包检查
if [ ${#MISSING_PACKAGES[@]} -eq 0 ]; then
    ((READY_CHECKS++))
fi
((TOTAL_CHECKS++))

# 用户检查
if id "prediction" &>/dev/null; then
    ((READY_CHECKS++))
fi
((TOTAL_CHECKS++))

# 虚拟环境检查
if [ -d "/opt/prediction-service/venv" ]; then
    ((READY_CHECKS++))
fi
((TOTAL_CHECKS++))

# 模型文件检查
if [ -f "/opt/prediction-service/function/Model_Params/Task3_CatBoost_Model/catboost_model.cbm" ]; then
    ((READY_CHECKS++))
else
    log_error "严重：模型文件缺失，部署将失败"
fi
((TOTAL_CHECKS++))

echo "就绪状态: $READY_CHECKS/$TOTAL_CHECKS"

if [ $READY_CHECKS -eq $TOTAL_CHECKS ]; then
    log_success "环境已完全就绪，可以快速部署！"
    echo "建议运行: ./deploy-native.sh"
elif [ $READY_CHECKS -gt $((TOTAL_CHECKS/2)) ]; then
    log_info "环境部分就绪，部署将跳过已有组件"
    echo "可以运行: ./deploy-native.sh"
else
    log_warning "环境需要较多配置，首次部署可能需要较长时间"
    echo "运行: ./deploy-native.sh"
fi

echo
log_info "优化部署脚本特性："
echo "- 智能检查已有依赖，避免重复安装"
echo "- 支持增量更新，可重复执行"
echo "- 自动跳过已配置的组件"
echo "- 提供详细的部署日志"
