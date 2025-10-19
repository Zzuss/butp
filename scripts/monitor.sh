#!/bin/bash
# 预测算法服务监控脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "${CYAN}$1${NC}"; }

# 配置
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=80
ALERT_DISK_THRESHOLD=85
LOG_FILE="logs/monitor.log"

# 参数解析
CONTINUOUS=false
INTERVAL=30
ALERT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --alert)
            ALERT=true
            shift
            ;;
        --help)
            echo "使用方法: $0 [选项]"
            echo "选项:"
            echo "  --continuous       持续监控模式"
            echo "  --interval N       监控间隔秒数 (默认: 30)"
            echo "  --alert            启用告警"
            echo "  --help             显示此帮助信息"
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 创建日志目录
mkdir -p logs

# 记录日志函数
log_to_file() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# 检查系统资源
check_system_resources() {
    log_header "===== 系统资源监控 ====="
    
    # CPU使用率
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1)
    CPU_USAGE=${CPU_USAGE%.*}  # 去除小数部分
    
    if [ "$CPU_USAGE" -gt "$ALERT_CPU_THRESHOLD" ] 2>/dev/null; then
        log_error "CPU使用率过高: ${CPU_USAGE}%"
        [ "$ALERT" = true ] && log_to_file "ALERT: High CPU usage: ${CPU_USAGE}%"
    else
        log_success "CPU使用率: ${CPU_USAGE}%"
    fi
    
    # 内存使用率
    MEMORY_INFO=$(free | grep Mem)
    TOTAL_MEM=$(echo $MEMORY_INFO | awk '{print $2}')
    USED_MEM=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_USAGE=$((USED_MEM * 100 / TOTAL_MEM))
    
    if [ "$MEMORY_USAGE" -gt "$ALERT_MEMORY_THRESHOLD" ]; then
        log_error "内存使用率过高: ${MEMORY_USAGE}%"
        [ "$ALERT" = true ] && log_to_file "ALERT: High memory usage: ${MEMORY_USAGE}%"
    else
        log_success "内存使用率: ${MEMORY_USAGE}%"
    fi
    
    echo "内存详情: $(free -h | grep Mem | awk '{print "已用: "$3", 可用: "$7}')"
    
    # 磁盘使用率
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    if [ "$DISK_USAGE" -gt "$ALERT_DISK_THRESHOLD" ]; then
        log_error "磁盘使用率过高: ${DISK_USAGE}%"
        [ "$ALERT" = true ] && log_to_file "ALERT: High disk usage: ${DISK_USAGE}%"
    else
        log_success "磁盘使用率: ${DISK_USAGE}%"
    fi
    
    echo "磁盘详情: $(df -h / | tail -1 | awk '{print "已用: "$3", 可用: "$4}')"
    
    # 系统负载
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
    log_info "系统负载:$LOAD_AVG"
}

# 检查Docker服务
check_docker_services() {
    log_header "===== Docker服务状态 ====="
    
    # Docker守护进程状态
    if systemctl is-active docker &>/dev/null; then
        log_success "Docker服务运行正常"
    else
        log_error "Docker服务异常"
        log_to_file "ALERT: Docker service is down"
    fi
    
    # 容器状态检查
    if command -v docker-compose &>/dev/null || docker compose version &>/dev/null; then
        log_info "检查容器状态..."
        
        CONTAINERS=$(docker-compose ps --format="table {{.Name}}\t{{.State}}" 2>/dev/null || echo "")
        
        if [ -n "$CONTAINERS" ]; then
            echo "$CONTAINERS"
            
            # 检查关键容器
            CRITICAL_CONTAINERS=("prediction-api" "prediction-nginx")
            for container in "${CRITICAL_CONTAINERS[@]}"; do
                STATUS=$(docker-compose ps -q "$container" 2>/dev/null | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null || echo "not_found")
                
                case $STATUS in
                    running)
                        log_success "$container: 运行中"
                        ;;
                    exited|dead)
                        log_error "$container: 已停止"
                        log_to_file "ALERT: Container $container is not running"
                        ;;
                    not_found)
                        log_warning "$container: 未找到"
                        ;;
                    *)
                        log_warning "$container: 状态异常 ($STATUS)"
                        ;;
                esac
            done
        else
            log_warning "未找到容器"
        fi
    else
        log_warning "docker-compose不可用"
    fi
}

# 检查应用健康状态
check_application_health() {
    log_header "===== 应用健康检查 ====="
    
    # API健康检查
    if curl -f -s http://localhost/health &>/dev/null; then
        log_success "API健康检查通过"
        
        # 获取健康检查详情
        HEALTH_RESPONSE=$(curl -s http://localhost/health 2>/dev/null)
        if [ -n "$HEALTH_RESPONSE" ]; then
            echo "健康状态: $(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
            echo "服务版本: $(echo "$HEALTH_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)"
        fi
    else
        log_error "API健康检查失败"
        log_to_file "ALERT: API health check failed"
    fi
    
    # 检查支持的专业接口
    if curl -f -s http://localhost/api/majors &>/dev/null; then
        MAJORS_COUNT=$(curl -s http://localhost/api/majors | grep -o '"count":[0-9]*' | cut -d':' -f2)
        log_success "专业接口正常 (支持 $MAJORS_COUNT 个专业)"
    else
        log_error "专业接口异常"
        log_to_file "ALERT: Majors API is not responding"
    fi
}

# 检查网络连接
check_network() {
    log_header "===== 网络连接检查 ====="
    
    # 检查端口监听
    PORTS=(80 443 8000)
    for port in "${PORTS[@]}"; do
        if ss -tuln | grep ":$port " &>/dev/null; then
            log_success "端口 $port 正在监听"
        else
            log_warning "端口 $port 未监听"
        fi
    done
    
    # 检查外网连接
    if ping -c 1 -W 5 8.8.8.8 &>/dev/null; then
        log_success "外网连接正常"
    else
        log_warning "外网连接异常"
    fi
}

# 检查日志错误
check_logs() {
    log_header "===== 日志错误检查 ====="
    
    # 检查API日志
    if [ -f "prediction_api.log" ]; then
        ERROR_COUNT=$(tail -1000 prediction_api.log | grep -i error | wc -l)
        if [ "$ERROR_COUNT" -gt 0 ]; then
            log_warning "API日志中发现 $ERROR_COUNT 个错误"
            echo "最新错误:"
            tail -1000 prediction_api.log | grep -i error | tail -3
        else
            log_success "API日志无错误"
        fi
    fi
    
    # 检查Nginx日志
    if [ -f "nginx/logs/error.log" ]; then
        NGINX_ERRORS=$(tail -1000 nginx/logs/error.log 2>/dev/null | grep -v "client disconnected" | wc -l)
        if [ "$NGINX_ERRORS" -gt 0 ]; then
            log_warning "Nginx错误日志中发现 $NGINX_ERRORS 个错误"
        else
            log_success "Nginx日志无错误"
        fi
    fi
}

# 检查文件权限
check_permissions() {
    log_header "===== 文件权限检查 ====="
    
    # 检查关键文件权限
    KEY_FILES=("prediction_api.py" "docker-compose.yml" "nginx/nginx.conf")
    for file in "${KEY_FILES[@]}"; do
        if [ -f "$file" ]; then
            PERMS=$(stat -c "%a" "$file")
            log_info "$file 权限: $PERMS"
        fi
    done
    
    # 检查日志目录权限
    if [ -d "logs" ]; then
        LOG_PERMS=$(stat -c "%a" "logs")
        if [ "$LOG_PERMS" = "755" ] || [ "$LOG_PERMS" = "775" ]; then
            log_success "日志目录权限正常: $LOG_PERMS"
        else
            log_warning "日志目录权限异常: $LOG_PERMS"
        fi
    fi
}

# 性能统计
show_performance_stats() {
    log_header "===== 性能统计 ====="
    
    # Docker容器资源使用
    if docker ps --format "table {{.Names}}" | grep -E "(prediction|nginx)" &>/dev/null; then
        echo "容器资源使用:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | head -5
    fi
    
    # 网络连接统计
    CONNECTIONS=$(ss -tuln | wc -l)
    log_info "网络连接数: $CONNECTIONS"
    
    # 磁盘I/O（如果iotop可用）
    if command -v iotop &>/dev/null; then
        echo "磁盘I/O前5进程:"
        iotop -ao -n 1 -q | head -5 2>/dev/null || true
    fi
}

# 生成监控报告
generate_report() {
    local report_file="logs/monitor-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "预测算法服务监控报告"
        echo "生成时间: $(date)"
        echo "========================================"
        echo
        
        check_system_resources
        echo
        check_docker_services
        echo
        check_application_health
        echo
        check_network
        echo
        check_logs
        echo
        check_permissions
        echo
        show_performance_stats
        
    } > "$report_file"
    
    log_success "监控报告已保存: $report_file"
}

# 主监控函数
run_monitoring() {
    clear
    echo "预测算法服务监控 - $(date)"
    echo "========================================"
    
    check_system_resources
    echo
    check_docker_services
    echo
    check_application_health
    echo
    check_network
    echo
    check_logs
    echo
    check_permissions
    echo
    show_performance_stats
    
    # 记录监控时间
    log_to_file "Monitoring check completed"
}

# 主逻辑
if [ "$CONTINUOUS" = true ]; then
    log_info "启动持续监控模式 (间隔: ${INTERVAL}秒, Ctrl+C退出)"
    
    while true; do
        run_monitoring
        echo
        echo "下次检查: $(date -d "+${INTERVAL} seconds")"
        echo "按 Ctrl+C 退出..."
        sleep "$INTERVAL"
        clear
    done
else
    run_monitoring
    echo
    echo "监控选项:"
    echo "  持续监控: $0 --continuous"
    echo "  生成报告: $0 --alert"
    echo "  查看帮助: $0 --help"
fi

# 如果启用了告警，生成报告
if [ "$ALERT" = true ]; then
    generate_report
fi
