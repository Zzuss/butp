# 🔍 代理服务器验证指南

## 1. 验证CAS回调转发配置

### 1.1 登录到代理服务器
```bash
ssh bupt@10.3.58.3
```

### 1.2 检查代理服务状态
```bash
# 检查PM2进程状态
pm2 status cas-proxy

# 查看服务健康状态
curl http://10.3.58.3:8080/health

# 应该返回：{"status":"ok","timestamp":"2024-XX-XX..."}
```

### 1.3 测试CAS回调转发
```bash
# 测试1：基本回调转发（模拟CAS返回ticket）
curl -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=ST-123456-test"

# 应该看到：
# HTTP/1.1 302 Found
# Location: https://butp.tech/api/auth/cas/verify?ticket=ST-123456-test

# 测试2：无ticket参数的错误处理
curl "http://10.3.58.3:8080/api/auth/cas/callback"

# 应该返回：{"error":"Missing ticket parameter"}
```

### 1.4 查看代理服务器日志
```bash
# 实时查看日志
pm2 logs cas-proxy

# 或查看文件日志
tail -f ~/cas-proxy/logs/combined.log
```

### 1.5 检查服务器端口监听
```bash
# 确认端口8080正在监听
netstat -tlnp | grep :8080

# 或使用ss命令
ss -tlnp | grep :8080

# 应该看到类似：
# tcp 0 0 10.3.58.3:8080 0.0.0.0:* LISTEN 12345/node
```

## 2. 验证SSL证书配置

### 2.1 检查butp.tech的SSL证书状态
```bash
# 从代理服务器测试SSL连接
openssl s_client -connect butp.tech:443 -servername butp.tech < /dev/null

# 检查证书有效期
echo | openssl s_client -connect butp.tech:443 -servername butp.tech 2>/dev/null | openssl x509 -noout -dates

# 检查证书详细信息
curl -vI https://butp.tech/

# 应该看到类似：
# * SSL connection using TLS1.3 / ECDHE-RSA-AES256-GCM-SHA384
# * Server certificate:
# *  subject: CN=butp.tech
# *  start date: ...
# *  expire date: ...
```

### 2.2 在线SSL证书检查
使用以下工具检查SSL证书：
```bash
# 使用curl检查SSL握手
curl -vso /dev/null https://butp.tech/ 2>&1 | grep -E "(SSL|certificate|TLS)"

# 检查证书链完整性
openssl s_client -connect butp.tech:443 -verify_return_error < /dev/null
```

### 2.3 验证HTTPS重定向
```bash
# 测试HTTP是否正确重定向到HTTPS
curl -I http://butp.tech/

# 应该看到：
# HTTP/1.1 301 Moved Permanently
# Location: https://butp.tech/
```

## 3. 完整流程验证

### 3.1 模拟完整CAS认证流程
```bash
# 步骤1：获取CAS登录URL（从你的应用）
curl -I "https://butp.tech/dashboard"

# 应该重定向到CAS登录页面，包含service参数：
# Location: https://auth.bupt.edu.cn/authserver/login?service=http://10.3.58.3:8080/api/auth/cas/callback

# 步骤2：验证service参数正确指向代理服务器
echo "Service URL应该是: http://10.3.58.3:8080/api/auth/cas/callback"
```

### 3.2 验证网络连通性
```bash
# 从代理服务器测试到butp.tech的连通性
curl -I https://butp.tech/api/auth/cas/verify

# 测试DNS解析
nslookup butp.tech
dig butp.tech

# 测试端口连通性
telnet butp.tech 443
```

## 4. 防火墙和网络配置验证

### 4.1 检查防火墙规则
```bash
# 检查ufw状态（如果使用）
sudo ufw status

# 检查iptables规则
sudo iptables -L -n | grep 8080

# 确保端口8080允许入站连接
```

### 4.2 检查服务器网络接口
```bash
# 查看网络接口配置
ip addr show

# 确认10.3.58.3地址已配置
ip addr show | grep "10.3.58.3"
```

## 5. 性能和可靠性验证

### 5.1 负载测试（可选）
```bash
# 使用ab进行简单压力测试
ab -n 100 -c 10 http://10.3.58.3:8080/health

# 使用curl进行批量测试
for i in {1..10}; do
    curl -w "%{http_code} %{time_total}s\n" -o /dev/null -s http://10.3.58.3:8080/health
done
```

### 5.2 监控代理服务器资源使用
```bash
# 查看CPU和内存使用
top -p $(pgrep -f "node.*server.js")

# 查看PM2进程监控
pm2 monit
```

## 6. 故障排查

### 6.1 常见问题诊断
```bash
# 问题1：代理服务器无响应
systemctl status cas-proxy  # 如果使用systemd
pm2 status cas-proxy        # 如果使用PM2

# 问题2：SSL证书问题
curl -k https://butp.tech/   # 忽略SSL错误测试连通性

# 问题3：DNS解析问题
ping butp.tech
nslookup butp.tech 8.8.8.8  # 使用Google DNS测试
```

### 6.2 日志分析
```bash
# 查看代理服务器错误日志
pm2 logs cas-proxy --err

# 查看系统日志
journalctl -u cas-proxy -f

# 查看nginx日志（如果使用nginx）
tail -f /var/log/nginx/error.log
```

## 7. 验证清单

完成以下检查项目：

### 代理服务器检查
- [ ] 代理服务在10.3.58.3:8080正常运行
- [ ] 健康检查端点返回正常
- [ ] CAS回调转发功能正常
- [ ] PM2进程管理正常
- [ ] 服务器日志记录正常

### SSL证书检查
- [ ] butp.tech SSL证书有效且未过期
- [ ] SSL证书链完整
- [ ] HTTPS访问正常
- [ ] HTTP正确重定向到HTTPS
- [ ] SSL握手成功

### 网络连通性检查
- [ ] 代理服务器可以访问butp.tech
- [ ] 防火墙规则配置正确
- [ ] DNS解析正常
- [ ] 网络延迟acceptable

### CAS集成检查
- [ ] CAS登录URL包含正确的service参数
- [ ] 代理服务器正确转发CAS回调
- [ ] 完整认证流程可以正常工作

## 8. 自动化验证脚本

创建一个自动化验证脚本：
```bash
#!/bin/bash
echo "=== CAS代理服务器验证脚本 ==="

# 1. 健康检查
echo "1. 检查代理服务器健康状态..."
if curl -f -s http://10.3.58.3:8080/health > /dev/null; then
    echo "✅ 代理服务器健康检查通过"
else
    echo "❌ 代理服务器健康检查失败"
fi

# 2. CAS回调测试
echo "2. 测试CAS回调转发..."
REDIRECT_URL=$(curl -s -I "http://10.3.58.3:8080/api/auth/cas/callback?ticket=test" | grep -i location | cut -d' ' -f2 | tr -d '\r')
if [[ "$REDIRECT_URL" == *"butp.tech"* ]]; then
    echo "✅ CAS回调转发正常"
else
    echo "❌ CAS回调转发异常: $REDIRECT_URL"
fi

# 3. SSL证书检查
echo "3. 检查SSL证书..."
if openssl s_client -connect butp.tech:443 -servername butp.tech < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    echo "✅ SSL证书验证通过"
else
    echo "❌ SSL证书验证失败"
fi

# 4. 网络连通性
echo "4. 测试网络连通性..."
if curl -f -s https://butp.tech/ > /dev/null; then
    echo "✅ 网络连通性正常"
else
    echo "❌ 网络连通性异常"
fi

echo "=== 验证完成 ==="
```

将此脚本保存为 `verify-proxy.sh` 并执行：
```bash
chmod +x verify-proxy.sh
./verify-proxy.sh
``` 