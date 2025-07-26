#!/bin/bash

# CAS认证系统构建和部署脚本
# 使用方法: bash build-and-deploy.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="butp"
BUILD_DIR=".next"
DIST_DIR="dist"
DEPLOY_USER="bupt"
DEPLOY_HOST="butp.tech"
DEPLOY_PATH="/var/www/butp"
PM2_APP_NAME="butp-app"

# 打印彩色消息
print_info() {
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

# 检查依赖
check_dependencies() {
    print_info "检查构建依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js未安装"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "npm未安装" 
        exit 1
    fi
    
    print_success "构建环境检查通过"
    print_info "Node.js版本: $(node -v)"
    print_info "npm版本: $(npm -v)"
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."
    
    # 清理node_modules（可选）
    if [ "$1" == "--clean" ]; then
        print_info "清理现有依赖..."
        rm -rf node_modules package-lock.json
    fi
    
    # 安装依赖
    npm install --production=false
    
    print_success "依赖安装完成"
}

# 环境配置检查
check_environment() {
    print_info "检查环境配置..."
    
    # 检查.env.local文件
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local文件不存在，将创建默认配置"
        
        cat > .env.local << 'EOF'
# 生产环境配置 - CAS认证系统
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://butp.tech
CAS_MODE=real
SESSION_SECRET_KEY=butp-production-secret-key-2024-cas-auth-very-secure-random-string
NEXT_TELEMETRY_DISABLED=1

# 请配置以下Supabase信息
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EOF
        print_warning "请编辑.env.local文件，配置正确的Supabase信息"
        print_info "文件位置: $(pwd)/.env.local"
    fi
    
    # 检查关键环境变量
    source .env.local
    
    if [[ "$NEXT_PUBLIC_SUPABASE_URL" == *"your-project-ref"* ]]; then
        print_error "请配置正确的NEXT_PUBLIC_SUPABASE_URL"
        print_info "编辑.env.local文件，设置正确的Supabase URL"
        exit 1
    fi
    
    if [[ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" == *"your-supabase-anon-key"* ]]; then
        print_error "请配置正确的NEXT_PUBLIC_SUPABASE_ANON_KEY"
        print_info "编辑.env.local文件，设置正确的Supabase匿名密钥"
        exit 1
    fi
    
    print_success "环境配置检查通过"
}

# 构建项目
build_project() {
    print_info "开始构建Next.js项目..."
    
    # 设置生产环境
    export NODE_ENV=production
    
    # 清理之前的构建
    if [ -d "$BUILD_DIR" ]; then
        print_info "清理之前的构建文件..."
        rm -rf $BUILD_DIR
    fi
    
    # 运行构建
    print_info "执行npm run build..."
    npm run build
    
    # 检查构建结果
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "构建失败，$BUILD_DIR目录不存在"
        exit 1
    fi
    
    print_success "项目构建完成"
    
    # 显示构建信息
    print_info "构建文件大小:"
    du -sh $BUILD_DIR
}

# 创建部署包
create_deployment_package() {
    print_info "创建部署包..."
    
    # 创建部署目录
    rm -rf $DIST_DIR
    mkdir -p $DIST_DIR
    
    # 复制必要文件
    print_info "复制文件到部署包..."
    
    # 复制构建文件
    cp -r $BUILD_DIR $DIST_DIR/
    
    # 复制项目文件
    cp package.json $DIST_DIR/
    cp package-lock.json $DIST_DIR/
    cp next.config.ts $DIST_DIR/
    cp -r public $DIST_DIR/
    
    # 复制应用文件
    cp -r app $DIST_DIR/
    cp -r components $DIST_DIR/
    cp -r contexts $DIST_DIR/
    cp -r lib $DIST_DIR/
    cp middleware.ts $DIST_DIR/
    
    # 复制环境配置
    cp .env.local $DIST_DIR/
    cp .env.production $DIST_DIR/
    
    # 创建启动脚本
    cat > $DIST_DIR/start-production.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
npm start
EOF
    chmod +x $DIST_DIR/start-production.sh
    
    # 创建PM2配置
    cat > $DIST_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'butp-app',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
    
    print_success "部署包创建完成: $DIST_DIR/"
    
    # 显示包大小
    print_info "部署包大小:"
    du -sh $DIST_DIR
}

# 压缩部署包
compress_package() {
    print_info "压缩部署包..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local package_name="${PROJECT_NAME}_${timestamp}.tar.gz"
    
    tar -czf $package_name -C $DIST_DIR .
    
    print_success "部署包压缩完成: $package_name"
    print_info "压缩包大小: $(du -sh $package_name | cut -f1)"
    
    echo $package_name
}

# 上传到服务器
upload_to_server() {
    local package_file=$1
    
    print_info "上传部署包到服务器..."
    
    # 检查SSH连接
    if ! ssh -o ConnectTimeout=10 $DEPLOY_USER@$DEPLOY_HOST "echo 'SSH连接正常'" &> /dev/null; then
        print_error "无法连接到服务器 $DEPLOY_USER@$DEPLOY_HOST"
        print_info "请检查:"
        print_info "1. 服务器地址是否正确"
        print_info "2. SSH密钥是否配置"
        print_info "3. 网络连接是否正常"
        exit 1
    fi
    
    # 上传文件
    print_info "正在上传 $package_file..."
    scp $package_file $DEPLOY_USER@$DEPLOY_HOST:/tmp/
    
    print_success "文件上传完成"
}

# 服务器部署
deploy_on_server() {
    local package_file=$1
    local package_name=$(basename $package_file)
    
    print_info "在服务器上部署应用..."
    
    # 在服务器上执行部署命令
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
set -e

echo "=== 开始服务器端部署 ==="

# 创建部署目录
sudo mkdir -p $DEPLOY_PATH
sudo chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH

# 备份现有版本
if [ -d "$DEPLOY_PATH/current" ]; then
    echo "备份现有版本..."
    sudo mv $DEPLOY_PATH/current $DEPLOY_PATH/backup_\$(date +%Y%m%d_%H%M%S)
fi

# 解压新版本
echo "解压新版本..."
cd $DEPLOY_PATH
tar -xzf /tmp/$package_name
mkdir -p logs

# 安装生产依赖
echo "安装生产依赖..."
npm install --production --no-optional

# 停止现有进程
echo "停止现有进程..."
pm2 stop $PM2_APP_NAME || echo "没有找到运行中的进程"
pm2 delete $PM2_APP_NAME || echo "没有找到已注册的进程"

# 启动新进程
echo "启动新进程..."
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup | grep -v "sudo" | grep -v "systemctl" || true

echo "=== 服务器端部署完成 ==="

# 检查服务状态
echo "检查服务状态..."
pm2 status $PM2_APP_NAME

# 健康检查
echo "健康检查..."
sleep 5
curl -f http://localhost:3000/health || echo "健康检查失败，请查看日志"

EOF
    
    print_success "服务器部署完成"
}

# 验证部署
verify_deployment() {
    print_info "验证部署结果..."
    
    # 检查网站是否可访问
    print_info "检查网站访问..."
    if curl -f -s https://butp.tech/health > /dev/null; then
        print_success "网站健康检查通过"
    else
        print_warning "网站健康检查失败，请检查服务状态"
    fi
    
    # 检查CAS登录流程
    print_info "检查CAS登录重定向..."
    local redirect_url=$(curl -s -I "https://butp.tech/dashboard" | grep -i location | cut -d' ' -f2 | tr -d '\r')
    if [[ "$redirect_url" == *"auth.bupt.edu.cn"* ]]; then
        print_success "CAS登录重定向正常"
    else
        print_warning "CAS登录重定向可能有问题: $redirect_url"
    fi
    
    print_info "部署验证完成"
}

# 清理临时文件
cleanup() {
    print_info "清理临时文件..."
    
    # 清理构建文件
    rm -rf $DIST_DIR
    
    # 清理压缩包（可选）
    if [ "$1" != "--keep-package" ]; then
        rm -f ${PROJECT_NAME}_*.tar.gz
    fi
    
    print_success "清理完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     部署完成                                ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  项目名称: $PROJECT_NAME                                      ║"
    echo "║  网站地址: https://butp.tech                                 ║"
    echo "║  代理地址: http://10.3.58.3:8080                            ║"
    echo "║  部署路径: $DEPLOY_PATH                                      ║"
    echo "║  PM2应用: $PM2_APP_NAME                                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}测试地址:${NC}"
    echo "  主页:     https://butp.tech/"
    echo "  登录:     https://butp.tech/login"
    echo "  仪表板:   https://butp.tech/dashboard"
    echo "  成绩:     https://butp.tech/grades"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo "  查看状态: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 status'"
    echo "  查看日志: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs $PM2_APP_NAME'"
    echo "  重启服务: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 restart $PM2_APP_NAME'"
    echo ""
}

# 主函数
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║            CAS认证系统构建和部署脚本                         ║"
    echo "║                      Version 1.0                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # 解析参数
    local clean_install=false
    local skip_upload=false
    local keep_package=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                clean_install=true
                shift
                ;;
            --local-only)
                skip_upload=true
                shift
                ;;
            --keep-package)
                keep_package=true
                shift
                ;;
            *)
                print_error "未知参数: $1"
                echo "用法: $0 [--clean] [--local-only] [--keep-package]"
                echo "  --clean        清理依赖重新安装"
                echo "  --local-only   只构建不上传"
                echo "  --keep-package 保留压缩包"
                exit 1
                ;;
        esac
    done
    
    # 执行部署流程
    check_dependencies
    
    if [ "$clean_install" = true ]; then
        install_dependencies --clean
    else
        install_dependencies
    fi
    
    check_environment
    build_project
    create_deployment_package
    
    local package_file=$(compress_package)
    
    if [ "$skip_upload" = false ]; then
        upload_to_server $package_file
        deploy_on_server $package_file
        verify_deployment
        show_deployment_info
    else
        print_info "跳过上传，本地构建完成"
        print_info "部署包: $package_file"
    fi
    
    if [ "$keep_package" = false ]; then
        cleanup
    else
        cleanup --keep-package
    fi
    
    print_success "构建和部署完成！"
}

# 错误处理
trap 'print_error "脚本执行失败，请检查错误信息"; exit 1' ERR

# 执行主函数
main "$@" 