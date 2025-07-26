#!/bin/bash

# CAS认证系统完整测试脚本
# 使用方法: bash test-cas-authentication.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                CAS认证系统完整测试脚本                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[测试 $TOTAL_TESTS]${NC} $test_name"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "开始CAS认证系统测试..."
echo "测试目标: https://butp.tech"
echo "代理服务器: http://10.3.58.3:8080"
echo ""

# === 基础功能测试 ===
echo "=== 第一部分：基础功能测试 ==="

run_test "主站健康检查" \
    "curl -f -s https://butp.tech/health > /dev/null" \
    "健康检查通过"

run_test "主页访问测试" \
    "curl -f -s https://butp.tech/ > /dev/null" \
    "主页访问正常"

run_test "SSL证书验证" \
    "curl -f -s https://butp.tech/health | grep -q 'ok'" \
    "SSL证书有效"

# === 代理服务器测试 ===
echo ""
echo "=== 第二部分：代理服务器测试 ==="

run_test "代理服务器健康检查" \
    "curl -f -s http://10.3.58.3:8080/health > /dev/null" \
    "代理服务器运行正常"

# 测试CAS回调转发
echo -e "${BLUE}[测试 $((TOTAL_TESTS + 1))]${NC} CAS回调转发测试"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
REDIRECT_URL=$(curl -s -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=test" | grep -i location | cut -d' ' -f2 | tr -d '\r')
if [[ "$REDIRECT_URL" == *"butp.tech"* ]]; then
    echo -e "${GREEN}✅ 通过${NC} - 重定向到: $REDIRECT_URL"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 失败${NC} - 重定向异常: $REDIRECT_URL"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# === CAS认证流程测试 ===
echo ""
echo "=== 第三部分：CAS认证流程测试 ==="

# 测试保护路由重定向
echo -e "${BLUE}[测试 $((TOTAL_TESTS + 1))]${NC} 保护路由重定向测试"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CAS_REDIRECT_URL=$(curl -s -I "https://butp.tech/dashboard" | grep -i location | cut -d' ' -f2 | tr -d '\r')
if [[ "$CAS_REDIRECT_URL" == *"auth.bupt.edu.cn"* ]]; then
    echo -e "${GREEN}✅ 通过${NC} - CAS重定向正常"
    echo "   重定向到: $CAS_REDIRECT_URL"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 失败${NC} - CAS重定向异常: $CAS_REDIRECT_URL"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 验证service参数
echo -e "${BLUE}[测试 $((TOTAL_TESTS + 1))]${NC} CAS service参数验证"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [[ "$CAS_REDIRECT_URL" == *"service=http://10.3.58.3:8080/api/auth/cas/callback"* ]]; then
    echo -e "${GREEN}✅ 通过${NC} - service参数正确"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 失败${NC} - service参数不正确"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# === API端点测试 ===
echo ""
echo "=== 第四部分：API端点测试 ==="

# 测试API端点可访问性
API_ENDPOINTS=(
    "/api/auth/cas/login"
    "/api/auth/cas/verify"
    "/api/auth/user"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    run_test "API端点 $endpoint" \
        "curl -f -s -I https://butp.tech$endpoint > /dev/null" \
        "端点可访问"
done

# === 网络连通性测试 ===
echo ""
echo "=== 第五部分：网络连通性测试 ==="

run_test "DNS解析测试" \
    "nslookup butp.tech > /dev/null 2>&1" \
    "DNS解析正常"

run_test "端口连通性测试" \
    "nc -z butp.tech 443 2>/dev/null || telnet butp.tech 443 < /dev/null 2>/dev/null" \
    "端口443可访问"

# === 测试结果汇总 ===
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                        测试结果汇总                          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  总测试数: $TOTAL_TESTS"
echo "║  通过测试: $PASSED_TESTS"
echo "║  失败测试: $FAILED_TESTS"
echo "║  成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo "╚══════════════════════════════════════════════════════════════╝"

# 根据测试结果给出建议
echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！CAS认证系统运行正常。${NC}"
    echo ""
    echo "✅ 系统可以开始使用："
    echo "   • 访问 https://butp.tech/dashboard 进行CAS认证"
    echo "   • 使用北邮学号密码登录"
    echo "   • 享受单点登录体验"
    echo ""
elif [ $FAILED_TESTS -le 2 ]; then
    echo -e "${YELLOW}⚠️  大部分测试通过，但有少量问题需要关注。${NC}"
    echo ""
    echo "建议检查失败的测试项目并进行修复。"
    echo ""
elif [ $FAILED_TESTS -le 5 ]; then
    echo -e "${YELLOW}⚠️  部分测试失败，系统可能存在配置问题。${NC}"
    echo ""
    echo "建议优先修复以下问题："
    echo "• 检查代理服务器状态"
    echo "• 验证SSL证书配置"
    echo "• 确认CAS配置正确"
    echo ""
else
    echo -e "${RED}❌ 多个关键测试失败，系统可能无法正常工作。${NC}"
    echo ""
    echo "紧急修复建议："
    echo "• 检查服务器运行状态"
    echo "• 验证网络连通性"
    echo "• 查看应用日志"
    echo "• 确认环境配置"
    echo ""
fi

# 提供调试信息
echo "🔧 调试信息："
echo "   查看应用日志: ssh bupt@butp.tech 'pm2 logs butp-app'"
echo "   检查服务状态: ssh bupt@butp.tech 'pm2 status'"
echo "   代理服务器日志: ssh bupt@10.3.58.3 'pm2 logs cas-proxy'"
echo ""

# 手动测试提示
echo "🧪 手动测试步骤："
echo "   1. 浏览器访问: https://butp.tech/dashboard"
echo "   2. 应该重定向到北邮CAS登录页面"
echo "   3. 输入学号密码进行认证"
echo "   4. 认证成功后应该能进入系统"
echo ""

exit $FAILED_TESTS 