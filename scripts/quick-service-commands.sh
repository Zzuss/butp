#!/bin/bash
# 快速服务管理命令脚本
# 用于本地快速管理阿里云预测服务

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

# 阿里云服务器信息（请修改为你的实际信息）
ALIYUN_SERVER="8.152.102.160"  # 你的阿里云服务器IP
ALIYUN_USER="root"             # SSH用户名
SSH_KEY=""                     # SSH密钥路径（可选）

# SSH连接函数
ssh_exec() {
    if [ -n "$SSH_KEY" ]; then
        ssh -i "$SSH_KEY" "$ALIYUN_USER@$ALIYUN_SERVER" "$1"
    else
        ssh "$ALIYUN_USER@$ALIYUN_SERVER" "$1"
    fi
}

# 检查阿里云服务器连接
check_connection() {
    log_info "检查阿里云服务器连接..."
    if ssh_exec "echo 'Connected'" &>/dev/null; then
        log_success "连接成功"
        return 0
    else
        log_error "无法连接到阿里云服务器 $ALIYUN_SERVER"
        log_info "请检查："
        echo "  1. 服务器IP是否正确"
        echo "  2. SSH密钥是否配置"
        echo "  3. 网络连接是否正常"
        return 1
    fi
}

# 查看服务状态
show_remote_status() {
    log_info "查看阿里云服务器上的预测服务状态..."
    
    ssh_exec "
        echo '=== 服务状态 ==='
        systemctl is-active prediction-api
        systemctl is-active nginx
        echo
        
        echo '=== 进程信息 ==='
        ps aux | grep -E 'gunicorn.*prediction|nginx' | grep -v grep || echo '未找到相关进程'
        echo
        
        echo '=== 端口监听 ==='
        ss -tuln | grep -E ':80|:8000' || echo '未监听相关端口'
        echo
        
        echo '=== 健康检查 ==='
        curl -f -s http://localhost/health || echo 'API健康检查失败'
    "
}

# 查看实时日志
show_remote_logs() {
    log_info "查看阿里云服务器实时日志..."
    log_warning "按 Ctrl+C 退出日志查看"
    
    ssh_exec "
        echo '=== 最近20条API服务日志 ==='
        journalctl -u prediction-api -n 20 --no-pager
        echo
        echo '=== 最近10条错误日志 ==='
        tail -10 /opt/prediction-service/logs/error.log 2>/dev/null || echo '错误日志文件不存在'
        echo
        echo '=== 实时日志 (按Ctrl+C退出) ==='
        journalctl -u prediction-api -f
    "
}

# 重启远程服务
restart_remote_service() {
    log_info "重启阿里云服务器上的预测服务..."
    
    ssh_exec "
        echo '停止服务...'
        systemctl stop prediction-api
        systemctl stop nginx
        
        echo '启动服务...'
        systemctl start prediction-api
        systemctl start nginx
        
        sleep 5
        
        echo '检查服务状态...'
        if systemctl is-active prediction-api &>/dev/null && systemctl is-active nginx &>/dev/null; then
            echo '✅ 服务重启成功'
            
            # 健康检查
            if curl -f -s http://localhost/health &>/dev/null; then
                echo '✅ API健康检查通过'
            else
                echo '❌ API健康检查失败'
            fi
        else
            echo '❌ 服务重启失败'
            systemctl status prediction-api --no-pager -l
        fi
    "
}

# 清理远程日志
clean_remote_logs() {
    log_warning "这将清理阿里云服务器上的日志文件"
    read -p "确定要继续吗? [y/N]: " confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        log_info "清理阿里云服务器日志..."
        
        ssh_exec "
            echo '备份当前日志...'
            cd /opt/prediction-service/logs
            cp error.log error.log.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo '无error.log文件'
            cp access.log access.log.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo '无access.log文件'
            
            echo '清理日志文件...'
            > error.log 2>/dev/null || echo 'error.log不存在'
            > access.log 2>/dev/null || echo 'access.log不存在'
            
            echo '清理临时文件...'
            rm -rf /opt/prediction-service/temp_predictions/* 2>/dev/null || echo '临时预测目录为空'
            rm -rf /opt/prediction-service/temp_pdf/* 2>/dev/null || echo '临时PDF目录为空'
            
            echo '✅ 日志清理完成'
        "
    else
        log_info "操作已取消"
    fi
}

# 测试API接口
test_remote_api() {
    log_info "测试阿里云服务器API接口..."
    
    echo "=== 测试健康检查接口 ==="
    curl -s "http://$ALIYUN_SERVER/health" | jq . 2>/dev/null || curl -s "http://$ALIYUN_SERVER/health"
    echo
    
    echo "=== 测试专业列表接口 ==="
    curl -s "http://$ALIYUN_SERVER/api/majors" | jq . 2>/dev/null || curl -s "http://$ALIYUN_SERVER/api/majors"
    echo
    
    log_info "API响应时间测试："
    time curl -s "http://$ALIYUN_SERVER/health" >/dev/null
}

# 上传文件到服务器
upload_to_server() {
    local_file="$1"
    remote_path="$2"
    
    if [ -z "$local_file" ] || [ -z "$remote_path" ]; then
        log_error "用法: upload_to_server <本地文件> <远程路径>"
        return 1
    fi
    
    if [ ! -f "$local_file" ]; then
        log_error "本地文件不存在: $local_file"
        return 1
    fi
    
    log_info "上传文件到阿里云服务器..."
    log_info "本地文件: $local_file"
    log_info "远程路径: $remote_path"
    
    if [ -n "$SSH_KEY" ]; then
        scp -i "$SSH_KEY" "$local_file" "$ALIYUN_USER@$ALIYUN_SERVER:$remote_path"
    else
        scp "$local_file" "$ALIYUN_USER@$ALIYUN_SERVER:$remote_path"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "文件上传成功"
    else
        log_error "文件上传失败"
    fi
}

# SSH连接到服务器
ssh_connect() {
    log_info "连接到阿里云服务器..."
    
    if [ -n "$SSH_KEY" ]; then
        ssh -i "$SSH_KEY" "$ALIYUN_USER@$ALIYUN_SERVER"
    else
        ssh "$ALIYUN_USER@$ALIYUN_SERVER"
    fi
}

# 显示帮助信息
show_help() {
    echo "阿里云预测服务管理工具"
    echo "========================="
    echo
    echo "用法: $0 <命令> [参数]"
    echo
    echo "命令:"
    echo "  status          - 查看服务状态"
    echo "  logs            - 查看实时日志"
    echo "  restart         - 重启服务"
    echo "  clean           - 清理日志文件"
    echo "  test            - 测试API接口"
    echo "  ssh             - SSH连接到服务器"
    echo "  upload <本地文件> <远程路径> - 上传文件"
    echo "  help            - 显示帮助信息"
    echo
    echo "示例:"
    echo "  $0 status                              # 查看服务状态"
    echo "  $0 logs                                # 查看实时日志"
    echo "  $0 restart                             # 重启服务"
    echo "  $0 upload ./model.pkl /opt/prediction-service/  # 上传文件"
    echo
    echo "配置:"
    echo "  服务器: $ALIYUN_SERVER"
    echo "  用户: $ALIYUN_USER"
    echo "  SSH密钥: ${SSH_KEY:-未配置}"
    echo
    echo "注意:"
    echo "  请修改脚本顶部的服务器信息为你的实际配置"
}

# 主函数
main() {
    case "$1" in
        status)
            if check_connection; then
                show_remote_status
            fi
            ;;
        logs)
            if check_connection; then
                show_remote_logs
            fi
            ;;
        restart)
            if check_connection; then
                restart_remote_service
            fi
            ;;
        clean)
            if check_connection; then
                clean_remote_logs
            fi
            ;;
        test)
            test_remote_api
            ;;
        upload)
            if check_connection; then
                upload_to_server "$2" "$3"
            fi
            ;;
        ssh)
            ssh_connect
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 检查参数
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

# 执行主函数
main "$@"

