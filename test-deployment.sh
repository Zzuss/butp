#!/bin/bash

# CAS认证系统部署测试脚本
# 等待GitHub自动部署完成后运行此脚本

echo "🚀 CAS认证系统部署测试"
echo "=================================="
echo ""

# 等待部署完成
echo "⏳ 等待GitHub自动部署完成..."
echo "请确认以下事项："
echo "1. ✅ GitHub仓库已收到代码推送"
echo "2. ✅ 自动部署流程已触发" 
echo "3. ✅ butp.tech已更新到最新版本"
echo ""

read -p "部署是否已完成？(y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请等待部署完成后再运行此脚本"
    exit 1
fi

echo ""
echo "🔍 开始测试CAS认证系统..."
echo ""

# 1. 基础健康检查
echo "1. 🩺 基础健康检查"
echo "-------------------"
if curl -f -s https://butp.tech/health > /dev/null; then
    echo "✅ 主站健康检查通过"
    curl -s https://butp.tech/health | head -1
else
    echo "❌ 主站健康检查失败"
    echo "   请检查部署状态"
fi

# 2. 代理服务器检查
echo ""
echo "2. 🔗 代理服务器检查"
echo "-------------------"
if curl -f -s http://10.3.58.3:8080/health > /dev/null; then
    echo "✅ 代理服务器正常"
    curl -s http://10.3.58.3:8080/health | head -1
else
    echo "❌ 代理服务器异常"
    echo "   请检查代理服务器状态"
fi

# 3. CAS重定向测试
echo ""
echo "3. 🔄 CAS重定向测试"
echo "-------------------"
CAS_REDIRECT_URL=$(curl -s -I "https://butp.tech/dashboard" | grep -i location | cut -d' ' -f2 | tr -d '\r')
if [[ "$CAS_REDIRECT_URL" == *"auth.bupt.edu.cn"* ]]; then
    echo "✅ CAS重定向正常"
    echo "   重定向到: $CAS_REDIRECT_URL"
else
    echo "❌ CAS重定向异常"
    echo "   当前重定向: $CAS_REDIRECT_URL"
fi

# 4. 代理回调测试
echo ""
echo "4. ↩️  代理回调测试"
echo "-------------------"
PROXY_REDIRECT=$(curl -s -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=test" | grep -i location | cut -d' ' -f2 | tr -d '\r')
if [[ "$PROXY_REDIRECT" == *"butp.tech"* ]]; then
    echo "✅ 代理回调转发正常"
    echo "   转发到: $PROXY_REDIRECT"
else
    echo "❌ 代理回调转发异常"
    echo "   当前转发: $PROXY_REDIRECT"
fi

# 5. API端点测试
echo ""
echo "5. 🔌 API端点测试" 
echo "----------------"
api_endpoints=(
    "/api/auth/cas/login"
    "/api/auth/user"
    "/login"
)

for endpoint in "${api_endpoints[@]}"; do
    if curl -f -s -I "https://butp.tech$endpoint" > /dev/null; then
        echo "✅ $endpoint - 可访问"
    else
        echo "❌ $endpoint - 不可访问"
    fi
done

echo ""
echo "📋 测试结果汇总"
echo "================"
echo ""
echo "🧪 手动测试步骤："
echo "1. 浏览器访问: https://butp.tech/dashboard"
echo "2. 应该自动重定向到北邮CAS登录页面"
echo "3. 输入您的北邮学号和密码"
echo "4. 认证成功后应该回到系统并自动登录"
echo ""
echo "🔧 调试页面："
echo "- 认证状态: https://butp.tech/auth-status"
echo "- 登录页面: https://butp.tech/login"
echo ""
echo "📊 如果遇到问题，请检查："
echo "- GitHub Actions部署日志"
echo "- butp.tech服务器日志"
echo "- 代理服务器日志: ssh bupt@10.3.58.3 'pm2 logs cas-proxy'"
echo ""
echo "🎉 准备好测试CAS认证功能了！" 