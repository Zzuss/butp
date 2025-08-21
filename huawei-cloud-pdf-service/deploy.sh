#!/bin/bash

# 华为云PDF服务一键部署脚本

set -e

echo "🚀 开始部署华为云PDF服务..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查系统要求
check_requirements() {
    print_status "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "此脚本仅支持Linux系统"
        exit 1
    fi
    
    # 检查内存
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$MEMORY_GB" -lt 2 ]; then
        print_warning "建议至少2GB内存，当前: ${MEMORY_GB}GB"
    fi
    
    # 检查磁盘空间
    DISK_GB=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$DISK_GB" -lt 10 ]; then
        print_warning "建议至少10GB可用空间，当前: ${DISK_GB}GB"
    fi
    
    print_success "系统检查完成"
}

# 安装Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_status "Docker已安装，跳过安装步骤"
        return
    fi
    
    print_status "安装Docker..."
    
    # 更新包索引
    sudo apt-get update
    
    # 安装必要的包
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加Docker官方GPG密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 添加Docker仓库
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 更新包索引并安装Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER
    
    print_success "Docker安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_status "Docker Compose已安装，跳过安装步骤"
        return
    fi
    
    print_status "安装Docker Compose..."
    
    # 下载Docker Compose
    COMPOSE_VERSION="v2.21.0"
    sudo curl -L "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose安装完成"
}

# 配置防火墙
configure_firewall() {
    print_status "配置防火墙..."
    
    # 检查ufw是否安装
    if ! command -v ufw &> /dev/null; then
        sudo apt-get install -y ufw
    fi
    
    # 配置防火墙规则
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    
    # 启用防火墙（如果未启用）
    echo "y" | sudo ufw enable 2>/dev/null || true
    
    print_success "防火墙配置完成"
}

# 创建SSL证书目录
setup_ssl() {
    print_status "设置SSL证书目录..."
    
    mkdir -p ssl
    mkdir -p logs/nginx
    
    if [[ ! -f "ssl/cert.pem" || ! -f "ssl/key.pem" ]]; then
        print_warning "SSL证书不存在，生成自签名证书..."
        
        # 生成自签名证书
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=BUTP/OU=PDF Service/CN=pdf.butp.tech"
        
        print_warning "请在华为云控制台申请正式SSL证书并替换ssl/目录下的文件"
    fi
    
    print_success "SSL设置完成"
}

# 配置环境变量
setup_environment() {
    print_status "配置环境变量..."
    
    if [[ ! -f ".env" ]]; then
        # 生成随机API密钥
        API_KEY="huawei-pdf-2024-$(date +%s)-$(openssl rand -hex 8)"
        
        # 创建.env文件
        cat > .env << EOF
NODE_ENV=production
PORT=3000
PDF_SERVICE_KEY=${API_KEY}
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
LOG_LEVEL=info
DOMAIN=pdf.butp.tech
EOF
        
        print_success "环境变量配置完成"
        print_warning "API密钥: ${API_KEY}"
        print_warning "请记录此密钥，用于前端配置"
    else
        print_status "环境变量文件已存在，跳过创建"
    fi
}

# 构建和启动服务
start_services() {
    print_status "构建和启动服务..."
    
    # 构建镜像
    docker-compose build
    
    # 启动服务
    docker-compose up -d
    
    # 等待服务启动
    print_status "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_success "服务启动成功"
    else
        print_error "服务启动失败"
        docker-compose logs
        exit 1
    fi
}

# 健康检查
health_check() {
    print_status "执行健康检查..."
    
    # 检查HTTP健康检查
    if curl -f http://localhost:3000/health &>/dev/null; then
        print_success "HTTP健康检查通过"
    else
        print_error "HTTP健康检查失败"
    fi
    
    # 检查HTTPS健康检查（如果配置了SSL）
    if curl -k -f https://localhost/health &>/dev/null; then
        print_success "HTTPS健康检查通过"
    else
        print_warning "HTTPS健康检查失败，请检查SSL配置"
    fi
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "🎉 华为云PDF服务部署完成！"
    echo ""
    echo "📋 服务信息:"
    echo "  - HTTP端口: 80"
    echo "  - HTTPS端口: 443"
    echo "  - 内部端口: 3000"
    echo ""
    echo "🔗 访问地址:"
    echo "  - 健康检查: https://pdf.butp.tech/health"
    echo "  - 服务信息: https://pdf.butp.tech/info"
    echo "  - PDF生成: https://pdf.butp.tech/generate-pdf"
    echo ""
    echo "📊 管理命令:"
    echo "  - 查看状态: docker-compose ps"
    echo "  - 查看日志: docker-compose logs -f"
    echo "  - 重启服务: docker-compose restart"
    echo "  - 停止服务: docker-compose down"
    echo ""
    echo "⚠️  注意事项:"
    echo "  1. 请在华为云控制台配置域名解析"
    echo "  2. 申请正式SSL证书并替换ssl/目录下的文件"
    echo "  3. 在华为云控制台配置安全组规则（开放80和443端口）"
    echo "  4. 更新前端配置中的PDF服务地址"
    echo ""
    
    # 显示API密钥
    if [[ -f ".env" ]]; then
        API_KEY=$(grep PDF_SERVICE_KEY .env | cut -d= -f2)
        echo "🔑 API密钥: ${API_KEY}"
        echo "   请在前端代码中使用此密钥"
    fi
}

# 主函数
main() {
    echo "华为云PDF服务部署脚本 v1.0"
    echo "=================================="
    
    check_requirements
    install_docker
    install_docker_compose
    configure_firewall
    setup_ssl
    setup_environment
    start_services
    health_check
    show_deployment_info
    
    print_success "部署完成！"
}

# 检查是否有参数
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "华为云PDF服务部署脚本"
    echo ""
    echo "用法: bash deploy.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h     显示帮助信息"
    echo "  --update       更新服务"
    echo "  --stop         停止服务"
    echo "  --logs         查看日志"
    echo ""
    exit 0
elif [[ "$1" == "--update" ]]; then
    print_status "更新服务..."
    docker-compose pull
    docker-compose up -d --build
    print_success "服务更新完成"
    exit 0
elif [[ "$1" == "--stop" ]]; then
    print_status "停止服务..."
    docker-compose down
    print_success "服务已停止"
    exit 0
elif [[ "$1" == "--logs" ]]; then
    docker-compose logs -f
    exit 0
fi

# 执行主函数
main
