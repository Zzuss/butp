#!/bin/bash

# 阿里云预测API监控脚本
# 用于实时监控服务状态、日志和性能

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 显示带颜色的输出
print_header() {
    echo -e "${CYAN}===============================================${NC}"
    echo -e "${CYAN} $1 ${NC}"
    echo -e "${CYAN}===============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查服务状态
check_services() {
    print_header "服务状态检查"
    
    # 检查prediction-api服务
    if systemctl is-active --quiet prediction-api; then
        print_success "预测API服务正在运行"
    else
        print_error "预测API服务未运行"
    fi
    
    # 检查nginx服务
    if systemctl is-active --quiet nginx; then
        print_success "Nginx服务正在运行"
    else
        print_error "Nginx服务未运行"
    fi
    
    # 检查开机自启
    if systemctl is-enabled --quiet prediction-api; then
        print_info "预测API服务已设置开机自启"
    else
        print_warning "预测API服务未设置开机自启"
    fi
}

# 检查端口监听
check_ports() {
    print_header "端口监听检查"
    
    # 检查8080端口 (Nginx)
    if netstat -tlnp 2>/dev/null | grep -q ":8080"; then
        print_success "端口8080正在监听 (Nginx)"
        netstat -tlnp 2>/dev/null | grep ":8080"
    else
        print_error "端口8080未监听"
    fi
    
    echo ""
    
    # 检查8001端口 (Gunicorn)
    if netstat -tlnp 2>/dev/null | grep -q ":8001"; then
        print_success "端口8001正在监听 (Gunicorn)"
        netstat -tlnp 2>/dev/null | grep ":8001"
    else
        print_error "端口8001未监听"
    fi
}

# 检查进程信息
check_processes() {
    print_header "进程信息"
    
    echo -e "${BLUE}Gunicorn进程:${NC}"
    ps aux | grep -E "(gunicorn|prediction)" | grep -v grep | while read line; do
        echo "  $line"
    done
    
    echo ""
    echo -e "${BLUE}Python进程:${NC}"
    ps aux | grep python | grep -v grep | head -5 | while read line; do
        echo "  $line"
    done
}

# 系统资源使用情况
check_resources() {
    print_header "系统资源使用"
    
    echo -e "${BLUE}内存使用:${NC}"
    free -h | grep -E "(Mem:|Swap:)"
    
    echo ""
    echo -e "${BLUE}磁盘使用:${NC}"
    df -h | grep -E "(Filesystem|/dev/)"
    
    echo ""
    echo -e "${BLUE}CPU负载:${NC}"
    uptime
}

# API健康检查
check_api_health() {
    print_header "API健康检查"
    
    # 检查本地健康接口
    local health_url="http://localhost:8080/health"
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" $health_url 2>/dev/null)
    
    if [ "$response_code" = "200" ]; then
        print_success "健康检查接口响应正常 (HTTP $response_code)"
        
        # 获取健康检查详细信息
        local health_data=$(curl -s $health_url 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo -e "${BLUE}健康检查详情:${NC}"
            echo "$health_data" | python3 -m json.tool 2>/dev/null || echo "$health_data"
        fi
    elif [ "$response_code" = "000" ]; then
        print_error "无法连接到API服务"
    else
        print_error "健康检查失败 (HTTP $response_code)"
    fi
}

# 查看最近日志
check_recent_logs() {
    print_header "最近日志 (最近5分钟)"
    
    echo -e "${BLUE}预测API服务日志:${NC}"
    if command -v journalctl >/dev/null 2>&1; then
        journalctl -u prediction-api --since "5 minutes ago" --no-pager | tail -10
    else
        print_warning "journalctl命令不可用"
    fi
    
    echo ""
    echo -e "${BLUE}最近的错误日志:${NC}"
    if command -v journalctl >/dev/null 2>&1; then
        local errors=$(journalctl -u prediction-api --since "10 minutes ago" --no-pager | grep -E "(ERROR|Exception|Traceback)" | tail -3)
        if [ -n "$errors" ]; then
            echo "$errors"
        else
            print_success "最近10分钟内无错误日志"
        fi
    fi
}

# 显示帮助信息
show_help() {
    echo "阿里云预测API监控脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -s, --status   检查服务状态"
    echo "  -p, --ports    检查端口监听"
    echo "  -r, --resources 检查系统资源"
    echo "  -l, --logs     查看最近日志"
    echo "  -a, --all      执行全部检查 (默认)"
    echo "  --live-logs    实时查看日志"
    echo "  --restart      重启服务"
    echo ""
    echo "示例:"
    echo "  $0 -a          # 执行全部检查"
    echo "  $0 --live-logs # 实时查看日志"
    echo "  $0 --restart   # 重启服务"
}

# 实时日志查看
live_logs() {
    print_header "实时日志监控 (按Ctrl+C退出)"
    echo ""
    
    if command -v journalctl >/dev/null 2>&1; then
        print_info "正在监控预测API服务日志..."
        journalctl -u prediction-api -f
    else
        print_error "journalctl命令不可用"
        exit 1
    fi
}

# 重启服务
restart_services() {
    print_header "重启服务"
    
    print_info "正在重启预测API服务..."
    if sudo systemctl restart prediction-api; then
        print_success "预测API服务重启成功"
    else
        print_error "预测API服务重启失败"
    fi
    
    print_info "正在重启Nginx服务..."
    if sudo systemctl restart nginx; then
        print_success "Nginx服务重启成功"
    else
        print_error "Nginx服务重启失败"
    fi
    
    echo ""
    print_info "等待服务启动..."
    sleep 3
    
    check_services
}

# 主函数
main() {
    case "$1" in
        -h|--help)
            show_help
            ;;
        -s|--status)
            check_services
            ;;
        -p|--ports)
            check_ports
            ;;
        -r|--resources)
            check_resources
            ;;
        -l|--logs)
            check_recent_logs
            ;;
        --live-logs)
            live_logs
            ;;
        --restart)
            restart_services
            ;;
        -a|--all|"")
            echo -e "${CYAN}阿里云预测API系统监控报告${NC}"
            echo -e "${CYAN}时间: $(date)${NC}"
            echo ""
            
            check_services
            echo ""
            
            check_ports
            echo ""
            
            check_processes
            echo ""
            
            check_resources
            echo ""
            
            check_api_health
            echo ""
            
            check_recent_logs
            
            echo ""
            print_info "监控完成！使用 $0 --help 查看更多选项"
            ;;
        *)
            print_error "未知选项: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 检查是否为root用户 (某些命令需要)
if [ "$EUID" -ne 0 ] && [[ "$1" == "--restart" ]]; then
    print_error "重启服务需要root权限，请使用 sudo $0 --restart"
    exit 1
fi

# 运行主函数
main "$@"

