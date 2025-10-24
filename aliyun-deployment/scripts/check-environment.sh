#!/bin/bash
# 环境检查脚本

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

echo "===== 阿里云服务器环境检查 ====="

# 检查系统信息
log_info "检查系统信息..."
echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "内核版本: $(uname -r)"
echo "CPU信息: $(nproc) cores"
echo "内存信息: $(free -h | grep Mem | awk '{print $2}')"
echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}') 可用"

# 检查网络
log_info "检查网络连接..."
if ping -c 1 google.com &>/dev/null; then
    log_success "外网连接正常"
else
    log_warning "外网连接异常，可能影响依赖包下载"
fi

# 检查Docker
log_info "检查Docker..."
if command -v docker &>/dev/null; then
    echo "Docker版本: $(docker --version)"
    if systemctl is-active docker &>/dev/null; then
        log_success "Docker服务运行正常"
    else
        log_error "Docker服务未运行"
    fi
    
    # 检查Docker存储空间
    DOCKER_ROOT=$(docker system info --format '{{.DockerRootDir}}' 2>/dev/null || echo "/var/lib/docker")
    DOCKER_SPACE=$(df -h "$DOCKER_ROOT" | tail -1 | awk '{print $4}')
    echo "Docker存储空间: $DOCKER_SPACE 可用"
else
    log_error "Docker未安装"
fi

# 检查docker-compose
log_info "检查Docker Compose..."
if command -v docker-compose &>/dev/null; then
    echo "docker-compose版本: $(docker-compose --version)"
    log_success "docker-compose已安装"
elif docker compose version &>/dev/null; then
    echo "docker compose版本: $(docker compose version)"
    log_success "docker compose插件已安装"
else
    log_error "docker-compose未安装"
fi

# 检查Python（用于本地测试）
log_info "检查Python环境..."
if command -v python3 &>/dev/null; then
    echo "Python版本: $(python3 --version)"
    if command -v pip3 &>/dev/null; then
        echo "pip版本: $(pip3 --version)"
        log_success "Python环境正常"
    else
        log_warning "pip3未安装"
    fi
else
    log_warning "Python3未安装（仅用于本地测试）"
fi

# 检查端口占用
log_info "检查端口占用..."
PORTS=(80 443 8000)
for port in "${PORTS[@]}"; do
    if ss -tuln | grep ":$port " &>/dev/null; then
        log_warning "端口 $port 已被占用"
        echo "占用进程: $(ss -tulnp | grep ":$port " | awk '{print $7}')"
    else
        log_success "端口 $port 可用"
    fi
done

# 检查防火墙
log_info "检查防火墙状态..."
if command -v ufw &>/dev/null; then
    UFW_STATUS=$(ufw status | head -1 | awk '{print $2}')
    echo "UFW状态: $UFW_STATUS"
    if [ "$UFW_STATUS" = "active" ]; then
        log_info "UFW规则:"
        ufw status numbered | grep -E "(80|443|22)"
    fi
elif command -v firewall-cmd &>/dev/null; then
    if systemctl is-active firewalld &>/dev/null; then
        echo "firewalld状态: active"
        log_info "开放的端口:"
        firewall-cmd --list-ports
    else
        echo "firewalld状态: inactive"
    fi
else
    log_info "未检测到常见防火墙"
fi

# 检查SSL证书（如果存在）
log_info "检查SSL证书..."
if [ -d "nginx/ssl" ] && [ -f "nginx/ssl/cert.pem" ]; then
    CERT_EXPIRE=$(openssl x509 -in nginx/ssl/cert.pem -noout -dates 2>/dev/null | grep "notAfter" | cut -d'=' -f2)
    if [ -n "$CERT_EXPIRE" ]; then
        log_success "SSL证书存在，过期时间: $CERT_EXPIRE"
    else
        log_warning "SSL证书文件存在但可能无效"
    fi
else
    log_info "未配置SSL证书"
fi

# 检查必要文件
log_info "检查项目文件..."
PROJECT_FILES=(
    "prediction_api.py"
    "api_requirements.txt"
    "Dockerfile"
    "docker-compose.yml"
    "nginx/nginx.conf"
    "nginx/conf.d/prediction-api.conf"
    "function/Optimization_model_func3_1.py"
    "function/Model_Params/Task3_CatBoost_Model/catboost_model.cbm"
)

ALL_FILES_OK=true
for file in "${PROJECT_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "✓ $file"
    else
        log_error "✗ $file (缺失)"
        ALL_FILES_OK=false
    fi
done

# 检查模型文件大小
log_info "检查模型文件..."
MODEL_DIR="function/Model_Params/Task3_CatBoost_Model"
if [ -d "$MODEL_DIR" ]; then
    MODEL_SIZE=$(du -sh "$MODEL_DIR" 2>/dev/null | cut -f1)
    echo "模型目录大小: $MODEL_SIZE"
    
    # 列出模型文件
    find "$MODEL_DIR" -type f -name "*.cbm" -o -name "*.pkl" -o -name "*.json" | while read -r file; do
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "  $file ($size)"
    done
fi

echo
echo "===== 检查总结 ====="
if $ALL_FILES_OK && command -v docker &>/dev/null; then
    log_success "环境检查通过，可以开始部署！"
    echo "建议执行: ./deploy.sh"
else
    log_warning "环境检查发现问题，请先解决后再部署"
    if ! command -v docker &>/dev/null; then
        echo "1. 安装Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    fi
    if ! $ALL_FILES_OK; then
        echo "2. 确保所有项目文件已上传到服务器"
    fi
fi

echo
echo "如需安装缺失组件，请运行: ./scripts/install-dependencies.sh"
