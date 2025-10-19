#!/bin/bash
# 阿里云服务器依赖安装脚本

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

echo "===== 阿里云服务器依赖安装 ====="

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
    log_info "检测到非root用户，将使用sudo执行特权命令"
fi

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
else
    log_error "无法检测操作系统版本"
    exit 1
fi

log_info "检测到操作系统: $OS $VERSION"

# 更新包管理器
log_info "更新包管理器..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    $SUDO apt update -y
    PACKAGE_MANAGER="apt"
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    $SUDO yum update -y
    PACKAGE_MANAGER="yum"
elif [[ "$OS" == *"Fedora"* ]]; then
    $SUDO dnf update -y
    PACKAGE_MANAGER="dnf"
else
    log_error "不支持的操作系统: $OS"
    exit 1
fi

# 安装基础工具
log_info "安装基础工具..."
if [[ "$PACKAGE_MANAGER" == "apt" ]]; then
    $SUDO apt install -y curl wget git vim unzip htop iotop net-tools
elif [[ "$PACKAGE_MANAGER" == "yum" ]]; then
    $SUDO yum install -y curl wget git vim unzip htop iotop net-tools
elif [[ "$PACKAGE_MANAGER" == "dnf" ]]; then
    $SUDO dnf install -y curl wget git vim unzip htop iotop net-tools
fi

# 安装Docker
log_info "检查Docker安装状态..."
if ! command -v docker &> /dev/null; then
    log_info "安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    $SUDO sh get-docker.sh
    
    # 将当前用户添加到docker组
    $SUDO usermod -aG docker $USER
    
    # 启动Docker服务
    $SUDO systemctl enable docker
    $SUDO systemctl start docker
    
    log_success "Docker安装完成"
    rm -f get-docker.sh
else
    log_success "Docker已安装"
fi

# 检查Docker服务状态
if $SUDO systemctl is-active docker &>/dev/null; then
    log_success "Docker服务运行正常"
else
    log_info "启动Docker服务..."
    $SUDO systemctl start docker
fi

# 安装Docker Compose
log_info "检查Docker Compose安装状态..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_info "安装Docker Compose..."
    
    # 获取最新版本
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
    
    # 下载并安装
    $SUDO curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    $SUDO ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose安装完成"
else
    log_success "Docker Compose已安装"
fi

# 安装Python（用于本地测试）
log_info "检查Python安装状态..."
if ! command -v python3 &> /dev/null; then
    log_info "安装Python3..."
    if [[ "$PACKAGE_MANAGER" == "apt" ]]; then
        $SUDO apt install -y python3 python3-pip python3-venv
    elif [[ "$PACKAGE_MANAGER" == "yum" ]]; then
        $SUDO yum install -y python3 python3-pip
    elif [[ "$PACKAGE_MANAGER" == "dnf" ]]; then
        $SUDO dnf install -y python3 python3-pip
    fi
    log_success "Python3安装完成"
else
    log_success "Python3已安装"
fi

# 配置防火墙
log_info "配置防火墙..."
if command -v ufw &>/dev/null; then
    # Ubuntu/Debian UFW
    log_info "配置UFW防火墙..."
    $SUDO ufw --force enable
    $SUDO ufw allow ssh
    $SUDO ufw allow 80/tcp
    $SUDO ufw allow 443/tcp
    log_success "UFW防火墙配置完成"
elif command -v firewall-cmd &>/dev/null; then
    # CentOS/RHEL firewalld
    log_info "配置firewalld防火墙..."
    $SUDO systemctl enable firewalld
    $SUDO systemctl start firewalld
    $SUDO firewall-cmd --permanent --zone=public --add-service=ssh
    $SUDO firewall-cmd --permanent --zone=public --add-service=http
    $SUDO firewall-cmd --permanent --zone=public --add-service=https
    $SUDO firewall-cmd --reload
    log_success "firewalld防火墙配置完成"
else
    log_warning "未检测到防火墙，请手动配置安全组规则"
fi

# 优化系统参数
log_info "优化系统参数..."

# 创建系统优化配置
cat << EOF | $SUDO tee /etc/sysctl.d/99-prediction-api.conf > /dev/null
# 网络优化
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.tcp_keepalive_probes = 5

# 文件描述符限制
fs.file-max = 65535

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

# 应用系统参数
$SUDO sysctl -p /etc/sysctl.d/99-prediction-api.conf

# 配置用户限制
cat << EOF | $SUDO tee /etc/security/limits.d/99-prediction-api.conf > /dev/null
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
EOF

log_success "系统参数优化完成"

# 创建项目目录结构
log_info "创建项目目录结构..."
mkdir -p logs nginx/logs static scripts

# 设置目录权限
chmod 755 logs nginx/logs static
chmod +x scripts/*.sh 2>/dev/null || true

log_success "项目目录结构创建完成"

# 安装常用监控工具
log_info "安装监控工具..."
if [[ "$PACKAGE_MANAGER" == "apt" ]]; then
    $SUDO apt install -y htop iotop nethogs ncdu tree
elif [[ "$PACKAGE_MANAGER" == "yum" ]]; then
    $SUDO yum install -y htop iotop nethogs ncdu tree
elif [[ "$PACKAGE_MANAGER" == "dnf" ]]; then
    $SUDO dnf install -y htop iotop nethogs ncdu tree
fi

# 配置logrotate（日志轮转）
log_info "配置日志轮转..."
cat << EOF | $SUDO tee /etc/logrotate.d/prediction-api > /dev/null
/opt/prediction-service/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f /opt/prediction-service/docker-compose.yml restart nginx 2>/dev/null || true
    endscript
}
EOF

log_success "日志轮转配置完成"

echo
echo "===== 安装总结 ====="
log_success "所有依赖安装完成！"

echo
echo "已安装的组件："
echo "- Docker: $(docker --version 2>/dev/null || echo '未安装')"
echo "- Docker Compose: $(docker-compose --version 2>/dev/null || docker compose version 2>/dev/null || echo '未安装')"
echo "- Python3: $(python3 --version 2>/dev/null || echo '未安装')"

echo
echo "下一步："
echo "1. 重新登录或运行 'newgrp docker' 以应用docker组权限"
echo "2. 上传项目文件到服务器"
echo "3. 运行 './scripts/check-environment.sh' 检查环境"
echo "4. 运行 './deploy.sh' 开始部署"

if [[ $EUID -ne 0 ]] && ! groups $USER | grep -q docker; then
    log_warning "请重新登录以应用docker组权限，或运行: newgrp docker"
fi

log_success "依赖安装脚本执行完成！"
