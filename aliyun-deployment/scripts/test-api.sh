#!/bin/bash
# API功能测试脚本

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

# 配置
API_BASE_URL="http://localhost"
TEST_RESULTS=()

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="${3:-200}"
    
    log_info "测试: $test_name"
    
    if [ "$expected_status" = "file" ]; then
        # 文件测试
        if eval "$test_command" &>/dev/null; then
            log_success "✓ $test_name"
            TEST_RESULTS+=("✓ $test_name")
        else
            log_error "✗ $test_name"
            TEST_RESULTS+=("✗ $test_name")
        fi
    else
        # HTTP测试
        local response=$(eval "$test_command" 2>/dev/null)
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" $test_command 2>/dev/null || echo "000")
        
        if [ "$status_code" = "$expected_status" ]; then
            log_success "✓ $test_name (状态码: $status_code)"
            TEST_RESULTS+=("✓ $test_name")
            
            # 显示响应内容（如果是JSON）
            if echo "$response" | jq . &>/dev/null; then
                echo "  响应: $(echo "$response" | jq -c .)"
            elif [ -n "$response" ]; then
                echo "  响应: $response"
            fi
        else
            log_error "✗ $test_name (状态码: $status_code, 期望: $expected_status)"
            TEST_RESULTS+=("✗ $test_name")
            
            if [ -n "$response" ]; then
                echo "  响应: $response"
            fi
        fi
    fi
    echo
}

# 开始测试
echo "预测API功能测试"
echo "================="
echo "测试时间: $(date)"
echo "API地址: $API_BASE_URL"
echo

# 1. 基础连接测试
run_test "网络连接" "curl -s --connect-timeout 5 $API_BASE_URL"

# 2. 健康检查
run_test "健康检查" "curl -s $API_BASE_URL/health"

# 3. 专业列表接口
run_test "获取专业列表" "curl -s $API_BASE_URL/api/majors"

# 4. 文件系统测试
run_test "模型文件存在" "[ -f /opt/prediction-service/function/Model_Params/Task3_CatBoost_Model/catboost_model.cbm ]" "file"
run_test "Python虚拟环境" "[ -f /opt/prediction-service/venv/bin/python ]" "file"
run_test "日志目录可写" "[ -w /opt/prediction-service/logs ]" "file"

# 5. 服务状态测试
log_info "测试: 服务进程状态"
API_PROCESS=$(pgrep -f "gunicorn.*prediction_api" | wc -l)
NGINX_PROCESS=$(pgrep nginx | wc -l)

if [ "$API_PROCESS" -gt 0 ]; then
    log_success "✓ API进程运行正常 ($API_PROCESS 个进程)"
    TEST_RESULTS+=("✓ API进程状态")
else
    log_error "✗ API进程未运行"
    TEST_RESULTS+=("✗ API进程状态")
fi

if [ "$NGINX_PROCESS" -gt 0 ]; then
    log_success "✓ Nginx进程运行正常 ($NGINX_PROCESS 个进程)"
    TEST_RESULTS+=("✓ Nginx进程状态")
else
    log_error "✗ Nginx进程未运行"
    TEST_RESULTS+=("✗ Nginx进程状态")
fi

echo

# 6. 端口监听测试
log_info "测试: 端口监听状态"
PORT_80=$(ss -tuln | grep ":80 " | wc -l)
PORT_8000=$(ss -tuln | grep ":8000 " | wc -l)

if [ "$PORT_80" -gt 0 ]; then
    log_success "✓ 端口80监听正常"
    TEST_RESULTS+=("✓ 端口80监听")
else
    log_error "✗ 端口80未监听"
    TEST_RESULTS+=("✗ 端口80监听")
fi

if [ "$PORT_8000" -gt 0 ]; then
    log_success "✓ 端口8000监听正常"
    TEST_RESULTS+=("✓ 端口8000监听")
else
    log_error "✗ 端口8000未监听"
    TEST_RESULTS+=("✗ 端口8000监听")
fi

echo

# 7. 错误处理测试
run_test "404错误处理" "curl -s $API_BASE_URL/nonexistent" "404"
run_test "API不存在路径" "curl -s $API_BASE_URL/api/nonexistent" "404"

# 8. CORS测试
log_info "测试: CORS头部"
CORS_HEADERS=$(curl -s -H "Origin: http://example.com" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: X-Requested-With" -X OPTIONS $API_BASE_URL/api/predict -D- | grep -i "access-control" | wc -l)

if [ "$CORS_HEADERS" -gt 0 ]; then
    log_success "✓ CORS头部配置正确"
    TEST_RESULTS+=("✓ CORS配置")
else
    log_warning "! CORS头部可能未正确配置"
    TEST_RESULTS+=("! CORS配置")
fi

echo

# 显示测试总结
echo "测试总结"
echo "========"

PASSED_TESTS=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "✓")
FAILED_TESTS=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "✗")
WARNING_TESTS=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "!")
TOTAL_TESTS=${#TEST_RESULTS[@]}

echo "总测试数: $TOTAL_TESTS"
echo "通过: $PASSED_TESTS"
echo "失败: $FAILED_TESTS"
echo "警告: $WARNING_TESTS"

echo
echo "详细结果:"
for result in "${TEST_RESULTS[@]}"; do
    echo "  $result"
done

echo
if [ "$FAILED_TESTS" -eq 0 ]; then
    log_success "所有关键测试通过！API服务运行正常。"
    
    # 显示外网访问信息
    SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || echo "获取失败")
    echo
    log_info "外网访问地址:"
    echo "  健康检查: http://$SERVER_IP/health"
    echo "  专业列表: http://$SERVER_IP/api/majors"
    echo "  预测接口: http://$SERVER_IP/api/predict"
    
    exit 0
else
    log_error "有 $FAILED_TESTS 个测试失败，请检查服务配置。"
    
    echo
    log_info "故障排除建议:"
    echo "1. 检查服务状态: sudo systemctl status prediction-api nginx"
    echo "2. 查看服务日志: sudo journalctl -u prediction-api -f"
    echo "3. 检查端口占用: ss -tuln | grep -E ':80|:8000'"
    echo "4. 重启服务: sudo systemctl restart prediction-api nginx"
    
    exit 1
fi
