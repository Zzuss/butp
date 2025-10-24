#!/bin/bash
# 预测API服务控制脚本（原生部署）

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

# 检查是否为root或具有sudo权限
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
fi

# 服务控制函数
start_service() {
    log_info "启动预测API服务..."
    $SUDO systemctl start prediction-api
    $SUDO systemctl start nginx
    
    # 等待服务启动
    sleep 5
    
    if $SUDO systemctl is-active prediction-api &>/dev/null && $SUDO systemctl is-active nginx &>/dev/null; then
        log_success "服务启动成功"
        show_status
    else
        log_error "服务启动失败"
        show_logs
        exit 1
    fi
}

stop_service() {
    log_info "停止预测API服务..."
    $SUDO systemctl stop prediction-api
    $SUDO systemctl stop nginx
    log_success "服务已停止"
}

restart_service() {
    log_info "重启预测API服务..."
    $SUDO systemctl restart prediction-api
    $SUDO systemctl restart nginx
    
    # 等待服务启动
    sleep 5
    
    if $SUDO systemctl is-active prediction-api &>/dev/null && $SUDO systemctl is-active nginx &>/dev/null; then
        log_success "服务重启成功"
        show_status
    else
        log_error "服务重启失败"
        show_logs
        exit 1
    fi
}

show_status() {
    log_info "服务状态："
    echo "  Prediction API: $($SUDO systemctl is-active prediction-api)"
    echo "  Nginx: $($SUDO systemctl is-active nginx)"
    echo
    
    # 显示进程信息
    API_PID=$(pgrep -f "gunicorn.*prediction_api" || echo "未运行")
    NGINX_PID=$(pgrep nginx || echo "未运行")
    
    echo "进程信息："
    echo "  API进程PID: $API_PID"
    echo "  Nginx进程PID: $NGINX_PID"
    echo
    
    # 显示端口监听
    log_info "端口监听状态："
    ss -tuln | grep -E ":80|:8000" | sed 's/^/  /'
    echo
    
    # 健康检查
    log_info "健康检查："
    if curl -f -s http://localhost/health &>/dev/null; then
        log_success "  API健康检查通过"
        
        # 显示API信息
        HEALTH_INFO=$(curl -s http://localhost/health 2>/dev/null)
        if [ -n "$HEALTH_INFO" ]; then
            echo "  服务状态: $(echo "$HEALTH_INFO" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo 'N/A')"
            echo "  服务时间: $(echo "$HEALTH_INFO" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo 'N/A')"
        fi
    else
        log_error "  API健康检查失败"
    fi
    
    # 显示专业接口
    if curl -f -s http://localhost/api/majors &>/dev/null; then
        MAJORS_COUNT=$(curl -s http://localhost/api/majors 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 2>/dev/null || echo '0')
        log_success "  专业接口正常 (支持 $MAJORS_COUNT 个专业)"
    else
        log_error "  专业接口异常"
    fi
}

show_logs() {
    log_info "最近的服务日志："
    echo "=== Prediction API 日志 ==="
    $SUDO journalctl -u prediction-api --no-pager -n 20
    echo
    echo "=== Nginx 错误日志 ==="
    $SUDO tail -20 /var/log/nginx/prediction-api-error.log 2>/dev/null || echo "日志文件不存在"
}

enable_service() {
    log_info "设置服务开机自启..."
    $SUDO systemctl enable prediction-api
    $SUDO systemctl enable nginx
    log_success "服务已设置为开机自启"
}

disable_service() {
    log_info "取消服务开机自启..."
    $SUDO systemctl disable prediction-api
    # 注意：不禁用nginx，因为可能还有其他站点
    log_success "API服务已取消开机自启"
}

# 主菜单
show_menu() {
    echo "预测API服务控制菜单"
    echo "===================="
    echo "1. 启动服务"
    echo "2. 停止服务" 
    echo "3. 重启服务"
    echo "4. 查看状态"
    echo "5. 查看日志"
    echo "6. 设置开机自启"
    echo "7. 取消开机自启"
    echo "8. 退出"
    echo
    read -p "请选择操作 [1-8]: " choice
    
    case $choice in
        1) start_service ;;
        2) stop_service ;;
        3) restart_service ;;
        4) show_status ;;
        5) show_logs ;;
        6) enable_service ;;
        7) disable_service ;;
        8) exit 0 ;;
        *) log_error "无效选择，请输入1-8"; show_menu ;;
    esac
}

# 命令行参数处理
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    enable)
        enable_service
        ;;
    disable)
        disable_service
        ;;
    *)
        if [ $# -eq 0 ]; then
            show_menu
        else
            echo "使用方法: $0 {start|stop|restart|status|logs|enable|disable}"
            echo "或直接运行 $0 进入交互菜单"
            exit 1
        fi
        ;;
esac
