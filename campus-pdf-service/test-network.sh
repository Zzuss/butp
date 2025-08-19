#!/bin/bash

echo "🔍 测试网络连接..."

# 测试基本网络连接
echo "1. 测试DNS解析:"
nslookup butp.tech

echo -e "\n2. 测试网络连通性:"
ping -c 3 butp.tech

echo -e "\n3. 测试HTTP连接:"
curl -I https://butp.tech --connect-timeout 10

echo -e "\n4. 测试HTTPS证书:"
curl -v https://butp.tech --connect-timeout 10 2>&1 | grep -E "(SSL|TLS|certificate)"

echo -e "\n5. 检查代理设置:"
echo "HTTP_PROXY: $HTTP_PROXY"
echo "HTTPS_PROXY: $HTTPS_PROXY"
echo "http_proxy: $http_proxy"
echo "https_proxy: $https_proxy"

echo -e "\n6. 测试替代方案 - 使用IP访问:"
# 获取butp.tech的IP
BUTP_IP=$(nslookup butp.tech | grep -A 1 "Name:" | tail -1 | awk '{print $2}')
if [ ! -z "$BUTP_IP" ]; then
    echo "butp.tech IP: $BUTP_IP"
    curl -I http://$BUTP_IP --connect-timeout 10 -H "Host: butp.tech"
fi
