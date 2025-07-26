#!/bin/bash

# CAS代理服务一键部署脚本 - Ubuntu普通用户版本
# 适用于Ubuntu系统，无需root权限
# 使用方法: bash deploy-cas-proxy.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROXY_DIR="$HOME/cas-proxy"
SERVICE_NAME="cas-proxy"
PROXY_USER="bupt"
TARGET_DOMAIN="butp.tech"
PROXY_PORT="8080"
PROXY_HOST="10.3.58.3"

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

# 检测操作系统
detect_os() {
    if [ -f /etc/debian_version ]; then
        OS="ubuntu"
        print_info "检测到Ubuntu/Debian系统"
    else
        print_error "此脚本仅支持Ubuntu/Debian系统"
        exit 1
    fi
    
    print_info "当前用户: $(whoami)"
    print_info "工作目录: $HOME"
}

# 安装Node.js
install_nodejs() {
    print_info "检查Node.js安装状态..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js已安装: $NODE_VERSION"
        
        # 检查版本是否满足要求 (需要 >= 16)
        NODE_MAJOR_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -ge 16 ]; then
            print_success "Node.js版本满足要求"
            return
        else
            print_warning "Node.js版本过低，需要升级到v16或更高版本"
        fi
    fi
    
    print_info "正在安装Node.js (使用nvm)..."
    
    # 安装nvm
    if [ ! -d "$HOME/.nvm" ]; then
        print_info "安装nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
        
        # 加载nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        print_info "nvm已存在，加载环境..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # 安装Node.js LTS
    print_info "安装Node.js LTS版本..."
    nvm install --lts
    nvm use --lts
    nvm alias default lts/*
    
    # 验证安装
    if command -v node &> /dev/null; then
        print_success "Node.js安装成功: $(node -v)"
        print_success "npm版本: $(npm -v)"
    else
        print_error "Node.js安装失败"
        print_info "请手动安装Node.js (version >= 16):"
        print_info "1. 访问 https://nodejs.org/"
        print_info "2. 下载并安装LTS版本"
        print_info "3. 重新运行此脚本"
        exit 1
    fi
}

# 检查用户环境
check_user() {
    if [ "$(whoami)" != "$PROXY_USER" ]; then
        print_error "请使用用户 $PROXY_USER 运行此脚本"
        print_info "当前用户: $(whoami)"
        exit 1
    fi
    
    print_success "用户环境检查通过: $PROXY_USER"
}

# 创建项目目录
create_directory() {
    print_info "创建项目目录 $PROXY_DIR..."
    mkdir -p $PROXY_DIR
    cd $PROXY_DIR
    print_success "项目目录创建成功"
}

# 初始化Node.js项目
init_nodejs_project() {
    print_info "初始化Node.js项目..."
    
    # 创建package.json
    cat > package.json << EOF
{
  "name": "cas-proxy",
  "version": "1.0.0",
  "description": "CAS Authentication Proxy Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "author": "BuTP Team",
  "license": "MIT"
}
EOF
    
    # 安装依赖
    print_info "安装npm依赖..."
    npm install --production
    
    print_success "Node.js项目初始化完成"
}

# 创建代理服务器代码
create_server() {
    print_info "创建代理服务器代码..."
    
    cat > server.js << 'EOF'
const express = require('express');
const app = express();

// 配置
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '10.3.58.3';
const TARGET_DOMAIN = process.env.TARGET_DOMAIN || 'butp.tech';

// 中间件：请求日志
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'CAS Proxy Server',
    version: '1.0.0'
  });
});

// 根路径信息
app.get('/', (req, res) => {
  res.json({
    service: 'CAS Proxy Server',
    status: 'running',
    callback_url: `http://${HOST}:${PORT}/api/auth/cas/callback`,
    target_domain: `https://${TARGET_DOMAIN}`,
    timestamp: new Date().toISOString()
  });
});

// CAS回调代理端点
app.get('/api/auth/cas/callback', (req, res) => {
  const ticket = req.query.ticket;
  const timestamp = new Date().toISOString();
  
  if (!ticket) {
    console.error(`[${timestamp}] CAS callback missing ticket parameter`);
    return res.status(400).json({ 
      error: 'Missing ticket parameter',
      timestamp: timestamp
    });
  }
  
  console.log(`[${timestamp}] CAS callback received - Ticket: ${ticket.substring(0, 10)}...`);
  
  // 重定向到实际应用的verify端点
  const redirectUrl = `https://${TARGET_DOMAIN}/api/auth/cas/verify?ticket=${ticket}`;
  
  console.log(`[${timestamp}] Redirecting to: ${redirectUrl}`);
  
  // 302重定向
  res.redirect(302, redirectUrl);
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      '/',
      '/health',
      '/api/auth/cas/callback'
    ]
  });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Server Error:`, error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
});

// 启动服务器
const server = app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    CAS Proxy Server                          ║
╠══════════════════════════════════════════════════════════════╣
║  Status: Running                                             ║
║  Host: ${HOST}                                        ║
║  Port: ${PORT}                                                ║
║  Target: https://${TARGET_DOMAIN}                           ║
║  Callback URL: http://${HOST}:${PORT}/api/auth/cas/callback ║
║  Started: ${new Date().toISOString()}              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
const gracefulShutdown = (signal) => {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed. Goodbye!`);
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
  process.exit(1);
});
EOF
    
    print_success "代理服务器代码创建完成"
}

# 设置文件权限
set_permissions() {
    print_info "设置文件权限..."
    chmod +x $PROXY_DIR/server.js
    chmod 755 $PROXY_DIR
    print_success "文件权限设置完成"
}

# 安装和配置PM2
setup_pm2() {
    print_info "设置进程管理器PM2..."
    
    # 检查PM2是否已安装
    if ! command -v pm2 &> /dev/null; then
        print_info "安装PM2..."
        npm install -g pm2
        
        if ! command -v pm2 &> /dev/null; then
            print_error "PM2安装失败"
            exit 1
        fi
    fi
    
    print_success "PM2已安装: $(pm2 -v)"
    
    # 创建PM2配置文件
    print_info "创建PM2配置文件..."
    cat > $PROXY_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'server.js',
    cwd: '$PROXY_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: '$PROXY_PORT',
      HOST: '$PROXY_HOST',
      TARGET_DOMAIN: '$TARGET_DOMAIN'
    },
    log_file: '$PROXY_DIR/logs/combined.log',
    out_file: '$PROXY_DIR/logs/out.log',
    error_file: '$PROXY_DIR/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
    
    # 创建日志目录
    mkdir -p $PROXY_DIR/logs
    
    print_success "PM2配置完成"
}

# 检查网络配置
check_network() {
    print_info "检查网络配置..."
    
    # 检查端口是否被占用
    if netstat -ln 2>/dev/null | grep -q ":$PROXY_PORT "; then
        print_error "端口 $PROXY_PORT 已被占用"
        print_info "请检查其他服务或更改端口配置"
        exit 1
    fi
    
    print_success "端口 $PROXY_PORT 可用"
    
    # 提醒防火墙配置
    print_warning "提醒: 请确保防火墙允许端口 $PROXY_PORT 的入站连接"
    print_info "如需配置防火墙，请联系系统管理员或使用以下命令:"
    print_info "sudo ufw allow $PROXY_PORT/tcp"
    print_info "或者:"
    print_info "sudo iptables -A INPUT -p tcp --dport $PROXY_PORT -j ACCEPT"
}

# 启动服务
start_service() {
    print_info "启动CAS代理服务..."
    
    cd $PROXY_DIR
    
    # 停止可能存在的旧进程
    if pm2 list | grep -q $SERVICE_NAME; then
        print_info "停止现有进程..."
        pm2 stop $SERVICE_NAME
        pm2 delete $SERVICE_NAME
    fi
    
    # 启动新进程
    print_info "启动新进程..."
    pm2 start ecosystem.config.js
    
    # 保存PM2进程列表
    pm2 save
    
    # 设置开机自启 (生成startup脚本)
    print_info "设置开机自启..."
    pm2 startup | grep -v "sudo" | grep -v "systemctl" || true
    
    print_success "服务启动成功"
    print_info "PM2进程ID: $(pm2 list | grep $SERVICE_NAME | awk '{print $4}' || echo 'N/A')"
}

# 验证服务状态
verify_service() {
    print_info "验证服务状态..."
    
    sleep 5  # 等待服务完全启动
    
    # 检查PM2进程状态
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        print_success "PM2服务运行正常"
        
        # 显示PM2状态
        print_info "PM2进程状态:"
        pm2 list | grep -E "(App name|$SERVICE_NAME)" || pm2 list
        
        # 测试健康检查
        if command -v curl &> /dev/null; then
            print_info "测试健康检查端点..."
            sleep 2  # 额外等待时间
            if curl -f -m 10 http://$PROXY_HOST:$PROXY_PORT/health > /dev/null 2>&1; then
                print_success "健康检查通过"
            else
                print_warning "健康检查失败，请检查服务日志"
                print_info "查看PM2日志: pm2 logs $SERVICE_NAME"
            fi
        else
            print_warning "curl未安装，跳过健康检查"
            print_info "请手动访问: http://$PROXY_HOST:$PROXY_PORT/health"
        fi
    else
        print_error "服务启动失败"
        print_info "查看PM2状态: pm2 list"
        print_info "查看服务日志: pm2 logs $SERVICE_NAME"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     部署完成                                ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  服务名称: $SERVICE_NAME                                      ║"
    echo "║  服务地址: http://$PROXY_HOST:$PROXY_PORT                      ║"
    echo "║  回调地址: http://$PROXY_HOST:$PROXY_PORT/api/auth/cas/callback ║"
    echo "║  目标域名: https://$TARGET_DOMAIN                            ║"
    echo "║  项目目录: $PROXY_DIR                                        ║"
    echo "║  运行用户: $PROXY_USER                                       ║"
    echo "║  进程管理: PM2                                               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}PM2管理命令:${NC}"
    echo "  查看服务状态: pm2 status $SERVICE_NAME"
    echo "  查看服务日志: pm2 logs $SERVICE_NAME"
    echo "  重启服务:     pm2 restart $SERVICE_NAME"
    echo "  停止服务:     pm2 stop $SERVICE_NAME"
    echo "  删除服务:     pm2 delete $SERVICE_NAME"
    echo "  查看监控:     pm2 monit"
    echo ""
    echo -e "${BLUE}测试命令:${NC}"
    echo "  健康检查:     curl http://$PROXY_HOST:$PROXY_PORT/health"
    echo "  回调测试:     curl -I \"http://$PROXY_HOST:$PROXY_PORT/api/auth/cas/callback?ticket=test\""
    echo ""
    echo -e "${YELLOW}日志文件:${NC}"
    echo "  综合日志: $PROXY_DIR/logs/combined.log"
    echo "  输出日志: $PROXY_DIR/logs/out.log"
    echo "  错误日志: $PROXY_DIR/logs/error.log"
    echo ""
    echo -e "${BLUE}便捷管理脚本:${NC}"
    echo "  使用方法: ./cas-proxy-ctl.sh {start|stop|restart|status|logs|health}"
    echo "  脚本位置: $PROXY_DIR/cas-proxy-ctl.sh"
    echo "  快捷链接: $HOME/cas-proxy-ctl.sh"
    echo ""
    echo -e "${BLUE}开机自启设置:${NC}"
    echo "  生成startup脚本: pm2 startup"
    echo "  保存当前进程:   pm2 save"
    echo ""
}

# 主函数
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║            CAS代理服务一键部署脚本 - Ubuntu用户版            ║"
    echo "║                      Version 2.0                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    detect_os
    check_user
    install_nodejs
    create_directory
    init_nodejs_project
    create_server
    set_permissions
    setup_pm2
    check_network
    start_service
    verify_service
    show_deployment_info
    
    # 创建便捷管理脚本
    create_management_script
    
    print_success "CAS代理服务部署完成！"
    print_info "如需帮助，请查看上述管理命令或使用: ./cas-proxy-ctl.sh"
}

# 创建便捷管理脚本
create_management_script() {
    print_info "创建管理脚本..."
    
    cat > $PROXY_DIR/cas-proxy-ctl.sh << 'EOF'
#!/bin/bash

SERVICE_NAME="cas-proxy"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

case "$1" in
    start)
        echo "启动CAS代理服务..."
        cd "$SCRIPT_DIR"
        pm2 start ecosystem.config.js
        ;;
    stop)
        echo "停止CAS代理服务..."
        pm2 stop $SERVICE_NAME
        ;;
    restart)
        echo "重启CAS代理服务..."
        pm2 restart $SERVICE_NAME
        ;;
    status)
        echo "CAS代理服务状态:"
        pm2 status $SERVICE_NAME
        ;;
    logs)
        echo "查看CAS代理服务日志:"
        pm2 logs $SERVICE_NAME
        ;;
    health)
        echo "健康检查:"
        curl -s http://10.3.58.3:8080/health | grep -o '"status":"ok"' && echo "服务正常" || echo "服务异常"
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs|health}"
        echo ""
        echo "命令说明:"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  status  - 查看状态"
        echo "  logs    - 查看日志"
        echo "  health  - 健康检查"
        exit 1
        ;;
esac
EOF
    
    chmod +x $PROXY_DIR/cas-proxy-ctl.sh
    
    # 创建软链接到用户目录
    if [ ! -L "$HOME/cas-proxy-ctl.sh" ]; then
        ln -sf $PROXY_DIR/cas-proxy-ctl.sh $HOME/cas-proxy-ctl.sh
    fi
    
    print_success "管理脚本创建完成: $PROXY_DIR/cas-proxy-ctl.sh"
    print_success "快捷链接: $HOME/cas-proxy-ctl.sh"
}

# 执行主函数
main "$@" 