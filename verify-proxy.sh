#!/bin/bash
echo "=== CAS代理服务器验证脚本 ==="
echo ""

# 1. 健康检查
echo "1. 检查代理服务器健康状态..."
if curl -f -s http://10.3.58.3:8080/health > /dev/null; then
    echo "✅ 代理服务器健康检查通过"
    curl -s http://10.3.58.3:8080/health | jq . 2>/dev/null || curl -s http://10.3.58.3:8080/health
else
    echo "❌ 代理服务器健康检查失败"
fi
echo ""

# 2. CAS回调测试
echo "2. 测试CAS回调转发..."
REDIRECT_URL=$(curl -s -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=test" | grep -i location | cut -d' ' -f2 | tr -d '\r')
if [[ "$REDIRECT_URL" == *"butp.tech"* ]]; then
    echo "✅ CAS回调转发正常"
    echo "   重定向到: $REDIRECT_URL"
else
    echo "❌ CAS回调转发异常: $REDIRECT_URL"
fi
echo ""

# 3. SSL证书检查
echo "3. 检查SSL证书..."
if openssl s_client -connect butp.tech:443 -servername butp.tech < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    echo "✅ SSL证书验证通过"
    CERT_DATES=$(echo | openssl s_client -connect butp.tech:443 -servername butp.tech 2>/dev/null | openssl x509 -noout -dates)
    echo "   $CERT_DATES"
else
    echo "❌ SSL证书验证失败"
fi
echo ""

# 4. 网络连通性
echo "4. 测试网络连通性..."
if curl -f -s https://butp.tech/ > /dev/null; then
    echo "✅ 网络连通性正常"
    PING_TIME=$(ping -c 1 butp.tech 2>/dev/null | grep "time=" | cut -d'=' -f4)
    if [ ! -z "$PING_TIME" ]; then
        echo "   网络延迟: $PING_TIME"
    fi
else
    echo "❌ 网络连通性异常"
fi
echo ""

# 5. PM2进程状态
echo "5. 检查PM2进程状态..."
if pm2 list | grep -q "cas-proxy.*online"; then
    echo "✅ PM2进程运行正常"
    pm2 list | grep cas-proxy
else
    echo "❌ PM2进程状态异常"
    pm2 list
fi
echo ""

echo "=== 验证完成 ==="